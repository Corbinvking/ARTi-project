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

async function testVendorPlaylistCreation() {
  console.log('🧪 Testing vendor-playlist-campaign linkage...\n');

  // 1. Get a test vendor and their playlists
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('is_active', true)
    .limit(1);

  if (vendorsError) {
    console.error('❌ Error fetching vendors:', vendorsError);
    return;
  }

  if (!vendors || vendors.length === 0) {
    console.log('⚠️  No active vendors found');
    return;
  }

  const testVendor = vendors[0];
  console.log(`📦 Using test vendor: ${testVendor.name} (${testVendor.id})\n`);

  // 2. Get playlists for this vendor
  const { data: playlists, error: playlistsError } = await supabase
    .from('playlists')
    .select('id, name, vendor_id, vendor:vendors(id, name)')
    .eq('vendor_id', testVendor.id)
    .limit(3);

  if (playlistsError) {
    console.error('❌ Error fetching playlists:', playlistsError);
    return;
  }

  if (!playlists || playlists.length === 0) {
    console.log('⚠️  No playlists found for this vendor');
    return;
  }

  console.log(`📋 Found ${playlists.length} playlists for ${testVendor.name}:\n`);
  playlists.forEach(p => {
    console.log(`  - ${p.name}`);
    console.log(`    vendor_id: ${p.vendor_id}`);
    console.log(`    vendor.name: ${p.vendor?.name}`);
  });

  console.log('\n🔍 Check: Is the vendor join working?');
  console.log(`   Playlist vendor_id matches vendor id: ${playlists[0].vendor_id === testVendor.id}`);
  console.log(`   Vendor name accessible: ${playlists[0].vendor?.name ? 'Yes' : 'No'}`);

  console.log('\n✨ Test complete!');
  console.log('\nIf vendor names are accessible, the Campaign Builder should work correctly.');
  console.log('Create a test campaign and check campaign_playlists.playlist_curator contains vendor names.');
}

testVendorPlaylistCreation().catch(console.error);

