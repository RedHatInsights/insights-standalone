const { readFileSync } = require('fs');
const { resolve } = require('path');

function getProxyPaths(standalonePort = 3101, publicPath, webpackPort) {
  return [
		{
			context: [
				'/api',
				'/apps/chrome',
				'/beta/apps/chrome',
				'/config',
				'/beta/config',
				'/silent-check-sso',
				'/beta/silent-check-sso'
			],
			target: `http://localhost:${standalonePort || 3101}`,
			secure: false,
			changeOrigin: true
		},
		{
			// for fed-mods.json
			context: [`/beta${publicPath}`],
			target: `http://localhost:${webpackPort}`,
			pathRewrite: path => path.replace(/^\/beta/, ''),
			secure: false
		}
	];
}

function getHtmlReplacements(chromePath) {
  return [{
    pattern: /<\s*esi:include\s+src\s*=\s*"([^"]+)"\s*\/\s*>/gm,
    replacement(_match, file) {
      file = file.split('/').pop();
      const snippet = resolve(chromePath, 'snippets', file);
      return readFileSync(snippet);
    }
  }];
}

module.exports = {
	getProxyPaths,
  getHtmlReplacements
};

