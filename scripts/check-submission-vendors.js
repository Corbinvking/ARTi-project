#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSubmissionVendors() {
  console.log('🔍 Checking campaign submissions for vendor assignments...\n');

  // Fetch all submissions
  const { data: submissions, error } = await supabase
    .from('campaign_submissions')
    .select('id, campaign_name, client_name, status, vendor_assignments')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error fetching submissions:', error);
    return;
  }

  console.log(`📋 Found ${submissions.length} recent submissions:\n`);

  submissions.forEach((sub, index) => {
    console.log(`${index + 1}. ${sub.campaign_name}`);
    console.log(`   Client: ${sub.client_name}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Vendor Assignments:`, sub.vendor_assignments);
    console.log(`   Vendor Count: ${Array.isArray(sub.vendor_assignments) ? sub.vendor_assignments.length : 0}`);
    console.log('');
  });

  console.log('✨ Done!');
}

checkSubmissionVendors().catch(console.error);

