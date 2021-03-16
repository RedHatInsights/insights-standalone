#!/usr/bin/env node

const { program } = require('commander');
const express = require('express');
const path = require('path');
const { registerEntitlements } = require('./api/registerEntitlements');
const { registerChrome } = require('./api/registerChrome');
const { checkoutRepos } = require('./api/checkout');
const { version } = require('./package.json');

const reposDir = path.join(__dirname, 'repos');

function getBackendConfigBranch(isBeta, isQA) {
  if (isQA) {
    return 'qa';
  }
  else if (isBeta) {
    return 'master';
  }
  
  return 'prod';
}

program
  .version(version)
  .description('download required static files and serve alongside mock API')
  .option(
    '-e, --env <env>',
    'Branch to clone of repos: ci-beta|ci-stable|qa-beta|qa-stable|prod-beta|prod-stable|nightly-stable',
    'ci-beta'
  )
  .option(
    '-p, --port <port>',
    'port to run static asset server + mock entitlements on',
    4000
  )
  .option(
    '--chrome <path>',
    'path to serve insights-chrome dist from',
    path.join(reposDir, 'insights-chrome-build')
  )
  .option(
    '--landing <path>',
    'path to serve landing-page-frontend dist from',
    path.join(reposDir, 'landing-page-frontend-build')
  )
  .option(
    '--service-config <path>',
    'path to serve cloud-services-config dist from',
    path.join(reposDir, 'cloud-services-config')
  )
  .option(
    '--keycloak-uri <uri>',
    'uri to inject in insights-chrome',
    'http://localhost:4001'
  )
  .option(
    '--entitlements-config <path>',
    'path to get entitlements config from for mock entitlements service',
    path.join(reposDir, 'entitlements-config')
  )
  .option(
    '--rbac-config <path>',
    'path to get entitlements config from for mock entitlements service',
    path.join(reposDir, 'rbac-config')
  )
  .action(({ env, port, chrome, landing, serviceConfig, entitlementsConfig, rbacConfig, keycloakUri }) => {
    const isBeta = env.endsWith('beta');
    const isQA = env.startsWith('qa');
    console.log('isBeta', isBeta, 'isQA', isQA);
    const frontendRepos = [chrome, landing, serviceConfig]
      .filter(p => p.startsWith(reposDir))
      .map(p => p.replace(reposDir, '').substr(1));
    checkoutRepos(frontendRepos, env, reposDir);
    // Entitlements doesn't follow normal ci-beta config scheme
    const backendRepos = [entitlementsConfig, rbacConfig]
      .filter(p => p.startsWith(reposDir))
      .map(p => p.replace(reposDir, '').substr(1));
    checkoutRepos(backendRepos, getBackendConfigBranch(isBeta, isQA), reposDir);

    const app = express();
    registerEntitlements(app, entitlementsConfig);

    const chromePrefix = `${isBeta ? '/beta' : ''}/apps/chrome`;
    registerChrome(app, chromePrefix, chrome, keycloakUri);
    // For non-JS paths of chrome
    app.use(chromePrefix, express.static(chrome));
    app.use('/', express.static(landing));
    app.use('/beta', express.static(landing));
    app.use('/config', express.static(serviceConfig));
    app.use('/beta/config', express.static(serviceConfig));

    app.listen(port, () => console.log('Listening on', port));
  })

program.parse(process.argv);

