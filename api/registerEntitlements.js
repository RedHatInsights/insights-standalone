const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

function registerEntitlements({ app, config }) {
  const configPath = path.join(config.backend.entitlements.assets['entitlements-config'], '/configs/bundles.yml');
  // Use { json: true } because of duplicate "MCT3815S" keys
  const serviceSKUs = yaml.load(fs.readFileSync(configPath, 'utf8'), { json: true });
  const services = serviceSKUs.map(serviceSKU => serviceSKU.name);
  const entitlements = services.reduce((acc, cur) => {
    acc[cur] = { is_entitled: true, is_trial: false };
    return acc;
  }, {});

  app.get('/api/entitlements/v1/services', (_, res) => res.json(entitlements));
}

module.exports = registerEntitlements;
