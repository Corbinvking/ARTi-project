#!/usr/bin/env node

/**
 * Tag Algorithmic Playlists in Database
 * 
 * This script identifies and tags playlists that are Spotify algorithmic playlists
 * (Radio, Discover Weekly, Your DJ, Daylist, Mixes, etc.)
 */

const { createClient } = require('@supabase/supabase-js');

// Known algorithmic playlist patterns
const ALGORITHMIC_PATTERNS = [
  'radio',
  'discover weekly',
  'your dj',
  'daylist',
  'mixes',
  'release radar',
  'daily mix',
  'on repeat',
  'repeat rewind'
];

// Known Spotify curator variations
const SPOTIFY_CURATORS = [
  'spotify',
  'spotify official',
  'algorithmic'
];

async function tagAlgorithmicPlaylists() {
  try {
    console.log('🔍 Tagging algorithmic playlists in database...\n');

    const supabaseUrl = process.env.SUPABASE_URL || 'https://api.artistinfluence.com';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch all playlists from campaign_playlists
    console.log('📊 Fetching all playlists from campaign_playlists...');
    const { data: allPlaylists, error: fetchError } = await supabase
      .from('campaign_playlists')
      .select('id, playlist_name, playlist_curator, is_algorithmic, vendor_id');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`✅ Found ${allPlaylists.length} playlists\n`);

    // Identify algorithmic playlists
    const algorithmicPlaylists = [];
    const vendorPlaylists = [];

    for (const playlist of allPlaylists) {
      const name = (playlist.playlist_name || '').toLowerCase();
      const curator = (playlist.playlist_curator || '').toLowerCase();
      
      // Check if it matches algorithmic patterns
      const isAlgorithmic = ALGORITHMIC_PATTERNS.some(pattern => name.includes(pattern)) ||
                           SPOTIFY_CURATORS.some(curator_name => curator.includes(curator_name));
      
      // Additional check: no vendor_id means likely algorithmic
      const hasNoVendor = !playlist.vendor_id;
      
      if (isAlgorithmic && hasNoVendor) {
        algorithmicPlaylists.push(playlist);
      } else if (playlist.vendor_id) {
        vendorPlaylists.push(playlist);
      }
    }

    console.log(`🎯 Identified ${algorithmicPlaylists.length} algorithmic playlists`);
    console.log(`📦 Identified ${vendorPlaylists.length} vendor playlists\n`);

    // Show breakdown by name
    const nameBreakdown = {};
    algorithmicPlaylists.forEach(p => {
      const name = p.playlist_name;
      nameBreakdown[name] = (nameBreakdown[name] || 0) + 1;
    });

    console.log('📋 Algorithmic playlists by name:');
    Object.entries(nameBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`   - ${name}: ${count}`);
      });
    console.log('');

    // Update is_algorithmic flag for algorithmic playlists
    console.log('🔄 Updating is_algorithmic flag...');
    
    let updated = 0;
    let alreadyTagged = 0;
    let errors = 0;

    for (const playlist of algorithmicPlaylists) {
      if (playlist.is_algorithmic) {
        alreadyTagged++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('campaign_playlists')
        .update({ is_algorithmic: true })
        .eq('id', playlist.id);

      if (updateError) {
        console.error(`❌ Error updating ${playlist.playlist_name}:`, updateError.message);
        errors++;
      } else {
        updated++;
      }
    }

    // Ensure vendor playlists are NOT marked as algorithmic
    console.log('\n🔄 Ensuring vendor playlists are not marked as algorithmic...');
    
    let vendorFixed = 0;
    for (const playlist of vendorPlaylists) {
      if (playlist.is_algorithmic) {
        const { error: updateError } = await supabase
          .from('campaign_playlists')
          .update({ is_algorithmic: false })
          .eq('id', playlist.id);

        if (updateError) {
          console.error(`❌ Error updating ${playlist.playlist_name}:`, updateError.message);
          errors++;
        } else {
          vendorFixed++;
        }
      }
    }

    console.log('\n✅ TAGGING COMPLETE!\n');
    console.log('Summary:');
    console.log(`  - Total playlists: ${allPlaylists.length}`);
    console.log(`  - Algorithmic playlists found: ${algorithmicPlaylists.length}`);
    console.log(`  - Already tagged: ${alreadyTagged}`);
    console.log(`  - Newly tagged: ${updated}`);
    console.log(`  - Vendor playlists fixed: ${vendorFixed}`);
    console.log(`  - Errors: ${errors}`);
    console.log('');

    // Verification query
    console.log('🔍 Verification:');
    const { data: verification, error: verifyError } = await supabase
      .from('campaign_playlists')
      .select('is_algorithmic')
      .eq('is_algorithmic', true);

    if (!verifyError) {
      console.log(`  - Total algorithmic playlists in DB: ${verification.length}`);
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  tagAlgorithmicPlaylists();
}

module.exports = { tagAlgorithmicPlaylists };

