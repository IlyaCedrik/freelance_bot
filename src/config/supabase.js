import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Client for general operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for service operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default {
  supabase,
  supabaseAdmin
}; 