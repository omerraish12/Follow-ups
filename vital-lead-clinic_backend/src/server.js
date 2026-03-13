const app = require('./app');
const { supabaseAdmin } = require('./config/supabase');
const cronJobs = require('./utils/cronJobs');
const { initializeDatabase } = require('./utils/databaseInit');

const PORT = process.env.PORT || 5000;

async function verifySupabaseRpc() {
    try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: 'select 1 as ok', params: [] });
        if (error) {
            throw error;
        }
        console.log('✅ Supabase exec_sql RPC available');
    } catch (err) {
        console.error(
            '❌ Supabase exec_sql RPC missing or not cached. Please run supabase/001_exec_sql.sql in your Supabase project and NOTIFY pgrst to reload schema.',
            err.message || err
        );
        process.exit(1);
    }
}

async function startServer() {
    try {
        // Verify Supabase RPC exists
        await verifySupabaseRpc();

        // Initialize database tables (skip when using Supabase RPC-only mode)
        if (!process.env.SUPABASE_URL) {
            await initializeDatabase();
        } else {
            console.log('Skipping local databaseInit; manage schema in Supabase SQL.');
        }

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
