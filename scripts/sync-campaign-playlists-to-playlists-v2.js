#!/usr/bin/env node

/**
 * Sync data from campaign_playlists to playlists table (v2)
 * This aggregates campaign playlist data into the main playlists table
 */

const { createClient } = require('@supabase/supabase-js');

async function syncPlaylistData() {
  try {
    console.log('🔄 Syncing campaign_playlists to playlists table...\n');

    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
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

    // Get default org
    const { data: defaultOrg } = await supabase
      .from('orgs')
      .select('id')
      .limit(1)
      .single();

    const defaultOrgId = defaultOrg.id;

    // Get all campaign playlists with vendor info, excluding algorithmic
    const { data: campaignPlaylists } = await supabase
      .from('campaign_playlists')
      .select('*, vendors(id, name)')
      .eq('is_algorithmic', false);

    console.log(`📊 Found ${campaignPlaylists.length} vendor playlists in campaign_playlists`);

    // Group by playlist name and vendor
    const playlistGroups = new Map();

    campaignPlaylists.forEach(cp => {
      const key = `${cp.playlist_name}_${cp.vendor_id}`;
      if (!playlistGroups.has(key)) {
        playlistGroups.set(key, []);
      }
      playlistGroups.get(key).push(cp);
    });

    console.log(`📊 Grouped into ${playlistGroups.size} unique playlists\n`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Process each playlist group
    for (const [key, playlists] of playlistGroups.entries()) {
      const firstPlaylist = playlists[0];
      const playlistName = firstPlaylist.playlist_name;
      const vendorId = firstPlaylist.vendor_id;
      const vendorName = firstPlaylist.vendors?.name || 'Unknown';

      // Calculate aggregated stats
      const totalStreams = playlists.reduce((sum, p) => sum + (p.streams_28d || 0), 0);
      const avgDailyStreams = Math.round(totalStreams / 28); // Estimate from 28-day total

      // Check if playlist already exists
      const { data: existingPlaylist } = await supabase
        .from('playlists')
        .select('id')
        .eq('name', playlistName)
        .eq('vendor_id', vendorId)
        .single();

      const playlistData = {
        name: playlistName,
        vendor_id: vendorId,
        avg_daily_streams: avgDailyStreams,
        follower_count: 0, // We don't have this from campaign playlists
        genres: [], // We don't have this from campaign playlists
        url: `https://open.spotify.com/playlist/${playlistName.toLowerCase().replace(/[^a-z0-9]/g, '')}`, // Placeholder
        org_id: defaultOrgId
      };

      if (existingPlaylist) {
        // Update existing playlist
        const { error } = await supabase
          .from('playlists')
          .update(playlistData)
          .eq('id', existingPlaylist.id);

        if (error) {
          console.log(`   ⚠️  Error updating "${playlistName}": ${error.message}`);
          skipped++;
        } else {
          console.log(`   🔄 Updated: ${playlistName} (${avgDailyStreams} daily streams, Vendor: ${vendorName})`);
          updated++;
        }
      } else {
        // Insert new playlist
        const { error } = await supabase
          .from('playlists')
          .insert(playlistData);

        if (error) {
          console.log(`   ⚠️  Error inserting "${playlistName}": ${error.message}`);
          skipped++;
        } else {
          console.log(`   ✅ Inserted: ${playlistName} (${avgDailyStreams} daily streams, Vendor: ${vendorName})`);
          inserted++;
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ SYNC SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Playlists inserted: ${inserted}`);
    console.log(`🔄 Playlists updated: ${updated}`);
    console.log(`⚠️  Playlists skipped: ${skipped}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncPlaylistData();

