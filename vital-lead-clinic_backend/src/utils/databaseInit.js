const { query } = require('../config/database');

async function initializeDatabase() {
    try {
        console.log('Creating database tables...');

        // Create enum types
        await query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'STAFF');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = 'user_role'::regtype
            AND enumlabel = 'SUPER_ADMIN'
        ) THEN
          ALTER TYPE user_role ADD VALUE 'SUPER_ADMIN';
        END IF;
      END $$;
    `);

        await query(`
      DO $$ BEGIN
        CREATE TYPE lead_status AS ENUM ('NEW', 'HOT', 'CLOSED', 'LOST');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        await query(`
      DO $$ BEGIN
        CREATE TYPE message_type AS ENUM ('SENT', 'RECEIVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        await query(`
      DO $$ BEGIN
        CREATE TYPE activity_type AS ENUM ('LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_DELETED', 'STATUS_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'AUTOMATION_RUN', 'USER_LOGIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        // Create clinics table
        await query(`
      CREATE TABLE IF NOT EXISTS clinics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        timezone VARCHAR(100) DEFAULT 'Asia/Jerusalem',
        language VARCHAR(10) DEFAULT 'he',
        currency VARCHAR(10) DEFAULT 'ILS',
        logo TEXT,
        integration_settings JSONB,
        backup_settings JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Create users table
        await query(`
        CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role user_role DEFAULT 'STAFF',
        status VARCHAR(20) DEFAULT 'active',
        notification_settings JSONB,
        permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
        entry_type VARCHAR(20) DEFAULT 'clinic',
        entry_code VARCHAR(50),
        reset_token VARCHAR(255),
        reset_token_exp TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE
      );
    `);

        // Ensure status column exists for older databases
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';`);
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB;`);
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[]::TEXT[];`);
        await query(`UPDATE users SET status = 'active' WHERE status IS NULL;`);
        await query(`
          UPDATE users
          SET permissions = CASE
            WHEN role IN ('ADMIN', 'SUPER_ADMIN') THEN ARRAY['all']::TEXT[]
            WHEN role = 'MANAGER' THEN ARRAY['leads','analytics','team']::TEXT[]
            ELSE ARRAY['leads']::TEXT[]
          END
          WHERE permissions IS NULL;
        `);

        // Ensure clinic settings columns exist for older databases
        await query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Jerusalem';`);
        await query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'he';`);
        await query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ILS';`);
        await query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS logo TEXT;`);
        await query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS integration_settings JSONB;`);
        await query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS backup_settings JSONB;`);
        await query(`ALTER TABLE clinics ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);`);
        await query(`UPDATE clinics SET timezone = 'Asia/Jerusalem' WHERE timezone IS NULL;`);
        await query(`UPDATE clinics SET language = 'he' WHERE language IS NULL;`);
        await query(`UPDATE clinics SET currency = 'ILS' WHERE currency IS NULL;`);
        await query(`UPDATE clinics SET whatsapp_number = '' WHERE whatsapp_number IS NULL;`);
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) DEFAULT 'clinic';`);
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS entry_code VARCHAR(50);`);
        await query(`UPDATE users SET entry_type = 'clinic' WHERE entry_type IS NULL;`);
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`);

        // Create leads table
        await query(`
        CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        service VARCHAR(255),
        status lead_status DEFAULT 'NEW',
        source VARCHAR(100),
        value DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        entry_code VARCHAR(50),
        last_contacted TIMESTAMP,
        last_inbound_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
        assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        consent_given BOOLEAN DEFAULT FALSE,
        consent_timestamp TIMESTAMP
      );
    `);
        await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP;`);
        await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_inbound_message_at TIMESTAMP;`);
        await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_visit_date DATE;`);
        await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_sent BOOLEAN DEFAULT FALSE;`);
        await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;`);
        await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP;`);
        await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS entry_code VARCHAR(50);`);

        // Create messages table
        await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        type message_type DEFAULT 'RECEIVED',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_business BOOLEAN DEFAULT false,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        provider_message_id VARCHAR(128),
        delivery_status VARCHAR(20),
        status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        message_origin VARCHAR(32),
        delivery_error TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
        await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(128);`);
        await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20);`);
        await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
        await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_origin VARCHAR(32);`);
        await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_error TEXT;`);
        await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);

        await query(`
          ALTER TABLE automations
            ADD COLUMN IF NOT EXISTS daily_cap INTEGER,
            ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER,
            ADD COLUMN IF NOT EXISTS media_url TEXT;
        `);

        await query(`
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
        provider VARCHAR(32) NOT NULL DEFAULT 'wa_web',
        status VARCHAR(32) NOT NULL DEFAULT 'disconnected',
        auth_state_encrypted TEXT,
        qr_code TEXT,
        device_jid VARCHAR(255),
        last_connected_at TIMESTAMP,
        last_error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await query(`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS provider VARCHAR(32) NOT NULL DEFAULT 'wa_web';`);
        await query(`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'disconnected';`);
        await query(`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS auth_state_encrypted TEXT;`);
        await query(`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS qr_code TEXT;`);
        await query(`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS device_jid VARCHAR(255);`);
        await query(`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP;`);
        await query(`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS last_error TEXT;`);

        // Create automations table
        await query(`
        CREATE TABLE IF NOT EXISTS automations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_days INTEGER[] DEFAULT '{3,7,14}',
        message TEXT NOT NULL,
        template_name VARCHAR(255),
        template_language VARCHAR(10) DEFAULT 'en',
        media_url TEXT,
        components JSONB DEFAULT '[]'::jsonb,
        target_status lead_status,
        active BOOLEAN DEFAULT true,
        notify_on_reply BOOLEAN DEFAULT true,
        personalization TEXT[] DEFAULT '{name}',
        last_executed TIMESTAMP,
        total_executions INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        success_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE
      );
    `);

        // Ensure automations columns exist
        await query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);`);
        await query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS template_language VARCHAR(10) DEFAULT 'en';`);
        await query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS media_url TEXT;`);
        await query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS components JSONB DEFAULT '[]'::jsonb;`);
        await query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS template_status VARCHAR(32) DEFAULT 'pending';`);
        await query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS template_sid VARCHAR(64);`);
        await query(`ALTER TABLE automations ADD COLUMN IF NOT EXISTS template_approval_sid VARCHAR(64);`);

        // Create executions table
        await query(`
      CREATE TABLE IF NOT EXISTS executions (
        id SERIAL PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        automation_id INTEGER REFERENCES automations(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        replied BOOLEAN DEFAULT false,
        replied_at TIMESTAMP
      );
    `);

        // Create activities table
        await query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type activity_type NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL
      );
    `);

        // Notifications table
        await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'system',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        action_label TEXT,
        action_link TEXT,
        metadata JSONB,
        read BOOLEAN DEFAULT false,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Integration log table
        await query(`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id SERIAL PRIMARY KEY,
        type VARCHAR(128) NOT NULL,
        level VARCHAR(32) DEFAULT 'error',
        message TEXT NOT NULL,
        metadata JSONB,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_leads_clinic ON leads(clinic_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_messages_provider_message_id ON messages(provider_message_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_messages_status_updated_at ON messages(status_updated_at);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_automations_clinic ON automations(clinic_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_notifications_clinic ON notifications(clinic_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);`);
        await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_sessions_clinic_id ON whatsapp_sessions(clinic_id);`);

        console.log('✅ Database tables created successfully');
    } catch (error) {
        console.error('❌ Error creating database tables:', error);
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };
