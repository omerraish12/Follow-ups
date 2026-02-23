const app = require('./app');
const { query } = require('./config/database');
const cronJobs = require('./utils/cronJobs');
const { initializeDatabase } = require('./utils/databaseInit');

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Initialize database tables
        await initializeDatabase();

        // Start cron jobs
        cronJobs.init();
        console.log('✅ Cron jobs initialized');

        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();