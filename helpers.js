const path = require('path');
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
  const defaultConfig = require('./standalone.config');
  try {
    const config = require(__dirname + './standalone.config');
    Object.assign(config, defaultConfig); 
    return config;
  }
  catch (e) {
    console.warn('No standalone config provided');
  }

  return defaultConfig;
}

module.exports = {
  NET: 'clouddot_net',
  getExposedPorts,
  getExposedPort,
  getConfig,
  isGitUrl,
  resolvePath
};

