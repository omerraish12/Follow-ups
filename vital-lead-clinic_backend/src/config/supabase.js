import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // Make sure to use environment variables

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
