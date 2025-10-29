#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function checkRLS() {
  console.log('🔍 Checking RLS policies on user_roles table...\n');

  // Check RLS policies
  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
          policyname,
          permissive,
          roles,
          cmd,
          qual::text,
          with_check::text
      FROM pg_policies 
      WHERE tablename = 'user_roles'
      ORDER BY policyname;
    `
  });

  if (policiesError) {
    console.log('⚠️  RPC not available, trying direct query...\n');
    
    // Try a different approach - just query with service role and see what happens
    const { data: testData, error: testError, count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact' });
    
    console.log('📋 Direct query result:');
    console.log('  - Rows returned:', testData?.length || 0);
    console.log('  - Total count:', count);
    console.log('  - Error:', testError);
    console.log('  - Data:', testData);
  } else {
    console.log('📋 RLS Policies:', policies);
  }
  
  // Also check if we can query as service role
  console.log('\n🔧 Testing service role access...');
  const userId = 'e9337ebd-df8c-4302-b03c-ee584aa8869f';
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  console.log('Result:', data);
  console.log('Error:', error);
}

checkRLS().catch(console.error);

