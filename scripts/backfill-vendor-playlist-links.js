#!/usr/bin/env node
/**
 * Backfill Vendor Playlist Links
 * 
 * This script:
 * 1. Loads all playlists from the playlists table with their vendor associations
 * 2. For each campaign_playlists record without vendor_id, tries to match by playlist_name
 * 3. Updates vendor_id and playlist_curator accordingly
 * 4. Sets is_algorithmic flag based on whether vendor was found
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillVendorLinks() {
  console.log('================================================================================');
  console.log('🔗 BACKFILLING VENDOR PLAYLIST LINKS');
  console.log('================================================================================\n');
  
  try {
    // Step 1: Load all vendor playlists
    console.log('📋 Step 1: Loading vendor playlists...');
    const { data: vendorPlaylists, error: vendorPlaylistsError } = await supabase
      .from('playlists')
      .select('id, name, vendor_id, vendor:vendors(id, name)');
    
    if (vendorPlaylistsError) {
      console.error(`❌ Error fetching vendor playlists: ${vendorPlaylistsError.message}`);
      return;
    }
    
    console.log(`✅ Loaded ${vendorPlaylists.length} vendor playlists`);
    
    // Create lookup map: playlist name -> vendor info
    const playlistVendorMap = new Map();
    for (const playlist of vendorPlaylists) {
      playlistVendorMap.set(playlist.name, {
        vendor_id: playlist.vendor_id,
        vendor_name: playlist.vendor?.name || null
      });
    }
    
    console.log(`✅ Created vendor lookup map with ${playlistVendorMap.size} entries\n`);
    
    // Step 2: Load all campaign_playlists without vendor_id
    console.log('📋 Step 2: Loading campaign_playlists without vendor_id...');
    const { data: campaignPlaylists, error: campaignPlaylistsError } = await supabase
      .from('campaign_playlists')
      .select('id, campaign_id, playlist_name, vendor_id, playlist_curator')
      .is('vendor_id', null);
    
    if (campaignPlaylistsError) {
      console.error(`❌ Error fetching campaign_playlists: ${campaignPlaylistsError.message}`);
      return;
    }
    
    console.log(`✅ Found ${campaignPlaylists.length} campaign_playlists without vendor_id\n`);
    
    if (campaignPlaylists.length === 0) {
      console.log('✨ No records need updating!');
      return;
    }
    
    // Step 3: Update records
    console.log('📋 Step 3: Updating campaign_playlists records...');
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    
    for (const cp of campaignPlaylists) {
      try {
        const vendorInfo = playlistVendorMap.get(cp.playlist_name);
        const isAlgorithmic = !vendorInfo || !vendorInfo.vendor_id;
        const playlistCurator = vendorInfo?.vendor_name || cp.playlist_curator || 'Spotify';
        
        const { error: updateError } = await supabase
          .from('campaign_playlists')
          .update({
            vendor_id: vendorInfo?.vendor_id || null,
            playlist_curator: playlistCurator,
            is_algorithmic: isAlgorithmic
          })
          .eq('id', cp.id);
        
        if (updateError) {
          console.error(`   ❌ Error updating campaign_playlist ${cp.id}: ${updateError.message}`);
          errors++;
        } else if (isAlgorithmic) {
          console.log(`   ℹ️  ${cp.playlist_name} → Algorithmic (no vendor match)`);
          notFound++;
        } else {
          console.log(`   ✅ ${cp.playlist_name} → ${vendorInfo.vendor_name}`);
          updated++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing campaign_playlist ${cp.id}: ${error.message}`);
        errors++;
      }
    }
    
    console.log('\n================================================================================');
    console.log('📊 SUMMARY');
    console.log('================================================================================');
    console.log(`✅ Successfully linked to vendors: ${updated}`);
    console.log(`ℹ️  Marked as algorithmic (no vendor match): ${notFound}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('================================================================================\n');
    
  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
  }
}

// Run the script
backfillVendorLinks()
  .then(() => {
    console.log('✨ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

