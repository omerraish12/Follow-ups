const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment variables once for all modules.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(5050),
  LOG_LEVEL: z.string().default('warn'),

  WA_WEB_BRIDGE_API_KEY: z.string().min(1, 'WA_WEB_BRIDGE_API_KEY is required'),
  WA_WEB_BACKEND_SHARED_SECRET: z
    .string()
    .min(1, 'WA_WEB_BACKEND_SHARED_SECRET is required'),
  WA_WEB_AUTH_SECRET: z
    .string()
    .min(32, 'WA_WEB_AUTH_SECRET must be at least 32 characters'),
  WA_BACKEND_URL: z
    .string()
    .url('WA_BACKEND_URL must be a valid URL'),

  WA_WEB_SESSIONS_DIR: z.string().optional(),
  WA_WEB_SINGLE_AUTH_DIR: z.string().optional(),
  WA_WEB_AUTO_ACK_TEXT: z.string().optional(),
  WA_WEB_QR_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  WA_WEB_BRIDGE_TIMEOUT_MS: z.coerce.number().int().positive().optional(),

  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ROLE_KEY: z.string().min(20, 'SUPABASE_ROLE_KEY is required'),
  SUPABASE_ANON_KEY: z.string().optional()
}).passthrough();

const raw = schema.parse(process.env);

const config = Object.freeze({
  env: raw.NODE_ENV,
  port: raw.PORT,
  logLevel: raw.LOG_LEVEL,
  bridgeApiKey: raw.WA_WEB_BRIDGE_API_KEY,
  backendUrl: raw.WA_BACKEND_URL.replace(/\/$/, ''),
  backendSharedSecret: raw.WA_WEB_BACKEND_SHARED_SECRET,
  authSecret: raw.WA_WEB_AUTH_SECRET,
  sessionsDir: raw.WA_WEB_SESSIONS_DIR || null,
  singleAuthDir: raw.WA_WEB_SINGLE_AUTH_DIR || null,
  autoAckText: raw.WA_WEB_AUTO_ACK_TEXT || null,
  qrTimeoutMs: raw.WA_WEB_QR_TIMEOUT_MS || 180000,
  bridgeTimeoutMs: raw.WA_WEB_BRIDGE_TIMEOUT_MS || 15000,
  supabase: {
    url: raw.SUPABASE_URL,
    roleKey: raw.SUPABASE_ROLE_KEY,
    anonKey: raw.SUPABASE_ANON_KEY || null
  }
});

module.exports = { config };
