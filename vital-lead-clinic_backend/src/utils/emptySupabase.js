const { supabaseAdmin } = require('../config/supabase');

const TABLES_IN_ORDER = [
    'google_tokens',
    'notifications',
    'activities',
    'executions',
    'automations',
    'messages',
    'leads',
    'users',
    'whatsapp_sessions',
    'integration_logs',
    'clinics'
];

async function wipeAll() {
    for (const table of TABLES_IN_ORDER) {
        const { error } = await supabaseAdmin.rpc('exec_sql', {
            sql: `delete from public.${table} where true returning *`,
            params: []
        });
        if (error) {
            throw new Error(`${table}: ${error.message}`);
        }
        console.log(`Cleared ${table}`);
    }
}

wipeAll()
    .then(() => {
        console.log('Supabase tables cleared successfully.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to clear Supabase tables:', err.message || err);
        process.exit(1);
    });
