// Vercel serverless entrypoint that forwards every /api request to the
// existing Express app. We also respond to CORS preflight here to ensure
// the required Access-Control-* headers are present in production.
const app = require('../src/app');

module.exports = (req, res) => {
    // Allow list - add any frontend origins you need here or use env var
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://clinic-mwhu.vercel.app'
    ].filter(Boolean);

    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Handle preflight quickly
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    return app(req, res);
};
