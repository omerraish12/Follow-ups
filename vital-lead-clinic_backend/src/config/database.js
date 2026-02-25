const { Pool } = require('pg');
const dns = require('node:dns');
const dotenv = require('dotenv');

dotenv.config();

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Prefer IPv4 when both A/AAAA exist to avoid resolver issues on some Windows setups.
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Normalize any Supabase/Postgres URL, safely encoding passwords that contain '@' or special chars.
const normalizeConnectionString = (raw) => {
    if (!raw) return null;
    const cleaned = raw.replace(/"/g, '').replace(/^postgres:\/\//, 'postgresql://');
    try {
        // Try native parsing first
        const u = new URL(cleaned);
        if (u.password) return cleaned; // already valid
    } catch (_) {
        // fall through to manual fix
    }

    // Manual fix: find the last '@' (host separator) and URL-encode the password portion.
    const protoEnd = cleaned.indexOf('://');
    if (protoEnd === -1) return cleaned;
    const afterProto = cleaned.slice(protoEnd + 3);
    const lastAt = afterProto.lastIndexOf('@');
    if (lastAt === -1) return cleaned;

    const auth = afterProto.slice(0, lastAt);
    const hostAndDb = afterProto.slice(lastAt + 1);
    const colon = auth.indexOf(':');
    if (colon === -1) return cleaned;

    const user = auth.slice(0, colon);
    const passwordRaw = auth.slice(colon + 1);
    const passwordEncoded = encodeURIComponent(passwordRaw);

    return `${cleaned.slice(0, protoEnd + 3)}${user}:${passwordEncoded}@${hostAndDb}`;
};

// Build a Supabase connection string from the available env vars.
const buildConnFromParts = () => {
    const host = process.env.POSTGRES_HOST;
    const database = process.env.POSTGRES_DATABASE || 'postgres';
    const password = process.env.POSTGRES_PASSWORD;
    const user = process.env.POSTGRES_USER || 'postgres';
    const port = process.env.POSTGRES_PORT || 5432;

    if (host && database && password) {
        return normalizeConnectionString(`postgresql://${user}:${password}@${host}:${port}/${database}`);
    }
    return null;
};

// Prefer the pooled (POSTGRES_URL) string first to avoid IPv6/DNS issues, then fall back.
const connectionString = normalizeConnectionString(
    process.env.POSTGRES_URL ||               // Supabase pooled / session pooler
    process.env.SUPABASE_DB_URL ||            // Optional custom var
    process.env.POSTGRES_PRISMA_URL ||        // Supabase pooled/pgbouncer
    process.env.DATABASE_URL ||               // Direct connection (IPv6-only sometimes)
    process.env.POSTGRES_URL_NON_POOL         // Any other override
) || buildConnFromParts();

if (!connectionString) {
    throw new Error(
        'Missing Supabase connection string. Provide SUPABASE_DB_URL, DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_HOST/POSTGRES_DATABASE/POSTGRES_PASSWORD.'
    );
}

try {
    const parsed = new URL(connectionString);
    console.log(`Database client targeting host ${parsed.hostname}:${parsed.port || 5432} (ssl on, pool max ${parseInt(process.env.DB_POOL_MAX, 10) || 20})`);
} catch (e) {
    console.log('Database connection string set (host parse skipped)');
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: parseInt(process.env.DB_POOL_MAX, 10) || (isServerless ? 1 : 20),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 20000,
    keepAlive: true
});

console.log('Database client initialized using Supabase connection string');

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

// Test connection on startup (skip in serverless to avoid cold-start failures).
if (!isServerless) {
    pool.connect((err, client, release) => {
        if (err) {
            console.error('Error connecting to database:', err.stack);
        } else {
            console.log('Database connected successfully');
            release();
        }
    });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientConnectionError = (err) => {
    if (!err) return false;
    const message = (err.message || '').toLowerCase();
    return (
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        message.includes('connection terminated unexpectedly') ||
        message.includes('connection terminated due to connection timeout') ||
        message.includes('terminating connection due to administrator command')
    );
};

const queryWithRetry = async (text, params) => {
    const maxAttempts = parseInt(process.env.DB_QUERY_RETRIES, 10) || 2;
    let attempt = 0;
    while (true) {
        attempt += 1;
        try {
            return await pool.query(text, params);
        } catch (err) {
            if (!isTransientConnectionError(err) || attempt >= maxAttempts) {
                throw err;
            }
            const backoffMs = 250 * attempt;
            await sleep(backoffMs);
        }
    }
};

module.exports = {
    query: queryWithRetry,
    pool
};
