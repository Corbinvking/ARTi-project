#!/usr/bin/env node
/**
 * Import sample campaign and playlist data for vendors
 * This creates sample playlists and campaign_playlists entries for testing
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Sample playlists for each vendor
const SAMPLE_PLAYLISTS = {
  'Club Restricted': [
    { name: 'DJ JJ & DJ VELOCITY FYP TIKTOK 2025', url: 'https://open.spotify.com/playlist/sample1', genres: ['EDM', 'Dance'], avg_daily_streams: 5000, follower_count: 12500 },
    { name: 'SPAGHETTI - J-HOPE X BTS', url: 'https://open.spotify.com/playlist/sample2', genres: ['K-Pop', 'Dance'], avg_daily_streams: 8000, follower_count: 25000 },
    { name: 'Dance anos 90 e 2000', url: 'https://open.spotify.com/playlist/sample3', genres: ['Dance', '90s', '00s'], avg_daily_streams: 3500, follower_count: 8000 },
  ],
  'Glenn': [
    { name: 'Rock Workout Motivation', url: 'https://open.spotify.com/playlist/sample4', genres: ['Rock', 'Workout'], avg_daily_streams: 4200, follower_count: 15000 },
    { name: 'Electronica Vieja Exitos', url: 'https://open.spotify.com/playlist/sample5', genres: ['Electronic', 'Classics'], avg_daily_streams: 3800, follower_count: 11000 },
  ],
  'Majed': [
    { name: 'Drum and Bass 🔥', url: 'https://open.spotify.com/playlist/sample6', genres: ['DnB', 'Electronic'], avg_daily_streams: 6500, follower_count: 22000 },
    { name: 'Techno Rave. 💊', url: 'https://open.spotify.com/playlist/sample7', genres: ['Techno', 'Rave'], avg_daily_streams: 7200, follower_count: 28000 },
  ]
};

async function main() {
  console.log('🎵 Importing sample vendor data...\n');

  // Get vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .in('name', Object.keys(SAMPLE_PLAYLISTS));

  if (!vendors || vendors.length === 0) {
    console.error('❌ No vendors found!');
    return;
  }

  console.log(`📦 Found ${vendors.length} vendors to populate\n`);

  // Import playlists for each vendor
  for (const vendor of vendors) {
    console.log(`🏢 ${vendor.name}`);
    console.log('─'.repeat(60));

    const playlists = SAMPLE_PLAYLISTS[vendor.name] || [];
    
    for (const playlist of playlists) {
      // Check if playlist already exists
      const { data: existing } = await supabase
        .from('playlists')
        .select('id')
        .eq('vendor_id', vendor.id)
        .eq('name', playlist.name)
        .single();

      if (existing) {
        console.log(`  ⏭️  ${playlist.name} - already exists`);
        continue;
      }

      // Insert playlist
      const { data: newPlaylist, error } = await supabase
        .from('playlists')
        .insert({
          vendor_id: vendor.id,
          name: playlist.name,
          url: playlist.url,
          genres: playlist.genres,
          avg_daily_streams: playlist.avg_daily_streams,
          follower_count: playlist.follower_count,
          org_id: '00000000-0000-0000-0000-000000000001'
        })
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Error creating ${playlist.name}:`, error.message);
      } else {
        console.log(`  ✅ Created ${playlist.name} (${playlist.avg_daily_streams.toLocaleString()} daily streams)`);
      }
    }

    console.log();
  }

  console.log('\n🎉 Sample data import complete!');
  
  // Show summary
  console.log('\n📊 Summary:');
  for (const vendor of vendors) {
    const { data: playlists } = await supabase
      .from('playlists')
      .select('*')
      .eq('vendor_id', vendor.id);
    
    const totalStreams = playlists?.reduce((sum, p) => sum + p.avg_daily_streams, 0) || 0;
    console.log(`  ${vendor.name}: ${playlists?.length || 0} playlists, ${totalStreams.toLocaleString()} total daily streams`);
  }
}

main().catch(console.error);

