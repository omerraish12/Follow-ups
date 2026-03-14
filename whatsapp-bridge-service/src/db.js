const { createClient } = require('@supabase/supabase-js');
const { config } = require('./config');

// Supabase client is still initialized so existing code paths keep working
const supabase = createClient(config.supabase.url, config.supabase.roleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const healthCheck = async () => {
  // When using local session store, don't fail liveness due to Supabase outages.
  if (config.sessionStore === 'local') {
    return true;
  }
  const { error } = await supabase
    .from('whatsapp_sessions')
    .select('id', { count: 'exact', head: true })
    .limit(1);
  if (error) {
    throw error;
  }
  return true;
};

module.exports = {
  supabase,
  healthCheck
};
