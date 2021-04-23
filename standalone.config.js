const path = require('path');
const { getExposedPort } = require('./helpers');

const env = 'ci-beta';
const isProd = env.startsWith('prod');
const isQA = env.startsWith('qa');

// Entitlements-config has master (which is ci), prod, qa
function getEntitlementsBranch() {
  if (isProd) {
    return 'prod';
  }
  else if (isQA) {
    return 'qa';
  }
  
  return 'master';
}

// Rbac-config has master with 4 folders (ci,prod,qa,stage). Not sure what prod, qa branches are for (they're old)
function getRbacConfigFolder() {
  if (isProd) {
    return 'prod';
  }
  else if (isQA) {
    return 'qa';
  }
  
  return 'ci';
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
  rbac: {
    assets: {
      'rbac-config': 'https://github.com/redhatinsights/rbac-config'
    },
    redis: {
      startMessage: 'Ready to accept connections',
      args: [
        "redis:5.0.4"
      ],
    },
    postgres: {
      startMessage: 'database system is ready to accept connections',
      args: [
        `-e POSTGRES_DB=postgres`,
        `-e POSTGRES_USER=postgres`,
        `-e POSTGRES_PASSWORD=postgres`,
        "postgres:9.6",
      ],
    },
    // Last since this depends on redis + postgres
    rbac: {
      context: '/api/rbac/v1',
      dependsOn: [
        `rbac_redis`,
        `rbac_postgres`
      ],
      args: [
        `-p 4012:8080`,
        `-e API_PATH_PREFIX=api/rbac/`,
        `-e DATABASE_SERVICE_NAME=POSTGRES_SQL`,
        `-e DATABASE_ENGINE=postgresql`,
        `-e DATABASE_NAME=postgres`,
        `-e DATABASE_USER=postgres`,
        `-e DATABASE_PASSWORD=postgres`,
        `-e DATABASE_HOST=rbac_postgres`,
        `-e REDIS_HOST=rbac_redis`,
        `-e DJANGO_LOG_HANDLERS=console`,
        `-e DJANGO_READ_DOT_ENV_FILE=True`,
        `-e PRINCIPAL_PROXY_SERVICE_PROTOCOL=http`,
        `--add-host host.docker.internal:host-gateway`,
        `-e PRINCIPAL_PROXY_SERVICE_HOST=host.docker.internal`,
        `-e PRINCIPAL_PROXY_SERVICE_PORT=${module.exports.port}`,
        `-e PRINCIPAL_PROXY_SERVICE_PATH=/api/insights-services`,
        `-e DISABLE_MIGRATE=False`,
        // `-e DEVELOPMENT=True`,
        `-e DJANGO_DEBUG=True`,
        `-e APP_HOME=/opt/app-root/src/rbac`, // Run using django instead of gunicorn for better error messages
        assets => `-v ${path.resolve(assets['rbac-config'], 'configs', getRbacConfigFolder(), 'permissions')}:/opt/app-root/src/rbac/management/role/permissions:ro`,
        assets => `-v ${path.resolve(assets['rbac-config'], 'configs', getRbacConfigFolder(), 'roles')}:/opt/app-root/src/rbac/management/role/definitions:ro`,
        `quay.io/cloudservices/rbac`,
      ]
    }
  },
  entitlements: {
    assets: {
      'entitlements-config': `https://github.com/redhatinsights/entitlements-config#${getEntitlementsBranch(env)}`
    },
    register: './api/registerEntitlements',
    context: '/api/entitlements',
  },
  bop: {
    register: './api/registerBackofficeProxy',
    context: '/api/insights-services',
  },
  'cost-management': {
    context: '/api/cost-management/v1',
    target: 'https://ci.cloud.redhat.com'
  },
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
      '/*.html',
      '/*.txt'
    ],
    target: 'https://ci.cloud.redhat.com/beta'
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
  port: 4000,
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

