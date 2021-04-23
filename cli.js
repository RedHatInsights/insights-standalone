#!/usr/bin/env node
const { program } = require('commander');
const express = require('express');
const { checkoutRepo } = require('./api/checkout');
const { version } = require('./package.json');
const { startDocker } = require('./startDocker');
const { getConfig, isGitUrl } = require('./helpers');
const defaultConfig = require('./standalone.config');

program
  .version(version)
  .description('download required static files and serve alongside mock API')
  .action(async () => {
    const config = getConfig();
    const { env, reposDir, port, frontend, backend } = config;

    // Clone backend and frontend repos
    // If we manage the repos it's okay to overwrite the contents
    const overwrite = reposDir === defaultConfig.reposDir;
    Object.values(frontend).forEach(proj => {
      if (isGitUrl(proj.path)) {
        // Add typical branch if not included
        if (!proj.path.includes('#')) {
          proj.path = `${proj.path}#${env}`;
        }
        proj.path = checkoutRepo({ repo: proj.path, reposDir, overwrite });
      }
    });
    Object.values(backend).forEach(proj => 
      Object.keys(proj.assets || []).forEach(key => {
        if (isGitUrl(proj.assets[key])) {
          proj.assets[key] = checkoutRepo({ repo: proj.assets[key], reposDir, overwrite });
        }
      })
    );

    const app = express();
    app.use(express.json());

    // Services
    Object.values(backend)
      .map(v => v.register)
      .filter(Boolean)
      .forEach(v => {
        console.log('Registering', v);
        require(v)({ app, config });
      });

    await startDocker(backend);
    
    app.listen(port, () => console.log('insights_standalone listening on', port));
  });

program.parse(process.argv);

