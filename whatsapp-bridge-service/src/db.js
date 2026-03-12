const { Pool } = require('pg');

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  null;

if (!connectionString && !process.env.POSTGRES_PASSWORD) {
  throw new Error('Bridge Postgres credentials are missing. Set POSTGRES_URL or POSTGRES_PASSWORD.');
}

const basePoolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '20000', 10),
  keepAlive: true,
  ssl: connectionString && !connectionString.includes('localhost')
    ? { rejectUnauthorized: false }
    : false
};

const pool = connectionString
  ? new Pool({
      connectionString,
      ...basePoolConfig
    })
  : new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD ? String(process.env.POSTGRES_PASSWORD) : undefined,
      ...basePoolConfig
    });

pool.on('error', (err) => {
  console.error('Unexpected PG pool error in bridge:', err.message);
});

const isTransient = (err = {}) => {
  const code = err.code;
  const msg = (err.message || '').toLowerCase();
  return (
    ['ECONNRESET', 'ENETRESET', 'ETIMEDOUT', '57P01'].includes(code) ||
    msg.includes('terminating connection') ||
    msg.includes('connection terminated unexpectedly') ||
    msg.includes('server closed the connection') ||
    msg.includes('the connection attempt failed')
  );
};

const query = async (text, params = []) => {
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      attempt += 1;
      if (!isTransient(err) || attempt >= maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
};

module.exports = {
  query,
  pool
};
