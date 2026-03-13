# WhatsApp Bridge Service — Deployment Guide

This service keeps WhatsApp Web sessions alive (Baileys) for each clinic. Run it as a long-lived process with persistent storage and locked-down ingress.

## 1) Environment
Required (must match backend):
- `PORT=5050`
- `WA_WEB_BRIDGE_API_KEY=...` (header `x-bridge-api-key`)
- `WA_WEB_BACKEND_SHARED_SECRET=...` (header `x-bridge-secret` sent to backend)
- `WA_WEB_AUTH_SECRET=...` (32+ chars, encrypts auth state)
- `WA_BACKEND_URL=https://api.yourdomain.com`
- `POSTGRES_URL=postgres://...` (same DB the backend uses)

Optional:
- `LOG_LEVEL=info`
- `WA_WEB_BRIDGE_TIMEOUT_MS=15000`

## Migrations
- Run `npm run migrate` to create/upgrade the Postgres tables (`whatsapp_sessions`, `whatsapp_session_dirs`) using the same connection string as the service.

## 2) Persistence
- Auth state is stored in Postgres (Supabase); the service uses temporary runtime directories only. No disk volume is required for session persistence.
- Use the same Postgres as the backend so `whatsapp_sessions` stays in sync.

## 3) Systemd example
```
[Unit]
Description=WhatsApp Web Bridge
After=network.target

[Service]
WorkingDirectory=/opt/whatsapp-bridge-service
Environment=PORT=5050
Environment=WA_WEB_BRIDGE_API_KEY=change-me
Environment=WA_WEB_BACKEND_SHARED_SECRET=change-me
Environment=WA_WEB_AUTH_SECRET=super-secret-32chars
Environment=WA_BACKEND_URL=https://api.yourdomain.com
Environment=POSTGRES_URL=postgres://user:pass@db:5432/clinic
Environment=WA_WEB_SESSIONS_DIR=/var/lib/whatsapp-bridge/sessions
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=bridge

[Install]
WantedBy=multi-user.target
```

## 4) PM2 alternative
```
pm2 start src/server.js --name whatsapp-bridge \
  --env PORT=5050 \
  --env WA_WEB_BRIDGE_API_KEY=change-me \
  --env WA_WEB_BACKEND_SHARED_SECRET=change-me \
  --env WA_WEB_AUTH_SECRET=super-secret-32chars \
  --env WA_BACKEND_URL=https://api.yourdomain.com \
  --env POSTGRES_URL=postgres://user:pass@db:5432/clinic \
  --env WA_WEB_SESSIONS_DIR=/var/lib/whatsapp-bridge/sessions
pm2 save
pm2 startup
```

## 5) Network & security
- Restrict ingress to backend IPs/VPC; the service now rejects requests without `WA_WEB_BRIDGE_API_KEY`.
- Keep `WA_WEB_AUTH_SECRET` secret; it encrypts auth blobs stored in Postgres + disk.

## 6) Health & monitoring
- Health check: `GET /health` (unauthenticated) returns JSON status.
- Watch logs for disconnect/reconnect events; configure restart policy (systemd/PM2/container).
