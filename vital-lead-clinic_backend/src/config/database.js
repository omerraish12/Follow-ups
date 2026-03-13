const { supabaseAdmin, isSupabaseConfigured } = require('./supabase');

/**
 * Executes arbitrary SQL via Supabase RPC function `exec_sql`.
 * The function must be created in your Supabase project:
 *
 * create or replace function public.exec_sql(sql text, params jsonb default '[]')
 * returns setof jsonb
 * language plpgsql
 * security definer
 * set search_path = public
 * as $$
 * declare vals text[] := array(select jsonb_array_elements_text(params));
 * begin
 *   return query execute 'select to_jsonb(t.*) from (' || sql || ') t'
 *   using variadic vals;
 * end;
 * $$;
 */
const normalizeParam = (value) => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
        if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
    }
    return value;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const query = async (text, params = []) => {
    if (!isSupabaseConfigured || !supabaseAdmin) {
        throw new Error('Database unavailable: Supabase environment variables are missing.');
    }
    const normalizedParams = Array.isArray(params) ? params.map(normalizeParam) : [];
    const retries = parseInt(process.env.DB_QUERY_RETRIES || '3', 10);
    const baseDelay = 150; // ms

    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            sql: text,
            params: normalizedParams
        });

        if (!error) {
            return {
                rows: data || [],
                rowCount: Array.isArray(data) ? data.length : 0
            };
        }

        lastError = error;
        // Retry only on network-ish errors
        const msg = (error.message || '').toLowerCase();
        if (!msg.includes('fetch failed') && !msg.includes('ecconnreset') && !msg.includes('timeout')) {
            break;
        }
        if (attempt < retries - 1) {
            await sleep(baseDelay * (attempt + 1));
        }
    }

    throw lastError;
};

module.exports = {
    query,
    pool: supabaseAdmin, // kept for compatibility; not a PG pool
    supabaseAdmin
};
