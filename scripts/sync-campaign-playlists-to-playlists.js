#!/usr/bin/env node

/**
 * Sync campaign_playlists data to the playlists table
 * Aggregates playlist data by vendor
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

    const defaultOrgId = '00000000-0000-0000-0000-000000000001';

    // Get all campaign playlists grouped by playlist name and vendor
    const { data: campaignPlaylists, error: fetchError } = await supabase
      .from('campaign_playlists')
      .select('*, vendors(name)');
    
    if (fetchError) {
      throw new Error(`Failed to fetch campaign playlists: ${fetchError.message}`);
    }

    console.log(`📊 Found ${campaignPlaylists.length} campaign playlist entries\n`);

    // Group by playlist name + vendor
    const playlistGroups = new Map();
    
    for (const cp of campaignPlaylists) {
      const key = `${cp.playlist_name}|${cp.vendor_id}`;
      
      if (!playlistGroups.has(key)) {
        playlistGroups.set(key, {
          name: cp.playlist_name,
          vendor_id: cp.vendor_id,
          vendor_name: cp.vendors?.name,
          curator: cp.playlist_curator,
          total_streams_7d: cp.streams_7d || 0,
          total_streams_28d: cp.streams_28d || 0,
          total_streams_12m: cp.streams_12m || 0,
          campaign_count: 1
        });
      } else {
        const group = playlistGroups.get(key);
        group.total_streams_7d += (cp.streams_7d || 0);
        group.total_streams_28d += (cp.streams_28d || 0);
        group.total_streams_12m += (cp.streams_12m || 0);
        group.campaign_count += 1;
      }
    }

    console.log(`📦 Grouped into ${playlistGroups.size} unique playlists\n`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const [key, group] of playlistGroups) {
      // Calculate average daily streams from 28-day data
      const avgDailyStreams = Math.round(group.total_streams_28d / 28);
      
      // Check if playlist already exists
      const { data: existing } = await supabase
        .from('playlists')
        .select('id')
        .eq('name', group.name)
        .eq('vendor_id', group.vendor_id)
        .single();
      
      const playlistData = {
        name: group.name,
        vendor_id: group.vendor_id,
        avg_daily_streams: avgDailyStreams,
        follower_count: 0, // We don't have this data from scraping
        genres: [], // We don't have this data from scraping
        url: `https://open.spotify.com/playlist/${group.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`, // Placeholder URL
        org_id: defaultOrgId
      };

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('playlists')
          .update(playlistData)
          .eq('id', existing.id);
        
        if (error) {
          console.error(`   ❌ Error updating "${group.name}": ${error.message}`);
          errors++;
        } else {
          console.log(`   ✅ Updated: ${group.name} (${group.vendor_name}) - ${avgDailyStreams.toLocaleString()} avg daily streams`);
          updated++;
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('playlists')
          .insert(playlistData);
        
        if (error) {
          console.error(`   ❌ Error inserting "${group.name}": ${error.message}`);
          errors++;
        } else {
          console.log(`   ✅ Inserted: ${group.name} (${group.vendor_name}) - ${avgDailyStreams.toLocaleString()} avg daily streams`);
          inserted++;
        }
      }
    }

    console.log('\n🎉 Sync complete!');
    console.log('──────────────────────────────────────────────────');
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('──────────────────────────────────────────────────');

    // Show vendor summary
    const { data: vendorStats } = await supabase
      .from('vendors')
      .select(`
        id,
        name,
        playlists(count)
      `);
    
    if (vendorStats) {
      console.log('\n📊 Playlists per Vendor:');
      console.log('──────────────────────────────────────────────────');
      for (const v of vendorStats) {
        const count = v.playlists?.[0]?.count || 0;
        console.log(`   ${v.name.padEnd(20)} ${count} playlists`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncPlaylistData();

