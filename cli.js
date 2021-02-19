#!/usr/bin/env node

const { program } = require('commander');
const express = require('express');
const path = require('path');
const { registerEntitlements, registerRBAC, registerCostManagement } = require('./api/api.js');
const { registerChrome } = require('./api/registerChrome');
const { checkoutRepos } = require('./api/checkout');
const { version } = require('./package.json');

const reposDir = path.join(__dirname, 'repos');


program
  .version(version)
  .description('download required static files and serve alongside mock API')
  .option(
    '-e, --env <env>',
    'Branch to clone of each repo: ci-beta|ci-stable|qa-beta|qa-stable|prod-beta|prod-stable|nightly-stable',
    'ci-beta')
  .option(
    '-p, --port <port>',
    'port to run on',
    3101
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
    '--config <path>',
    'path to serve cloud-services-config dist from',
    path.join(reposDir, 'cloud-services-config')
  )
  .action(({ env, port, chrome, landing, config }) => {
    const repos = [chrome, landing, config]
      .filter(p => p.startsWith(reposDir))
      .map(p => p.replace(reposDir, '').substr(1));
    checkoutRepos(repos, env, reposDir);

    const app = express();
    registerEntitlements(app);
    registerRBAC(app);
    registerCostManagement(app);

    const isBeta = env.endsWith('beta');
    console.log('isBeta', isBeta);
    const chromePrefix = `${isBeta ? '/beta' : ''}/apps/chrome`;
    registerChrome(app, chromePrefix, chrome);
    // For non-JS paths of chrome
    app.use(chromePrefix, express.static(chrome));
    app.use(express.static(landing));
    app.use('/beta', express.static(landing));
    app.use('/config', express.static(config));
    app.use('/beta/config', express.static(config));

    app.listen(port, () => console.log('Listening on', port));
  })

program.parse(process.argv);

