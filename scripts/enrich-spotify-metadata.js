/**
 * Spotify Metadata Enrichment Script
 * 
 * Enriches the database with Spotify Web API data:
 * - Playlist follower counts
 * - Track names and artist names
 * - Genre data from artists
 * 
 * Uses the production API to handle Spotify authentication.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use native fetch if available (Node 18+), otherwise use https/http
const fetch = globalThis.fetch || (async (url, options = {}) => {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(data),
          text: async () => data,
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
});

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Enrich playlist follower counts
 */
async function enrichPlaylistFollowers() {
  console.log('================================================================================');
  console.log('📋 ENRICHING PLAYLIST FOLLOWER COUNTS');
  console.log('================================================================================\n');

  // Fetch all playlists with URLs
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select('id, name, url, follower_count, vendor_id, vendor:vendors(name)')
    .not('url', 'is', null)
    .order('name');

  if (error) {
    console.error('❌ Error fetching playlists:', error.message);
    return;
  }

  console.log(`✅ Found ${playlists.length} playlists to enrich\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const playlist of playlists) {
    try {
      // Extract Spotify playlist ID from URL
      const playlistIdMatch = playlist.url.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!playlistIdMatch) {
        console.log(`   ⏭️  Skipping ${playlist.name}: Invalid URL format`);
        skipped++;
        continue;
      }

      const spotifyId = playlistIdMatch[1];

      // Call our API to fetch playlist data
      const response = await fetch(`${API_BASE_URL}/api/spotify-web-api/playlist/${spotifyId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`   ❌ Failed to fetch ${playlist.name}: ${errorData.error}`);
        failed++;
        continue;
      }

      const { data: spotifyData } = await response.json();

      // Update the database
      const { error: updateError } = await supabase
        .from('playlists')
        .update({
          follower_count: spotifyData.followers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', playlist.id);

      if (updateError) {
        console.error(`   ❌ Failed to update ${playlist.name}: ${updateError.message}`);
        failed++;
        continue;
      }

      console.log(`   ✅ ${playlist.name} (${playlist.vendor?.name || 'No vendor'}): ${spotifyData.followers.toLocaleString()} followers`);
      updated++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      console.error(`   ❌ Error processing ${playlist.name}:`, error.message);
      failed++;
    }
  }

  console.log('\n================================================================================');
  console.log('📊 PLAYLIST ENRICHMENT SUMMARY');
  console.log('================================================================================');
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('================================================================================\n');
}

/**
 * Enrich track metadata (names, artists, genres)
 */
async function enrichTrackMetadata() {
  console.log('================================================================================');
  console.log('🎵 ENRICHING TRACK METADATA');
  console.log('================================================================================\n');

  // Fetch all tracks with URLs
  const { data: tracks, error } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign_group_id, url, artist_name')
    .not('url', 'is', null)
    .order('id');

  if (error) {
    console.error('❌ Error fetching tracks:', error.message);
    return;
  }

  console.log(`✅ Found ${tracks.length} tracks to enrich\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const track of tracks) {
    try {
      // Extract Spotify track ID from URL
      const trackIdMatch = track.url.match(/track\/([a-zA-Z0-9]+)/);
      if (!trackIdMatch) {
        console.log(`   ⏭️  Skipping track ${track.id}: Invalid URL format`);
        skipped++;
        continue;
      }

      const spotifyId = trackIdMatch[1];

      // Call our API to fetch track data
      const response = await fetch(`${API_BASE_URL}/api/spotify-web-api/track/${spotifyId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`   ❌ Failed to fetch track ${track.id}: ${errorData.error}`);
        failed++;
        continue;
      }

      const { data: spotifyData } = await response.json();

      // Update the database with track and artist data
      const { error: updateError } = await supabase
        .from('spotify_campaigns')
        .update({
          artist_name: spotifyData.artists.map(a => a.name).join(', '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', track.id);

      if (updateError) {
        console.error(`   ❌ Failed to update track ${track.id}: ${updateError.message}`);
        failed++;
        continue;
      }

      // Also update the campaign_group with genre information if we have it
      if (spotifyData.genres && spotifyData.genres.length > 0 && track.campaign_group_id) {
        const { error: groupUpdateError } = await supabase
          .from('campaign_groups')
          .update({
            // Store genres in notes for now (or create a dedicated column later)
            notes: `Genres: ${spotifyData.genres.join(', ')}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', track.campaign_group_id)
          .is('notes', null); // Only update if notes is empty
        
        if (groupUpdateError) {
          console.warn(`   ⚠️  Could not update genres for campaign group ${track.campaign_group_id}`);
        }
      }

      console.log(`   ✅ ${spotifyData.name} by ${spotifyData.artists.map(a => a.name).join(', ')} | Genres: ${spotifyData.genres.join(', ') || 'None'}`);
      updated++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      console.error(`   ❌ Error processing track ${track.id}:`, error.message);
      failed++;
    }
  }

  console.log('\n================================================================================');
  console.log('📊 TRACK ENRICHMENT SUMMARY');
  console.log('================================================================================');
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('================================================================================\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Starting Spotify Metadata Enrichment...\n');
  console.log(`📍 API URL: ${API_BASE_URL}`);
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  switch (command) {
    case 'playlists':
      await enrichPlaylistFollowers();
      break;
    case 'tracks':
      await enrichTrackMetadata();
      break;
    case 'all':
      await enrichPlaylistFollowers();
      await enrichTrackMetadata();
      break;
    default:
      console.log('Usage: node scripts/enrich-spotify-metadata.js [playlists|tracks|all]');
      process.exit(1);
  }

  console.log('✨ Enrichment complete!');
  process.exit(0);
}

main();

