const { createClient } = require('@supabase/supabase-js');
const { config } = require('./config');

const supabase = createClient(config.supabase.url, config.supabase.roleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const healthCheck = async () => {
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
