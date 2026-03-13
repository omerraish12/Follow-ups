// Vercel serverless entrypoint wrapping the existing Express app.
const serverless = require('serverless-http');
const app = require('../src/app');

module.exports = serverless(app);
