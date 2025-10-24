#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Checking RLS policies and data access...\n');
  
  // Check with service role (bypasses RLS)
  console.log('1️⃣ Checking with SERVICE ROLE KEY (bypasses RLS):');
  const { data: serviceData, error: serviceError } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, source, campaign_type')
    .limit(5);
  
  if (serviceError) {
    console.log(`   ❌ Error: ${serviceError.message}`);
  } else {
    console.log(`   ✅ Found ${serviceData.length} campaigns`);
    serviceData.forEach(c => {
      console.log(`      - ${c.campaign}`);
      console.log(`        source: ${c.source}`);
      console.log(`        type: ${c.campaign_type}`);
    });
  }
  
  console.log('\n2️⃣ Checking with ANON KEY (subject to RLS):');
  const anonSupabase = createClient(
    supabaseUrl, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const { data: anonData, error: anonError } = await anonSupabase
    .from('spotify_campaigns')
    .select('id, campaign')
    .limit(5);
  
  if (anonError) {
    console.log(`   ❌ Error: ${anonError.message}`);
    console.log(`   ⚠️  This means RLS is blocking access!`);
  } else {
    console.log(`   ✅ Found ${anonData.length} campaigns`);
    if (anonData.length === 0) {
      console.log(`   ⚠️  RLS might be blocking access or no campaigns match filters`);
    }
  }
  
  // Check RLS status
  console.log('\n3️⃣ Checking RLS policies on spotify_campaigns table:');
  const { data: rlsData } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies 
      WHERE tablename = 'spotify_campaigns';
    `
  }).catch(() => ({ data: null }));
  
  if (rlsData && rlsData.length > 0) {
    console.log(`   Found ${rlsData.length} RLS policies:`);
    rlsData.forEach(policy => {
      console.log(`   - ${policy.policyname}`);
    });
  } else {
    console.log(`   ⚠️  No RLS policies found (or can't query them)`);
    console.log(`   This means the table might have RLS enabled but no policies = NO ACCESS`);
  }
  
  console.log('\n');
}

main().catch(console.error);

