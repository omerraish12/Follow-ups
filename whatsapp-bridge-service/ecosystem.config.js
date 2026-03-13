/**
 * PM2 process file for the WhatsApp bridge.
 * Run with:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup   // to register pm2 with your init system
 */
module.exports = {
  apps: [
    {
      name: 'wa-bridge',
      cwd: '.',
      script: 'src/server.js',
      instances: 1,
      watch: false,
      max_restarts: 10,
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 5050,
        // Point this to a persistent volume. Defaults to ./data/sessions inside the repo.
        WA_WEB_SESSIONS_DIR: './data/sessions',
        // Set the rest via environment or an .env file loaded by dotenv (WA_WEB_AUTH_SECRET, DB, etc.).
      }
    }
  ]
};
