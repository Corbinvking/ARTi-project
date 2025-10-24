#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { count, error } = await supabase
  .from('spotify_campaigns')
  .select('*', { count: 'exact', head: true });

if (error) {
  console.error('Error:', error);
} else {
  console.log('Total campaigns in database:', count);
}

