const { query } = require('../config/database');

async function dropDatabaseObjects() {
    try {
        console.log('Dropping database tables and helper types...');

        const dropStatements = [
            'DROP TABLE IF EXISTS integration_logs CASCADE;',
            'DROP TABLE IF EXISTS notifications CASCADE;',
            'DROP TABLE IF EXISTS activities CASCADE;',
            'DROP TABLE IF EXISTS executions CASCADE;',
            'DROP TABLE IF EXISTS automations CASCADE;',
            'DROP TABLE IF EXISTS messages CASCADE;',
            'DROP TABLE IF EXISTS leads CASCADE;',
            'DROP TABLE IF EXISTS users CASCADE;',
            'DROP TABLE IF EXISTS clinics CASCADE;',
            'DROP TYPE IF EXISTS activity_type;',
            'DROP TYPE IF EXISTS message_type;',
            'DROP TYPE IF EXISTS lead_status;',
            'DROP TYPE IF EXISTS user_role;'
        ];

        for (const statement of dropStatements) {
            await query(statement);
        }

        console.log('✅ All tables and enum types dropped successfully');
    } catch (error) {
        console.error('❌ Error dropping database objects:', error);
        throw error;
    }
}

if (require.main === module) {
    dropDatabaseObjects()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { dropDatabaseObjects };
