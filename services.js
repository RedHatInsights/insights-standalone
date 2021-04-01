const path = require('path');

const DOCKER_PREFIX = "clouddot_";
const services = ({
  rbacConfig,
  rbacConfigFolder
} = {}) => ({
  "insights_chrome": {
    keycloak: {
      args: [
        `-p 4001:8080`,
        "-e KEYCLOAK_USER=admin",
        "-e KEYCLOAK_PASSWORD=admin",
        "-e DB_VENDOR=h2",
        `-v ${path.resolve(__dirname, 'keycloak/realm_export.json')}:/tmp/realm_export.json`,
        "jboss/keycloak",
        "-Dkeycloak.migration.action=import ",
        "-Dkeycloak.migration.provider=singleFile ",
        "-Dkeycloak.migration.file=/tmp/realm_export.json ",
        "-Dkeycloak.migration.strategy=OVERWRITE_EXISTING",
      ],
    }
  },
  rbac: {
    redis: {
      startMessage: 'Ready to accept connections',
      args: [
        `-p 4010:6379`,
        "redis:5.0.4"
      ],
    },
    postgres: {
      startMessage: 'database system is ready to accept connections',
      args: [
        `-p 4011:5432`,
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
        `${DOCKER_PREFIX}rbac_redis`,
        `${DOCKER_PREFIX}rbac_postgres`
      ],
      args: [
        `-p 4012:8080`,
        `-e API_PATH_PREFIX=api/rbac/`,
        `-e DATABASE_SERVICE_NAME=POSTGRES_SQL`,
        `-e DATABASE_ENGINE=postgresql`,
        `-e DATABASE_NAME=postgres`,
        `-e DATABASE_USER=postgres`,
        `-e DATABASE_PASSWORD=postgres`,
        `-e DATABASE_HOST=${DOCKER_PREFIX}rbac_postgres`,
        `-e REDIS_HOST=${DOCKER_PREFIX}rbac_redis`,
        `-e DJANGO_LOG_HANDLERS=console`,
        `-e DJANGO_READ_DOT_ENV_FILE=True`,
        `-e PRINCIPAL_PROXY_SERVICE_PROTOCOL=http`,
        `--add-host host.docker.internal:host-gateway`,
        `-e PRINCIPAL_PROXY_SERVICE_HOST=host.docker.internal`,
        `-e PRINCIPAL_PROXY_SERVICE_PORT=4000`,
        `-e PRINCIPAL_PROXY_SERVICE_PATH=/api/insights-services`,
        `-e DISABLE_MIGRATE=False`,
        // `-e DEVELOPMENT=True`,
        `-e DJANGO_DEBUG=True`,
        `-e APP_HOME=/opt/app-root/src/rbac`, // Run using django instead of gunicorn for better error messages
        rbacConfig && rbacConfigFolder && `-v ${path.resolve(rbacConfig, 'configs', rbacConfigFolder, 'permissions')}:/opt/app-root/src/rbac/management/role/permissions:ro`,
        rbacConfig && rbacConfigFolder && `-v ${path.resolve(rbacConfig, 'configs', rbacConfigFolder, 'roles')}:/opt/app-root/src/rbac/management/role/definitions:ro`,
        `quay.io/cloudservices/rbac`,
      ]
    }
  }
});

// In: docker args array [string]
// Out: [number] | null
function getExposedPorts(args) {
  const portArg = args
    .filter(Boolean)
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

module.exports = {
  DOCKER_PREFIX,
  NET: `${DOCKER_PREFIX}net`,
  services,
  getExposedPorts
};

