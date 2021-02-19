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

module.exports = {
	getProxyPaths
};

