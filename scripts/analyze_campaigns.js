#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: campaigns, error } = await supabase
  .from('spotify_campaigns')
  .select('campaign, created_at')
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('Error:', error);
} else {
  console.log(`\nLast 20 campaigns created:`);
  campaigns.forEach((c, i) => {
    console.log(`${i + 1}. ${c.campaign || 'null'} (${c.created_at})`);
  });
  
  const { count } = await supabase
    .from('spotify_campaigns')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nTotal: ${count} campaigns\n`);
}

