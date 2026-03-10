# WhatsApp Web integration playbook

End-to-end steps to run the unofficial WhatsApp Web path (Baileys) that avoids Meta Business verification. Use only if you accept the Terms-of-Service risk and control the phone numbers involved.

## 1) Database
- Ensure `whatsapp_sessions` exists with the new columns by running from `vital-lead-clinic_backend`: `node src/utils/databaseInit.js`.
- Keep the same Postgres instance reachable by both the backend and the bridge.

## 2) Backend env
- `WA_WEB_BRIDGE_URL` — base URL of `whatsapp-bridge-service` (no trailing slash).
- `WA_WEB_BRIDGE_API_KEY` — optional; must match the bridge if set.
- `WA_WEB_BACKEND_SHARED_SECRET` — shared secret; bridge sends it as `x-bridge-secret`.
- Keep existing Meta envs for the legacy path; provider switching is handled per clinic.

### Backend routes already wired
- `POST /api/whatsapp/sessions/connect` → requests a QR from the bridge and stores `whatsapp_sessions`.
- `GET /api/whatsapp/sessions/status` → polls session state.
- `POST /api/whatsapp/sessions/disconnect` → logs out and clears auth.
- `POST /api/whatsapp/bridge/events` → receives inbound messages/status updates from the bridge.

## 3) Bridge service
- Located at `whatsapp-bridge-service/`.
- Key env: `PORT`, `WA_WEB_AUTH_SECRET` (encryption key), `WA_WEB_BRIDGE_API_KEY`, `WA_WEB_BACKEND_SHARED_SECRET`, `WA_BACKEND_URL`, `POSTGRES_URL`, optional `LOG_LEVEL`.
- Run with `npm install && npm start` (or `npm run dev`). Mount `data/sessions/` to persistent storage when containerized.
- Deploy on a 24/7 VM; avoid serverless so the WebSocket session stays alive.

## 4) Frontend workflow
- In the app: Settings → WhatsApp → choose **WhatsApp Web session**.
- Click **Connect** to generate a QR; scan with the clinic phone. The page polls `/sessions/status` every 10s to reflect connection state.
- Use **Disconnect** to clear the session on both bridge and backend.

## 5) Multi-clinic isolation
- Each clinic uses its own row in `whatsapp_sessions` and its own auth directory under `whatsapp-bridge-service/data/sessions/{clinicId}`.
- The bridge restores all saved sessions on boot; keep disk + DB persistent to avoid rescans.

## 6) Security & reliability
- Restrict bridge ingress to backend IPs or enforce `WA_WEB_BRIDGE_API_KEY`.
- Store `WA_WEB_AUTH_SECRET` securely; auth blobs are AES-256-GCM encrypted.
- Monitor `/health`, logs, and enable process restarts (systemd/PM2/container restart policy).
- Back up Postgres; it contains the encrypted auth snapshots.

## 7) Operational caveats
- This path is unofficial and can violate WhatsApp terms; accounts may be rate-limited or banned. Keep traffic human-like, avoid bulk sends, and be ready to reconnect if Meta invalidates the session.
