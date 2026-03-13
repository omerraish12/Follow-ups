const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || null;

if (!url || !serviceRoleKey) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ROLE_KEY in the environment.');
}

const supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const supabaseAnon = anonKey
    ? createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;

module.exports = {
    supabaseAdmin,
    supabaseAnon
};
