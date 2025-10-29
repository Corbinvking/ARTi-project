#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSubmissions() {
  console.log('🔍 Checking all submissions...\n');
  
  const { data: submissions, error } = await supabase
    .from('campaign_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${submissions?.length || 0} submissions:\n`);
  
  submissions?.forEach((sub, idx) => {
    console.log(`${idx + 1}. ${sub.campaign_name}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`);
    console.log(`   Client: ${sub.client_name}`);
    console.log(`   Budget: $${sub.price_paid}`);
    console.log('');
  });
}

checkSubmissions().catch(console.error);

