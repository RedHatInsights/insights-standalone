#!/usr/bin/env node

const { program } = require('commander');
const express = require('express');
const path = require('path');
const { writeFileSync } = require('fs');
const { registerEntitlements } = require('./api/registerEntitlements');
const { registerChromeJS } = require('./api/registerChrome');
const { checkoutRepos } = require('./api/checkout');
const { version } = require('./package.json');
const { startDocker } = require('./startDocker');
const { services } = require('./services');

const defaultReposDir = path.join(__dirname, 'repos');

function getEntitlementsBranch(isProd, isQA) {
  if (isProd) {
    return 'prod';
  }
  else if (isQA) {
    return 'qa';
  }
  
  return 'master';
}

function getRbacConfigFolder(isProd, isQA) {
  if (isProd) {
    return 'prod';
  }
  else if (isQA) {
    return 'qa';
  }
  
  return 'ci';
}

program
  .version(version)
  .description('download required static files and serve alongside mock API')
  .option(
    '-d, --dir <env>',
    'Directory to look for (or clone) repos into',
    defaultReposDir
  )
  .option(
    '-e, --env <env>',
    'Files to use from cloned repos: ci-beta|ci-stable|qa-beta|qa-stable|prod-beta|prod-stable|nightly-stable',
    'ci-beta'
  )
  .option(
    '-p, --port <port>',
    'Port to run static asset server + mock entitlements on',
    4000
  )
  .option(
    '--chrome <path>',
    'Path to serve insights-chrome dist from',
    'insights-chrome-build'
  )
  .option(
    '--landing <path>',
    'Path to serve landing-page-frontend dist from',
    'landing-page-frontend-build'
  )
  .option(
    '--service-config <path>',
    'Path to serve cloud-services-config dist from',
    'cloud-services-config'
  )
  .option(
    '--keycloak-uri <uri>',
    'Uri to inject in insights-chrome',
    'http://localhost:4001'
  )
  .option(
    '--entitlements-config <path>',
    'Path to get entitlements config from for mock entitlements service',
    'entitlements-config'
  )
  .option(
    '--rbac-config <path>',
    'Path to get entitlements config from for mock entitlements service',
    'rbac-config'
  )
  .action(async ({
    dir: reposDir,
    env,
    port,
    chrome,
    landing,
    serviceConfig,
    entitlementsConfig,
    rbacConfig,
    keycloakUri
  }) => {
    const isBeta = env.endsWith('beta');
    const isQA = env.startsWith('qa');
    const isProd = env.startsWith('prod');
    console.log('isBeta', isBeta, 'isQA', isQA, 'isProd', isProd);
    // Do this first to win race against webpack-dev-server starting
    const dockerServices = services({
      rbacConfig,
      rbacConfigFolder: getRbacConfigFolder(isProd, isQA)
    });
    // Write config to file for webpack
    writeFileSync(path.join(__dirname, 'lastRun.js'), `module.exports = ${JSON.stringify({ reposDir, port, chrome }, null, 2)}`);

    // If we manage the repos it's okay to overwrite the contents
    const overwriteRepos = reposDir === defaultReposDir;
    const frontendRepos = [chrome, landing, serviceConfig];
    checkoutRepos(frontendRepos, env, reposDir, overwriteRepos);
    // Entitlements-config has master (ci), prod, qa
    checkoutRepos([entitlementsConfig], getEntitlementsBranch(isProd, isQA), reposDir, overwriteRepos);
    // Rbac-config has master with 4 folders (ci,prod,qa,stage). Not sure what prod, qa branches are for (they're old)
    checkoutRepos([rbacConfig], 'master', reposDir, overwriteRepos);

    const app = express();
    const chromePrefix = `${isBeta ? '/beta' : ''}/apps/chrome`;
    // Services
    registerChromeJS(app, chromePrefix, path.join(reposDir, chrome), keycloakUri);
    registerEntitlements(app, path.join(reposDir, entitlementsConfig));
    await startDocker(dockerServices);
    
    // Static assets
    // For non-JS paths of chrome. Must come after registerChromeJS
    app.use(chromePrefix, express.static(path.join(reposDir, chrome)));
    const staticLanding = express.static(path.join(reposDir, landing));
    app.use('/', staticLanding);
    app.use('/beta', staticLanding);
    const staticConfig = express.static(path.join(reposDir, serviceConfig));
    app.use('/config', staticConfig);
    app.use('/beta/config', staticConfig);

    app.listen(port, () => console.log('insights_standalone listening on', port));
  });

program.parse(process.argv);

