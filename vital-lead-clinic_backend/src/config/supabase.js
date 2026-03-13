const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || null;

const isSupabaseConfigured = Boolean(url && serviceRoleKey);

// When not configured (e.g., Vercel preview without envs), export null clients so the app can still boot
// and surface a clear error rather than hanging at import time.
const supabaseAdmin = isSupabaseConfigured
    ? createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

const supabaseAnon = isSupabaseConfigured && anonKey
    ? createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;

module.exports = {
    supabaseAdmin,
    supabaseAnon,
    isSupabaseConfigured
};
