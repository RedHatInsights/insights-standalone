const { readFileSync } = require('fs');
const { resolve } = require('path');
const jws = require('jws');
const { services, getExposedPorts } = require('./services');
const lastRun = require('./lastRun');

// Transform cookie into x-rh-identity for local services
function onProxyReq(proxyReq, req) {
  const cookie = req.headers.cookie;
  const match = cookie && cookie.match(/cs_jwt=([^;]+);/);
  if (match) {
    const cs_jwt = match[1];
    const { payload } = jws.decode(cs_jwt);
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

function getProxyPaths({
  standalonePort,
  publicPath,
  webpackPort
}) {
  standalonePort = standalonePort || lastRun.port;
  const dockerServices = services();
  const res = Object.values(dockerServices)
    .map(service => Object.values(service))
    .flat()
    .map(({ context, args }) => ({
      context,
      ports: getExposedPorts(args)
    }))
    .filter(({ context, ports }) => Boolean(context) && ports.length === 1)
    .concat({
      context: [
        '/api/entitlements',
        '/api/insights-services',
        '/apps/chrome',
        '/beta/apps/chrome',
        '/config',
        '/beta/config',
        '/silent-check-sso',
        '/beta/silent-check-sso'
      ],
      ports: [standalonePort],
    })
    .map(({ context, ports }) => ({
      context,
      target: `http://localhost:${ports[0]}`,
      secure: false,
      changeOrigin: false,
      onProxyReq
    }));
  if (publicPath && webpackPort) {
    // for /beta/publicPath/fed-mods.json
    res.push({
      context: [`/beta${publicPath}`],
      target: `http://localhost:${webpackPort}`,
      pathRewrite: path => path.replace(/^\/beta/, ''),
      secure: false
    });
  }

  return res;
}

const lastRunChromePath = resolve(lastRun.reposDir, lastRun.chrome);

function getHtmlReplacements({ chromePath } = {}) {
  chromePath = chromePath || lastRunChromePath;
  return [{
    pattern: /<\s*esi:include\s+src\s*=\s*"([^"]+)"\s*\/\s*>/gm,
    replacement(_match, file) {
      file = file.split('/').pop();
      const snippet = resolve(chromePath, 'snippets', file);
      return readFileSync(snippet);
    }
  }];
}

module.exports = {
  getProxyPaths,
  getHtmlReplacements
};

