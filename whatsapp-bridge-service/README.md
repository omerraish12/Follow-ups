# WhatsApp Bridge Service

Keeps WhatsApp Web sessions alive for each clinic so the main API does not rely on the Meta Business verification flow.

## How it fits
- Backend (`vital-lead-clinic_backend`): exposes `/api/whatsapp/bridge/events` to receive inbound message/status callbacks.
- Bridge (this service): opens WhatsApp Web sessions with Baileys, persists auth to disk, and posts normalized events back to the backend.
- Frontend: “WhatsApp Web session” option under Settings → WhatsApp; clicking **Connect** requests a QR code from the bridge.

## Environment
Set these in the bridge container/VM:
- `PORT` — default `5050`.
- `WA_WEB_AUTH_SECRET` — 32+ chars, used to encrypt Baileys auth snapshots at rest.
- `WA_WEB_BRIDGE_API_KEY` — optional header required by the bridge; must match backend env below.
- `WA_BACKEND_URL` — base URL of the backend (e.g., `https://api.yourdomain.com`).
- `WA_WEB_BACKEND_SHARED_SECRET` — sent as `x-bridge-secret` to `/api/whatsapp/bridge/events` and must match the backend.
- `WA_WEB_SESSIONS_DIR` — where Baileys auth files live; absolute path or relative to repo. Defaults to `./db/sessions`.
- Optional: `LOG_LEVEL` (default `info`), `WA_WEB_BRIDGE_TIMEOUT_MS` if your network is slow, `WA_WEB_QR_TIMEOUT_MS` (ms, default `180000`) to keep QR codes alive longer before Baileys rotates them.

Backend-side env (already wired):
- `WA_WEB_BRIDGE_URL` — URL to this service (no trailing slash).
- `WA_WEB_BRIDGE_API_KEY` — must equal the bridge value when set.
- `WA_WEB_BACKEND_SHARED_SECRET` — must equal the bridge value.

## API surface
- `POST /sessions/:clinicId/connect` — returns `{ status, qrCode, deviceJid }`.
- `GET /sessions/:clinicId` — current status/QR/device.
- `POST /sessions/:clinicId/disconnect` — logs out and clears auth.
- `POST /messages/send` — payload `{ clinicId, to, body?, mediaUrl? }`.
- `GET /bridge/state` — in-memory status for the single default bridge (QR as data URL when pending).
- `POST /bridge/start` — boot the single default bridge.
- `POST /bridge/welcome` — send a templated welcome SMS via the single bridge (`{ phone, name? }`).

## Running locally
```bash
npm install
npm run dev    # watches with nodemon
# or
npm start      # plain node
```

Auth state is persisted on disk (encrypted with `WA_WEB_AUTH_SECRET`). Keep the sessions directory on persistent storage so users don’t need to rescan.

## Deployment checklist
- Place the bridge on a 24/7 host (e.g., small VM on AWS/DO/GCP). Serverless platforms will drop the long-lived WhatsApp Web socket; use them only for dashboards, not the bridge.
- Keep disk storage persistent so users avoid rescanning the QR. If disk is wiped, auth blobs are lost and users must rescan.
- Restrict ingress: allow only the backend IPs or require `WA_WEB_BRIDGE_API_KEY`.
- Back up the sessions directory; auth blobs are AES-256-GCM encrypted with `WA_WEB_AUTH_SECRET`.
- Monitor `/health` and log stream; restart on failures (systemd, PM2, or container restart policy).

## Why session data lives on disk
Baileys writes WhatsApp Web credentials as multiple small files (`useMultiFileAuthState`). Keeping `data/sessions/` (multi-clinic) and `data/single_session/` (the default bridge) on persistent storage means devices stay paired across restarts and deploys. If those folders are wiped, WhatsApp treats the connection as a fresh device and will prompt for a new QR scan.

## Compliance note
This path uses WhatsApp Web automation (Baileys), which is unofficial. Meta’s terms prohibit automated or bulk messaging outside official APIs, and accounts can be rate-limited or banned. Use only with accounts you control and accept this risk.
