#!/bin/bash
KEYCLOAK_DIR=$(node -p -e "require.resolve('@redhat-cloud-services/insights-standalone/package.json').replace('package.json', 'keycloak')")
cd $KEYCLOAK_DIR && ./start_keycloak.sh
