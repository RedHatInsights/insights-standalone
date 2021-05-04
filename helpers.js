const path = require('path');
const merge = require('deepmerge');
// In: docker args array [string]
// Out: [number] | null
function getExposedPorts(args) {
  if (!Array.isArray(args)) {
    return null;
  }
  const portArg = args
    .filter(arg => typeof arg === 'string')
    .map(arg => arg.trimStart())
    .find(arg => arg.startsWith("-p"));
  if (portArg) {
    const matches = Array.from(portArg.matchAll(/(\d+):/g));
    if (matches.length > 0) {
      return matches.map(match => Number(match[1])).filter(port => !isNaN(port));
    }
  }

  return null;
}

function getExposedPort(args) {
  const ports = getExposedPorts(args);
  if (ports) {
    return ports[0];
  }

  return null;
}

function isGitUrl(pathOrUrl) {
  return /(https?:\/\/|git@)/.test(pathOrUrl);
}

function resolvePath(reposDir, pathOrUrl) {
  const split = pathOrUrl.split('/');
  return isGitUrl(pathOrUrl)
    ? path.join(reposDir, split[split.length - 1])
    : pathOrUrl;
}

function getConfig() {
  let res = require('./standalone.config');
  try {
    const config = require(process.cwd() + '/standalone.config');
    res = merge(res, config);
    // console.log('user', config);
    Object.keys(res.backend || {})
      .filter(key => typeof res.backend[key] === 'function')
      .forEach(key => res.backend[key] = res.backend[key]({ env: res.env, port: res.port }));
  }
  catch {
    console.warn('No standalone config provided');
  }

  // Don't start keycloak if not replacing keycloakUri in chrome.js
  if (res.frontend.chrome && !res.frontend.chrome.keycloakUri.includes('localhost')) {
    delete res.backend.chrome.keycloak;
  }
  // console.log('config', res);
  return res;
}

module.exports = {
  NET: 'clouddot_net',
  getExposedPorts,
  getExposedPort,
  getConfig,
  isGitUrl,
  resolvePath
};

