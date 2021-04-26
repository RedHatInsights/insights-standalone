const { readFileSync } = require('fs');
const path = require('path');
const { decode } = require('jws');
const { getConfig, resolvePath, getExposedPort } = require('./helpers');

const { frontend, port, backend, reposDir } = getConfig();

// Transform cookie into x-rh-identity for local services
function onProxyReq(proxyReq, req) {
  const cookie = req.headers.cookie;
  const match = cookie && cookie.match(/cs_jwt=([^;]+);/);
  if (match) {
    const cs_jwt = match[1];
    const { payload } = decode(cs_jwt);
    const identity = {
      identity: {
        type: "User",
        auth_type: "basic-auth",
        account_number: payload.account_number + '',
        user: {
          username: payload.username,
          email: payload.email,
          first_name: payload.first_name,
          last_name: payload.last_name,
          is_active: true,
          is_org_admin: payload.is_org_admin,
          is_internal: payload.is_internal,
          locale: 'en-US',
          user_id: payload.account_id
        },
        internal: {
          org_id: payload.org_id,
          auth_time: payload.auth_time
        }
      }
    };
    const identityB64 = Buffer.from(JSON.stringify(identity)).toString('base64');
    proxyReq.setHeader('x-rh-identity', identityB64);
  }
}

function getProxyPaths({ webpackPort }) {
  let res = [];
  // At the top level we might see a "context"
  Object.values(backend || {}).forEach(proj => {
    if (!proj) {
      return;
    }
    if (proj.context) {
      if (proj.register) {
        res.push({ context: proj.context, port });
      }
      else if (proj.target) {
        res.push({ context: proj.context, target: proj.target });
      }
    }
    // At the 2nd level we might see a "context" and "args" array
    Object.values(proj).filter(Boolean).forEach(({ context, args, target }) => {
      if (context) {
        if (!target) {
          const pport = getExposedPort(args);
          if (!pport) {
            throw Error(`Could not get port for ${JSON.stringify(context)}`);
          }
          res.push({ context, port: pport });
        }
        else {
          res.push({ context, target });
        }
      }
    });
  });
  Object.values(frontend).forEach(proj => {
    if (proj && proj.context) {
      if (proj.path) {
        res.push({ context: proj.context, port });
      }
      else if (proj.target) {
        res.push({ context: proj.context, target: proj.target });
      }
    }
  });
  res = res.map(({ context, target, port }) => ({
    context,
    target: target || `http://localhost:${port}`,
    secure: false,
    changeOrigin: true,
    onProxyReq
  }));
  if (webpackPort) {
    res.push({
      context: ['/beta'],
      target: `http://localhost:${webpackPort}`,
      pathRewrite: path => path.replace(/^\/beta/, ''),
      secure: false
    });
  }

  return res;
}

function getHtmlReplacements() {
  return [{
    pattern: /<\s*esi:include\s+src\s*=\s*"([^"]+)"\s*\/\s*>/gm,
    replacement(_match, file) {
      file = file.split('/').pop();
      const snippet = path.resolve(resolvePath(reposDir, frontend.chrome.path), 'snippets', file);
      return readFileSync(snippet);
    }
  }];
}

module.exports = {
  getProxyPaths,
  getHtmlReplacements
};

