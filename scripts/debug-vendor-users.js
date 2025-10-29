#!/usr/bin/env node
/**
 * Debug vendor_users foreign key issues
 */

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

async function main() {
  console.log('🔍 Debugging vendor_users table...\n');

  // Check auth.users
  const { data: authData } = await supabase.auth.admin.listUsers();
  console.log(`✓ Found ${authData.users.length} users in auth.users`);
  authData.users.forEach(u => console.log(`  - ${u.email} (${u.id})`));
  console.log();

  // Check if there's a public.users table
  const { data: publicUsers, error: publicUsersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(5);

  if (publicUsersError) {
    console.log('⚠️  public.users table error:', publicUsersError.message);
  } else {
    console.log(`✓ Found ${publicUsers?.length || 0} users in public.users`);
    publicUsers?.forEach(u => console.log(`  - ${u.email} (${u.id})`));
  }
  console.log();

  // Check vendors table
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id, name')
    .limit(5);

  if (vendorsError) {
    console.log('❌ Error fetching vendors:', vendorsError);
  } else {
    console.log(`✓ Found ${vendors?.length || 0} vendors`);
    vendors?.forEach(v => console.log(`  - ${v.name} (${v.id})`));
  }
  console.log();

  // Try direct SQL insert using RPC or raw query
  console.log('🧪 Testing direct insert to vendor_users...');
  
  const testUserId = authData.users.find(u => u.email === 'vendor1@arti-demo.com')?.id;
  const testVendorId = vendors?.find(v => v.name === 'Club Restricted')?.id;

  if (testUserId && testVendorId) {
    console.log(`  Using user_id: ${testUserId}`);
    console.log(`  Using vendor_id: ${testVendorId}`);

    // Try insert with explicit column names
    const { data, error } = await supabase
      .from('vendor_users')
      .insert({
        user_id: testUserId,
        vendor_id: testVendorId
      })
      .select();

    if (error) {
      console.log('❌ Insert failed:', error);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('✅ Insert successful!', data);
    }
  } else {
    console.log('❌ Could not find test user or vendor');
  }
}

main().catch(console.error);

