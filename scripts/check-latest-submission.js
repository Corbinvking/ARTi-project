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

async function checkLatestSubmission() {
  console.log('🔍 Checking latest submissions...\n');
  
  // Get all submissions ordered by most recent
  const { data: submissions, error } = await supabase
    .from('campaign_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${submissions?.length || 0} most recent submissions:\n`);
  
  submissions?.forEach((sub, idx) => {
    console.log(`${idx + 1}. ${sub.campaign_name}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`);
    console.log(`   Client: ${sub.client_name}`);
    console.log(`   Salesperson: ${sub.salesperson || 'N/A'}`);
    console.log(`   Org ID: ${sub.org_id || 'NULL'}`);
    console.log('');
  });
  
  // Check if there's a pending one without org_id
  const withoutOrgId = submissions?.filter(s => !s.org_id && s.status === 'pending_approval');
  if (withoutOrgId && withoutOrgId.length > 0) {
    console.log('⚠️  Found submissions without org_id that need fixing:');
    withoutOrgId.forEach(s => {
      console.log(`   - ${s.campaign_name} (${s.id})`);
    });
  }
}

checkLatestSubmission().catch(console.error);

