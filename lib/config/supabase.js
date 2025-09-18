import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

export default supabase;