#/bin/bash

name='crc_keycloak'
command="start $name"

# If container doesn't exist yet
if ! docker ps --format '{{.Names}}' -a | grep -w $name &> /dev/null
then
  docker run \
    --name $name \
    -p 8180:8080 \
    -e KEYCLOAK_USER=admin \
    -e KEYCLOAK_PASSWORD=admin \
    -e DB_VENDOR=h2 \
    -v $(pwd)/realm_export.json:/tmp/realm_export.json \
    -d \
    jboss/keycloak \
    -Dkeycloak.migration.action=import \
    -Dkeycloak.migration.provider=singleFile \
    -Dkeycloak.migration.file=/tmp/realm_export.json \
    -Dkeycloak.migration.strategy=OVERWRITE_EXISTING
else
  docker start $name
fi

