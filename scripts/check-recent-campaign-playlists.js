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

async function checkRecentCampaignPlaylists() {
  console.log('🔍 Checking recent campaign_playlists entries...\n');

  // Fetch most recent campaign_playlists entries
  const { data: playlists, error } = await supabase
    .from('campaign_playlists')
    .select('*, vendors(id, name)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching campaign playlists:', error);
    return;
  }

  console.log(`📋 Found ${playlists.length} recent entries:\n`);

  playlists.forEach((playlist, index) => {
    console.log(`${index + 1}. ${playlist.playlist_name}`);
    console.log(`   Campaign ID: ${playlist.campaign_id}`);
    console.log(`   vendor_id: ${playlist.vendor_id || 'NULL'}`);
    console.log(`   playlist_curator: ${playlist.playlist_curator || 'NULL'}`);
    console.log(`   is_algorithmic: ${playlist.is_algorithmic}`);
    console.log(`   vendor name (from join): ${playlist.vendors?.name || 'NULL'}`);
    console.log('');
  });

  // Show summary
  const withVendorId = playlists.filter(p => p.vendor_id !== null);
  const withCurator = playlists.filter(p => p.playlist_curator !== null);
  
  console.log('\n📊 Summary:');
  console.log(`   Total checked: ${playlists.length}`);
  console.log(`   With vendor_id: ${withVendorId.length}`);
  console.log(`   With playlist_curator: ${withCurator.length}`);
  console.log('');

  console.log('✨ Check complete!');
}

checkRecentCampaignPlaylists().catch(console.error);

