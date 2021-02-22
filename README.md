# insights-standalone

A minimal standalone backend for cloud.redhat.com useful for frontend developers working offline. Includes a script for starting keycloak with a user `user / user`, a mocked RBAC/entitlements insights API that includes required static assets, and a helper to create Webpack proxy config for [webpack-dev-server.](https://webpack.js.org/configuration/dev-server/#devserverproxy)

## Usage

This package is intended to be installed as an NPM dependency:

```sh
npm install --save-dev @redhat-cloud-services/insights-standalone
```

```json
package.json

"scripts": {
  "start:backend": "insights-standalone-keycloak && insights-standalone",
  "start:standalone": "npm-run-all --parallel start:backend start"
}
```

You'll need to modify your webpack config as well:
```js
webpack.config.js

const { getProxyPaths, getHtmlReplacements } = require('@redhat-cloud-services/insights-standalone');

// If using ESI tags
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin');
const chromePath = require.resolve('@redhat-cloud-services/insights-standalone/package.json').replace('package.json', 'repos/insights-chrome-build');
plugins: [
  new HtmlReplaceWebpackPlugin(getHtmlReplacements(chromePath))
]

// To proxy requests to backend
devServer: {
  proxy: getProxyPaths(webpackPublicPath, webpackPort)
}
```

Note: The `insights-standalone` command will clone ci-beta branches of Git repos under your node_modules folder. You can control this behavior:
```sh
Usage: insights-standalone [options]

download required static files and serve alongside mock API

Options:
  -e, --env <env>    Branch to clone of each repo:
                     ci-beta|ci-stable|qa-beta|qa-stable|prod-beta|prod-stable|nightly-stable (default:
                     "ci-beta")
  -p, --port <port>  port to run on (default: 3101)
  --chrome <path>    path to serve insights-chrome dist from (default:
                     "insights-standalone/repos/insights-chrome-build")
  --landing <path>   path to serve landing-page-frontend dist from (default:
                     "insights-standalone/repos/landing-page-frontend-build")
  --config <path>    path to serve cloud-services-config dist from (default:
                     "insights-standalone/repos/cloud-services-config")
  -h, --help         display help for command
```

## Development / Local usage

This package can also be cloned locally and then run. Commands of interest are `npm start:api` and `npm start:keycloak`.

## Dependencies

This project clones the following repos that contain static assets required for cloud.redhat.com SPAs into the `repos` folder:
  - [insights-chrome-build](https://github.com/RedHatInsights/insights-chrome-build)
    - Contains top/side nav and app loading
  - [landing-page-frontend-build](https://github.com/RedHatInsights/landing-page-frontend-build)
    - Contains silent-check-sso.html needed for user auth
  - [cloud-services-config](https://github.com/RedHatInsights/cloud-services-config)
    - Contains `main.yml` needed by chrome for enumerating paths and apps



