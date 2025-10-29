#!/usr/bin/env node
/**
 * Test vendor query with anon key (simulating frontend)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing with ANON KEY (like frontend does)\n');

async function testAsVendor() {
  // Create client with anon key
  const supabase = createClient(supabaseUrl, anonKey);

  // Sign in as vendor1
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'vendor1@arti-demo.com',
    password: 'password123'
  });

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
    return;
  }

  console.log('✅ Signed in as:', authData.user.email);
  console.log('   User ID:', authData.user.id);
  console.log();

  // Now test the vendor_users query (same as useMyVendor)
  const { data, error } = await supabase
    .from('vendor_users')
    .select(`
      vendor_id,
      vendors (
        id,
        name,
        max_daily_streams,
        cost_per_1k_streams,
        max_concurrent_campaigns,
        is_active,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', authData.user.id);

  console.log('📊 Query result:');
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
  } else if (data && data.length > 0) {
    console.log('✅ Success! Found vendor association:');
    console.log('   Vendor:', data[0].vendors?.name);
    console.log('   Full data:', JSON.stringify(data, null, 2));
  } else {
    console.log('⚠️  No data returned (empty array)');
  }
}

testAsVendor().catch(console.error);

