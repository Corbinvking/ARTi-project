#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

// Hardcode production values for testing on the droplet
const supabaseUrl = 'https://api.artistinfluence.com';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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
      console.log('All users:');
      data.forEach(user => {
        console.log(`  - ${user.email} (${user.full_name || 'no name'})`);
      });
    } else {
      console.log('⚠️  No users returned. This means:');
      console.log('   1. RLS is blocking the query, OR');
      console.log('   2. You need to be authenticated as an admin');
    }
  }

  // Also check user_roles
  console.log('\n🔍 Checking user_roles table...\n');
  const { data: roles, error: rolesError, count: rolesCount } = await supabase
    .from('user_roles')
    .select('user_id, role', { count: 'exact' });

  if (rolesError) {
    console.error('❌ Error querying user_roles:', rolesError);
  } else {
    console.log(`✅ Found ${rolesCount} user_roles entries`);
    if (roles && roles.length > 0) {
      console.log('\nRoles:');
      roles.forEach(r => {
        console.log(`  - ${r.user_id.substring(0, 8)}...: ${r.role}`);
      });
    }
  }
}

testUsersQuery().catch(console.error);

