#/bin/bash
# This should probably be rewritten in nodejs to know ports (also Windows support)
NET_NAME=crc_net
docker network create $NET_NAME

function start_service {
  local name=$1
  local -n args=$2
  # If container exists remove it so we can use new args
  if docker ps -a --format '{{.Names}}' | grep -w $name &> /dev/null
  then
    docker container rm --force $name
  fi
  echo "docker run --name $name "${args[@]}""
  docker run --name $name --network $NET_NAME --detach "${args[@]}"
}

# Keycloak is required by insights-chrome
keycloak_args=(
  -p 4001:8080
  -e KEYCLOAK_USER=admin
  -e KEYCLOAK_PASSWORD=admin
  -e DB_VENDOR=h2
  -v $(pwd)/keycloak/realm_export.json:/tmp/realm_export.json
  jboss/keycloak
  -Dkeycloak.migration.action=import 
  -Dkeycloak.migration.provider=singleFile 
  -Dkeycloak.migration.file=/tmp/realm_export.json 
  -Dkeycloak.migration.strategy=OVERWRITE_EXISTING
)
start_service crc_keycloak keycloak_args

# Postgres is required by insights-rbac
POSTGRES_DOCKER_NAME=crc_rbac_postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
postgres_args=(
  -p 4002:5432
  -e POSTGRES_DB=$POSTGRES_DB
  -e POSTGRES_USER=$POSTGRES_USER
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD
  postgres:9.6
)
start_service $POSTGRES_DOCKER_NAME postgres_args

# Redis is required by insights-rbac
REDIS_DOCKER_NAME=crc_rbac_redis
redis_args=(
  -p 4003:6379
  redis:5.0.4
)
start_service $REDIS_DOCKER_NAME redis_args

rbac_args=(
	-p 4004:8080
  -e API_PATH_PREFIX=api/rbac/
	-e DATABASE_SERVICE_NAME=POSTGRES_SQL
	-e DATABASE_ENGINE=postgresql
	-e DATABASE_NAME=postgres
	-e DATABASE_HOST=$POSTGRES_DOCKER_NAME
	-e DATABASE_USER=$POSTGRES_USER
	-e DATABASE_PASSWORD=$POSTGRES_PASSWORD
  -e REDIS_HOST=$REDIS_DOCKER_NAME
	-e DJANGO_LOG_HANDLERS=console
	-e DJANGO_READ_DOT_ENV_FILE=True
  -e DISABLE_MIGRATE=False
	-e DEVELOPMENT=True
	-e DJANGO_DEBUG=True
  -v $(pwd)/repos/rbac-config/configs/ci/permissions:/opt/app-root/src/rbac/management/role/permissions
  -v $(pwd)/repos/rbac-config/configs/ci/roles:/opt/app-root/src/rbac/management/role/definitions
  quay.io/zallen/rbac
)
start_service crc_rbac rbac_args

