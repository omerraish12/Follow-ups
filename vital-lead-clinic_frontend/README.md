# Clinic CRM Frontend

Vite + React + TypeScript + Tailwind UI for the clinic platform (dashboard, leads, automations, WhatsApp integration, settings, pricing).

## Prerequisites
- Node 18+ (22.x works)
- npm

## Setup
1) Copy `.env.sample` to `.env.local` (or `.env`) and set:
```
VITE_API_URL=http://localhost:5000/api
```
2) Install deps:
```bash
npm install
```
3) Run dev server:
```bash
npm run dev
```
4) Build:
```bash
npm run build
```
Preview build: `npm run preview`

## Environment
- `VITE_API_URL` – backend base URL (include `/api`)
- Optional analytics (if used): `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`

## Useful paths
- Services: `src/services/*` (API clients)
- Contexts: `src/contexts/*` (auth, language)
- Pages: `src/pages/*`
- UI components: `src/components/*`

## Scripts (package.json)
- `dev` – start Vite dev server
- `build` – production build
- `preview` – serve build locally
- `test` / `lint` – if enabled

## Linking to backend
Set `VITE_API_URL` to your running backend (e.g., `http://localhost:5000/api` for local dev or your deployed API URL in production).
