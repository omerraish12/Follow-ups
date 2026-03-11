# WhatsApp Bridge Service

Keeps WhatsApp Web sessions alive for each clinic so the main API does not rely on the Meta Business verification flow.

## How it fits

- Backend (`vital-lead-clinic_backend`): exposes `/api/whatsapp/bridge/events` to receive inbound message/status callbacks and stores session rows in `whatsapp_sessions`.
- Bridge (this service): opens WhatsApp Web sessions with Baileys, persists auth to Postgres + disk, and posts normalized events back to the backend.
- Frontend: “WhatsApp Web session” option under Settings → WhatsApp; clicking **Connect** requests a QR code from the bridge.

## Environment

Set these in the bridge container/VM:

- `PORT` — default `5050`.
- `WA_WEB_AUTH_SECRET` — 32+ chars, used to encrypt Baileys auth snapshots at rest.
- `WA_WEB_BRIDGE_API_KEY` — optional header required by the bridge; must match backend env below.
- `WA_BACKEND_URL` — base URL of the backend (e.g., `https://api.yourdomain.com`).
- `WA_WEB_BACKEND_SHARED_SECRET` — sent as `x-bridge-secret` to `/api/whatsapp/bridge/events` and must match the backend.
- `WA_WEB_SESSIONS_DIR` — where Baileys auth files live; absolute path or relative to repo. Defaults to `./data/sessions`.
- `POSTGRES_URL` (or `POSTGRES_*`) — same database the backend uses so `whatsapp_sessions` stays in sync.
- Optional: `LOG_LEVEL` (default `info`), `WA_WEB_BRIDGE_TIMEOUT_MS` if your network is slow.

Backend-side env (already wired):

- `WA_WEB_BRIDGE_URL` — URL to this service (no trailing slash).
- `WA_WEB_BRIDGE_API_KEY` — must equal the bridge value when set.
- `WA_WEB_BACKEND_SHARED_SECRET` — must equal the bridge value.

## API surface

- `POST /sessions/:clinicId/connect` — returns `{ status, qrCode, deviceJid }`.
- `GET /sessions/:clinicId` — current status/QR/device.
- `POST /sessions/:clinicId/disconnect` — logs out and clears auth.
- `POST /messages/send` — payload `{ clinicId, to, body?, mediaUrl? }`.

## Running locally

```bash
npm install
npm run dev    # watches with nodemon
# or
npm start      # plain node
```

Persist `data/sessions/` on a volume if you containerize. Auto-reconnect is enabled; on start the service restores all rows that have `auth_state_encrypted`.
You can change the path with `WA_WEB_SESSIONS_DIR`; useful if the volume is mounted elsewhere.

## Deployment checklist

- Place the bridge on a 24/7 host (e.g., small VM on AWS/DO/GCP). Do **not** use serverless.
- Keep disk + Postgres storage persistent so users avoid rescanning the QR.
- Restrict ingress: allow only the backend IPs or require `WA_WEB_BRIDGE_API_KEY`.
- Back up the Postgres DB; auth blobs are AES-256-GCM encrypted with `WA_WEB_AUTH_SECRET`.
- Monitor `/health` and log stream; restart on failures (systemd, PM2, or container restart policy).

## Compliance note

This path uses WhatsApp Web automation (Baileys), which is unofficial. Meta’s terms prohibit automated or bulk messaging outside official APIs, and accounts can be rate-limited or banned. Use only with accounts you control and accept this risk.
