# Clinic CRM Frontend (FollowUps)

React/Vite application for the clinic UI (dashboard, leads, automations, notifications, pricing). Connects to the backend via the REST API described in the backend README.

## Prerequisites
- Node 18+
- npm (or yarn/pnpm if preferred)

## Setup
1. Copy `.env.sample` → `.env` and update the values (`VITE_API_URL` should point to your backend, e.g., `http://localhost:5000/api`. If omitted in production, the app will call `/api` on the same origin).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Build for production with `npm run build` and serve via `npm run preview` or your preferred static host.

## Environment reference
- `VITE_API_URL` - base URL for the backend API (`http://localhost:5000/api` during development; optional in production where same-origin `/api` is used by default).
- `VITE_SENTRY_DSN` - Optional (uncomment if you use Sentry for errors).
- `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` - Optional PostHog config if you track events.
- `VITE_FEATURE_FLAGS` - Optional comma-separated list of feature flags for toggling UI sections.

## Scripts
- `npm run dev` - local dev server with HMR on `http://localhost:5173`
- `npm run build` - static production build (`dist/`)
- `npm run preview` - serve the production build locally

## Notes
- The frontend automatically reads the user's language preference from `localStorage`. To force a language in development, set `localStorage.setItem("language", "he")` in the console.
- Toggle the WhatsApp and notification UI by ensuring the backend has the required API keys configured (`WHATSAPP_*` in the backend `.env`).

## Automation & WhatsApp workflow
- Automations exist to follow up patients who haven't replied or booked (for example, after two weeks send a templated reminder). Each rule uses the WhatsApp builder template, runs on a schedule, and records replies so the CRM updates lead status automatically.
- Automations exist to follow up patients who haven't replied or booked (for example, after two weeks send a templated reminder). Each rule uses the WhatsApp builder template you choose (default ones are provided but you can edit or clone them) and runs on a schedule so replies update the CRM and the next automation fires automatically.
- WhatsApp messages are sent through WhatsApp Web bridge but appear to patients as the clinic’s configured WhatsApp number (`WhatsApp Web bridge_WHATSAPP_FROM` / messaging service SID). The integration page surfaces that sender so clinics know which number is being used.



