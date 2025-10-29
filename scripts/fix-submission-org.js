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

async function fixSubmissionOrg() {
  console.log('🔧 Fixing submission org_id...\n');
  
  // Update all submissions to have a default org_id
  const { error } = await supabase
    .from('campaign_submissions')
    .update({ 
      org_id: '00000000-0000-0000-0000-000000000001' 
    })
    .is('org_id', null);
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Fixed submission org_id');
  }
  
  // Now check if we can see submissions
  const { data: submissions, error: queryError } = await supabase
    .from('campaign_submissions')
    .select('*')
    .in('status', ['pending_approval', 'rejected']);
  
  if (queryError) {
    console.error('❌ Query error:', queryError);
  } else {
    console.log(`\n✅ Can now see ${submissions?.length || 0} submissions`);
    submissions?.forEach(s => {
      console.log(`   - ${s.campaign_name} (${s.status})`);
    });
  }
}

fixSubmissionOrg().catch(console.error);

