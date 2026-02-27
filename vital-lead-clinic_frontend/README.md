# Clinic CRM Frontend (FollowUps)

React/Vite application for the clinic UI (dashboard, leads, automations, notifications, pricing). Connects to the backend via the REST API described in the backend README.

## Prerequisites
- Node 18+
- npm (or yarn/pnpm if preferred)

## Setup
1. Copy `.env.sample` → `.env` and update the values (`VITE_API_URL` should point to your backend, e.g., `http://localhost:5000/api`).
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
- `VITE_API_URL` – base URL for the backend API (`http://localhost:5000/api` during development).
- `VITE_SENTRY_DSN` – Optional (uncomment if you use Sentry for errors).
- `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` – Optional PostHog config if you track events.
- `VITE_FEATURE_FLAGS` – Optional comma-separated list of feature flags for toggling UI sections.

## Scripts
- `npm run dev` – local dev server with HMR on `http://localhost:5173`
- `npm run build` – static production build (`dist/`)
- `npm run preview` – serve the production build locally

## Notes
- The frontend automatically reads the user's language preference from `localStorage`. To force a language in development, set `localStorage.setItem("language", "he")` in the console.
- Toggle the WhatsApp and notification UI by ensuring the backend has the required API keys configured (`WHATSAPP_*` in the backend `.env`).
