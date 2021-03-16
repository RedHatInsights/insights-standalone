const fs = require('fs');
const path = require('path');

function registerChrome(app, chromePrefix, chrome, keycloakUri) {
  // Can't just use express.static since there are some hardcoded strings for auth that need to be changed at runtime
  // These strings need to change: https://github.com/redallen/insights-chrome/commit/de14093bd20105042f48627466d4fba17825a890
  app.get(`${chromePrefix}/js/*.js`, (req, res) => {
    const fileReq = req.url.replace(chromePrefix, '');
    const diskPath = path.join(chrome, fileReq);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).end();
    }
    const fileString = fs.readFileSync(diskPath, 'utf8')
      .replace(/secure=true;/gm, '')
      .replace(/https:\/\/sso.qa.redhat.com/gm, keycloakUri)
      // This part gets minified weird. Let's just nuke https to http
      .replace(/https:\/\//gm, 'http://')

    res.send(fileString);
  });
}

module.exports = { registerChrome };
