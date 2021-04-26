const path = require('path');

// Rbac-config has master with 4 folders (ci,prod,qa,stage). Not sure what prod, qa branches are for (they're old)
function getRbacConfigFolder(env) {
  if (env.startsWith('prod')) {
    return 'prod';
  }
  else if (env.startsWith('qa')) {
    return 'qa';
  }
  
  return 'ci';
}

const rbac = ({ port, env }) => ({
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
      `-e PRINCIPAL_PROXY_SERVICE_PORT=${port}`,
      `-e PRINCIPAL_PROXY_SERVICE_PATH=/api/insights-services`,
      `-e DISABLE_MIGRATE=False`,
      // `-e DEVELOPMENT=True`,
      `-e DJANGO_DEBUG=True`,
      `-e APP_HOME=/opt/app-root/src/rbac`, // Run using django instead of gunicorn for better error messages
      assets => `-v ${path.resolve(assets['rbac-config'], 'configs', getRbacConfigFolder(env), 'permissions')}:/opt/app-root/src/rbac/management/role/permissions:ro`,
      assets => `-v ${path.resolve(assets['rbac-config'], 'configs', getRbacConfigFolder(env), 'roles')}:/opt/app-root/src/rbac/management/role/definitions:ro`,
      `quay.io/cloudservices/rbac`,
    ]
  }
});

const bop = {
  register: './api/registerBackofficeProxy',
  context: '/api/insights-services',
};

module.exports = {
  rbac,
  bop
};

