# Clinic CRM Backend

Node/Express API for the clinic CRM. The backend now expects a Supabase-hosted database (managed Postgres) instead of any locally installed PostgreSQL server.

## Quick start
- Copy `.env.example` to `.env` and fill in values (use `SUPABASE_DB_URL` from Supabase > Settings > Database; local DB settings are no longer used).
- Install deps: `npm install`
- Create tables/types (idempotent): `npm run db:init`
- Run in dev: `npm run dev`
- Production start: `npm start`

## Supabase database notes
- Supabase exposes a standard Postgres connection string; the code reads it from `SUPABASE_DB_URL` (or `DATABASE_URL`).
- Deploy platforms like Vercel often inject `POSTGRES_URL` / `POSTGRES_PRISMA_URL`; the backend accepts those too.
- SSL is enforced automatically when a connection string is provided.
- The `db:init` script is safe to re-run; it will create enum types and tables if they do not exist.

## Environment overview
- `SUPABASE_DB_URL` / `DATABASE_URL` / `POSTGRES_URL` / `POSTGRES_PRISMA_URL`: database connection (one of these is required; no local DB fallback)
- `POSTGRES_HOST` / `POSTGRES_DATABASE` / `POSTGRES_PASSWORD` (+ optional `POSTGRES_USER`, `POSTGRES_PORT`): only used to assemble a connection URL if none of the URL vars are present
- `JWT_*`: authentication tokens
- `EMAIL_*`: SMTP credentials for password reset mails
- `FRONTEND_URL`: origin for links in reset emails/CORS allowlist
