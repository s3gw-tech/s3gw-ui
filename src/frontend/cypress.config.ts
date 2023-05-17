const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
  },
  env: {
    accessKey: 'test',
    secretKey: 'test',
  },
});

