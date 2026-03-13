-- Base tables for WhatsApp bridge state

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  clinic_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  auth_state_encrypted TEXT,
  qr_code TEXT,
  device_jid TEXT,
  last_connected_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_session_dirs (
  clinic_id TEXT PRIMARY KEY,
  dir_uuid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_whatsapp_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_whatsapp_sessions_updated_at
    BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_whatsapp_session_dirs_updated_at'
  ) THEN
    CREATE TRIGGER trg_whatsapp_session_dirs_updated_at
    BEFORE UPDATE ON whatsapp_session_dirs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;
