const path = require('path');
const { getExposedPort } = require('./helpers');

const env = 'ci-beta';
const port = 4000;

// Entitlements-config has master (which is ci), prod, qa
function getEntitlementsBranch(env) {
  if (env.startsWith('prod')) {
    return 'prod';
  }
  else if (env.startsWith('qa')) {
    return 'qa';
  }
  
  return 'master';
}

const backend = {
  chrome: {
    keycloak: {
      args: [
        `-p 4001:8080`,
        "-e KEYCLOAK_USER=admin",
        "-e KEYCLOAK_PASSWORD=admin",
        "-e DB_VENDOR=h2",
        `-v ${path.join(__dirname, 'keycloak/realm_export.json')}:/tmp/realm_export.json`,
        "jboss/keycloak",
        "-Dkeycloak.migration.action=import",
        "-Dkeycloak.migration.provider=singleFile",
        "-Dkeycloak.migration.file=/tmp/realm_export.json",
        "-Dkeycloak.migration.strategy=OVERWRITE_EXISTING",
      ]
    },
    register: './api/registerChrome'
  },
  entitlements: ({ env }) => ({
    assets: {
      'entitlements-config': `https://github.com/redhatinsights/entitlements-config#${getEntitlementsBranch(env)}`
    },
    register: './api/registerEntitlements',
    context: '/api/entitlements/v1',
  }),
};

const frontend = {
  chrome: {
    path: 'https://github.com/redhatinsights/insights-chrome-build',
    context: [
      '/apps/chrome',
    ],
    keycloakUri: `http://localhost:${getExposedPort(backend.chrome.keycloak.args)}`
  },
  landing: {
    path: 'https://github.com/redhatinsights/landing-page-frontend-build',
    context: [
      '/apps/landing',
      '/index.html',
      '/maintenance.html',
      '/silent-check-sso.html',
      '/404.html'
    ],
  },
  config: {
    path: 'https://github.com/redhatinsights/cloud-services-config',
    context: [
      '/config'
    ]
  },
};

module.exports = {
  env, // Determine which branches to checkout if none specified
  reposDir: path.join(__dirname, 'repos'),
  port,
  frontend,
  backend,
};

/* ideal
 * const frontend = {
 *   chrome: {
 *     path: '~/src/crc/insights-chrome/build'
 *   }
 * };
 * 
 * const backend = {
 *   'cost-management': {
 *     context: '/api/cost-management/v1',
 *     target: 'https://ci.cloud.redhat.com'
 *   },
 * };
*/

