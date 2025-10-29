#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test with ANON key (what the frontend uses)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testUsersQuery() {
  console.log('🔍 Testing public.users query with ANON key...\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

  // Try to query all users (what the admin panel does)
  const { data, error, count } = await supabase
    .from('users')
    .select('id, email, full_name, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error querying users:', error);
  } else {
    console.log(`✅ Query successful!`);
    console.log(`📊 Total count: ${count}`);
    console.log(`📋 Returned rows: ${data?.length}\n`);
    
    if (data && data.length > 0) {
      console.log('First 5 users:');
      data.slice(0, 5).forEach(user => {
        console.log(`  - ${user.email} (${user.id.substring(0, 8)}...)`);
      });
    }
  }

  // Also check user_roles
  console.log('\n🔍 Checking user_roles table...\n');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role', { count: 'exact' });

  if (rolesError) {
    console.error('❌ Error querying user_roles:', rolesError);
  } else {
    console.log(`✅ Found ${roles?.length} user_roles entries`);
  }
}

testUsersQuery().catch(console.error);

