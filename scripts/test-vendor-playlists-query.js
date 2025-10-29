#!/usr/bin/env node
/**
 * Test if vendor can read playlists with anon key
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing playlists query as vendor\n');

async function testAsVendor() {
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

  // First get vendor info
  const { data: vendorData, error: vendorError } = await supabase
    .from('vendor_users')
    .select(`
      vendor_id,
      vendors (id, name)
    `)
    .eq('user_id', authData.user.id)
    .single();

  if (vendorError) {
    console.error('❌ Error getting vendor:', vendorError.message);
    return;
  }

  const vendorId = vendorData.vendor_id;
  console.log('📦 Vendor:', vendorData.vendors.name);
  console.log('   Vendor ID:', vendorId);
  console.log();

  // Now test playlists query (same as useMyPlaylists)
  console.log('🔍 Querying playlists...');
  const { data: playlists, error: playlistsError } = await supabase
    .from('playlists')
    .select('*')
    .eq('vendor_id', vendorId);

  if (playlistsError) {
    console.error('❌ Playlists query error:');
    console.error('   Message:', playlistsError.message);
    console.error('   Code:', playlistsError.code);
    console.error('   Details:', playlistsError.details);
    console.error('   Hint:', playlistsError.hint);
  } else if (playlists && playlists.length > 0) {
    console.log(`✅ Success! Found ${playlists.length} playlists:`);
    playlists.forEach(p => {
      console.log(`   - ${p.name} (${p.avg_daily_streams} streams/day)`);
    });
  } else {
    console.log('⚠️  No playlists returned (empty array)');
  }

  console.log();

  // Also test campaigns query
  console.log('🔍 Querying campaigns...');
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('*')
    .limit(5);

  if (campaignsError) {
    console.error('❌ Campaigns query error:', campaignsError.message);
  } else {
    console.log(`📊 Found ${campaigns?.length || 0} campaigns (limited to 5)`);
  }
}

testAsVendor().catch(console.error);

