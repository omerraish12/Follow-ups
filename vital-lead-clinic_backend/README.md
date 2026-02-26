# Clinic CRM Backend

Express/Node API for the clinic platform (auth, leads, automations, notifications, WhatsApp, settings, pricing). Uses PostgreSQL (Supabase-friendly) and JWT auth.

## Prerequisites
- Node 18+ (22.x works)
- npm
- PostgreSQL or Supabase connection string

## Setup
1) Copy `.env.sample` to `.env` and fill values (at minimum set one of `POSTGRES_URL`/`DATABASE_URL`/`SUPABASE_DB_URL`, `JWT_SECRET`, `FRONTEND_URL`).
2) Install deps:
```bash
npm install
```
3) Initialize DB (idempotent):
```bash
npm run db:init
```
4) Run dev server:
```bash
npm run dev
```
   Prod: `npm start`

## Environment keys (summary)
- DB: `POSTGRES_URL` / `DATABASE_URL` / `SUPABASE_DB_URL` (preferred pooled URLs). Fallback parts: `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`.
- JWT: `JWT_SECRET`, `JWT_EXPIRE`
- Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- Frontend: `FRONTEND_URL` (CORS + email links)
- WhatsApp Cloud: `META_APP_ID`, `META_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_WEBHOOK_CALLBACK`
- Pool tuning: `DB_POOL_MAX`, `DB_IDLE_TIMEOUT`, `DB_CONNECTION_TIMEOUT`, `DB_QUERY_RETRIES`

## API highlights
- Auth: `/api/auth/*` (signup/login/reset)
- Leads: `/api/leads`
- Automations & cron: `/api/automations`, scheduled via `src/utils/cronJobs.js`
- Notifications: `/api/notifications`
- Settings: `/api/settings` (clinic/profile/password/backup/integrations/exports/uploads)
- WhatsApp: `/api/whatsapp`
- Pricing: `/api/pricing`

## Scripts
- `npm run dev` – nodemon dev server
- `npm start` – production start
- `npm run db:init` – create/update schema (safe to rerun)

## Notes
- SSL is auto-enabled when using URL-based DB vars (Supabase/Neon poolers).
- Cron jobs start with the server (`src/server.js`). If deploying serverless, schedule equivalent tasks externally.
