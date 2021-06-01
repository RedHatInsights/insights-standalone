const fs = require('fs');
const path = require('path');
const express = require('express');

const chromePrefix = '/apps/chrome';

function registerChromeJS({ app, config }) {
  // Can't just use express.static since there are some hardcoded strings for auth that need to be changed at runtime
  // These strings need to change: https://github.com/redallen/insights-chrome/commit/de14093bd20105042f48627466d4fba17825a890
  const { path: chromePath, keycloakUri } = config.frontend.chrome;
  app.get(`${chromePrefix}/js/*.js`, (req, res) => {
    const fileReq = req.url.replace(chromePrefix, '');
    const diskPath = path.join(chromePath, fileReq);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).end();
    }
    let fileString = fs.readFileSync(diskPath, 'utf8');
    fileString = fileString
      .replace(/secure=true;/gm, '')
      // This part gets minified weird. Let's just nuke https to http
      .replace(/https:\/\//gm, 'http://');
    if (keycloakUri) {
      fileString = fileString.replace(/http:\/\/sso.qa.redhat.com/gm, keycloakUri);
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
}

module.exports = registerChromeJS;

