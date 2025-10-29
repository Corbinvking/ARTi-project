#!/usr/bin/env node
/**
 * Test the vendor query that useMyVendor uses
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
  const userId = '0f9e68b7-ad07-4eca-991c-23ba224578e3'; // vendor1's ID

  console.log('🔍 Testing vendor query for user:', userId);
  console.log();

  // This is the exact query that useMyVendor uses
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
    .eq('user_id', userId);

  console.log('📊 Query result:');
  console.log('  Error:', error);
  console.log('  Data:', JSON.stringify(data, null, 2));
  console.log();

  if (data && data.length > 0) {
    console.log('✅ Found vendor association!');
    console.log('   Vendor:', data[0].vendors?.name);
  } else {
    console.log('❌ No vendor association found');
    
    // Check vendor_users table directly
    console.log('\n🔍 Checking vendor_users table...');
    const { data: vu } = await supabase
      .from('vendor_users')
      .select('*')
      .eq('user_id', userId);
    
    console.log('  vendor_users entries:', JSON.stringify(vu, null, 2));

    // Check vendors table
    console.log('\n🔍 Checking vendors table...');
    const { data: vendors } = await supabase
      .from('vendors')
      .select('*')
      .limit(3);
    
    console.log('  Sample vendors:', JSON.stringify(vendors, null, 2));
  }
}

main().catch(console.error);

