const fs = require('fs');
const path = require('path');
const express = require('express');

function registerChromeJS({ app, config }) {
  // Can't just use express.static since there are some hardcoded strings for auth that need to be changed at runtime
  // These strings need to change: https://github.com/redallen/insights-chrome/commit/de14093bd20105042f48627466d4fba17825a890
  const { path: chromePath, keycloakUri } = config.frontend.chrome;
  const chromePrefix = '/apps/chrome';
  app.get(`${chromePrefix}/js/*.js`, (req, res) => {
    const fileReq = req.url.replace(chromePrefix, '');
    const diskPath = path.join(chromePath, fileReq);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).end();
    }
    let fileString = fs.readFileSync(diskPath, 'utf8');
    if (keycloakUri) {
      fileString = fileString
        .replace(/secure=true;/gm, '')
        .replace(/https:\/\/sso.qa.redhat.com/gm, keycloakUri)
        // This part gets minified weird. Let's just nuke https to http
        .replace(/https:\/\//gm, 'http://');
    }

    res.send(fileString);
  });

  // For non-JS paths of chrome. Must come after registerChromeJS
  app.use(chromePrefix, express.static(chromePath));
  // Static assets
  const staticLanding = express.static(config.frontend.landing.path);
  app.use('/', staticLanding);
  app.use('/apps/landing', staticLanding);
  const staticConfig = express.static(config.frontend.config.path);
  app.use('/config', staticConfig);

  // Mismatching chrome versions are usually the first reason insights_standalone breaks
  // const scriptTag = path.resolve(chrome, 'snippets/after.html');
  // const chromeVersion = fs.readFileSync(scriptTag, 'utf8');
  // console.log('Serving', chromeVersion);
}

module.exports = registerChromeJS;

