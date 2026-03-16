import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rowxifvnjpiuzjoevquy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvd3hpZnZuanBpdXpqb2V2cXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzU4MjQsImV4cCI6MjA4ODExMTgyNH0.oZ4mMY9tsOcXzd8xKSXjZ6wupU3XR7oa4U-M8C6x5KY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
