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
        reset_token VARCHAR(255),
        reset_token_exp TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE
      );
    `);

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
        last_contacted TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
        assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );
    `);

        // Create messages table
        await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        type message_type DEFAULT 'RECEIVED',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_business BOOLEAN DEFAULT false,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE
      );
    `);

        // Create automations table
        await query(`
      CREATE TABLE IF NOT EXISTS automations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        trigger_days INTEGER[] DEFAULT '{3,7,14}',
        message TEXT NOT NULL,
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

        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_leads_clinic ON leads(clinic_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_automations_clinic ON automations(clinic_id);`);

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