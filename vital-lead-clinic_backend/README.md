# Clinic CRM Backend

Express/Node API for the clinic platform (auth, leads, automations, notifications, WhatsApp, settings, pricing). Uses PostgreSQL (Supabase-friendly) plus JWT auth and configurable cron jobs.

## Prerequisites
- Node 18+ (22.x is also supported)
- npm
- PostgreSQL (Supabase/Neon pooled URLs or any direct connection string)

## Quickstart
1. Copy `.env.sample` → `.env` and fill the required values (`POSTGRES_*`, `JWT_SECRET`, `FRONTEND_URL`, WhatsApp keys once available).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize/migrate the database (safe to rerun):
   ```bash
   npm run db:init
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Production: `npm start`

## Environment reference
- **Server**: `PORT`, `NODE_ENV`
- **Database**: Preferred pooled URLs (`POSTGRES_URL`, `DATABASE_URL`, `SUPABASE_DB_URL`); fallback pieces (`POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`). Tune pools with `DB_POOL_MAX`, `DB_IDLE_TIMEOUT`, `DB_CONNECTION_TIMEOUT`, `DB_QUERY_RETRIES`.
- **JWT**: `JWT_SECRET`, `JWT_EXPIRE`
- **Email/SMTP**: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`
- **Contact notifications**: `CONTACT_NOTIFICATION_EMAIL` (where landing/contact form submissions are forwarded)
- **Frontend**: `FRONTEND_URL` (CORS + link generation)
- **WhatsApp Cloud**: `META_APP_ID`, `META_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_WEBHOOK_CALLBACK`, plus `WHATSAPP_API_VERSION`/`WHATSAPP_GRAPH_BASE`
- **Deployment**: `VERCEL` / `AWS_LAMBDA_FUNCTION_NAME` (set when running in serverless)

## API highlights
- `POST /api/auth/*` – auth, registration, password reset
- `GET/POST /api/leads` – contacts CRUD, follow-up helpers
- `GET /api/automations` – automation rules, plus cron job entrypoints (`src/utils/cronJobs.js`)
- `/api/notifications` – notification feed + actions
- `/api/settings` – clinic/profile/password/backup/integrations/uploads
- `/api/pricing` – pricing catalog used by the frontend
- `/api/whatsapp` – WhatsApp connection, message dispatch, webhooks

## WhatsApp checklist
Each clinic connects its own WhatsApp/Twilio account from the **WhatsApp integration** page in the frontend. The backend stores those per-clinic credentials in `integration_settings.whatsapp`, so you no longer need to set `TWILIO_*` values in `.env`—deployments just need a running database and the usual credentials for your database+auth providers.

### Automations & templates
- Automations follow patients who remain quiet for 2, 3, 7, or 14 days (default rules are seeded) and run on a schedule. Each rule references a WhatsApp template so Twilio can send a pre-approved message that your clinic crafted.
- Clinics can edit or clone the default templates on the frontend builder and link a template to an automation. The backend stores `template_name`, `template_language`, and optional `components`, so each automation sends the template you select rather than a hard-coded `.env` value.
- Incoming WhatsApp replies hit `/api/whatsapp/webhook`, are recorded as `messages`, mark the lead as `HOT`, create notifications/activities, and immediately trigger the automation’s follow-up template (if defined) through Twilio, all while appearing to patients as your clinic’s configured sender.

## Scripts
- `npm run dev` – dev server with nodemon
- `npm start` – production mode
- `npm run db:init` – create/update schema (no-op if already applied)

## Notes
- Cron jobs start with `src/server.js`; if you move to serverless, schedule equivalent tasks externally.
- SSL is automatically handled when using Supabase/Neon connection strings.
