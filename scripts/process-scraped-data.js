#!/usr/bin/env node

/**
 * Process scraped Spotify data and update database
 * Takes JSON output from spotify_scraper and updates campaign metrics
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Parse stream count from string (e.g., "11,204" -> 11204)
 */
function parseStreamCount(str) {
  if (!str || str === '—' || str === 'Not available') return 0;
  return parseInt(str.replace(/,/g, '')) || 0;
}

/**
 * Process a single scraped song file
 */
async function processScrapedSong(filePath, trackId) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Extract metrics from different time ranges
  const metrics = {
    track_id: trackId,
    scraped_at: data.scraped_at,
    
    // 7-day metrics
    plays_last_7d: data.time_ranges?.['7day']?.stats?.playlists?.[0]?.streams 
      ? parseStreamCount(data.time_ranges['7day'].stats.playlists.reduce((sum, p) => 
          sum + parseStreamCount(p.streams), 0))
      : 0,
    
    // 28-day metrics  
    plays_last_28d: data.time_ranges?.['28day']?.stats?.playlists?.[0]?.streams
      ? parseStreamCount(data.time_ranges['28day'].stats.playlists.reduce((sum, p) => 
          sum + parseStreamCount(p.streams), 0))
      : 0,
    
    // 12-month metrics
    plays_last_12m: data.time_ranges?.['12months']?.stats?.playlists?.[0]?.streams
      ? parseStreamCount(data.time_ranges['12months'].stats.playlists.reduce((sum, p) => 
          sum + parseStreamCount(p.streams), 0))
      : 0,
    
    // Playlist metrics
    playlist_count_7d: data.time_ranges?.['7day']?.stats?.playlist_stats?.total 
      ? parseInt(data.time_ranges['7day'].stats.playlist_stats.total.replace(/,/g, '')) 
      : 0,
    
    playlist_count_28d: data.time_ranges?.['28day']?.stats?.playlist_stats?.total
      ? parseInt(data.time_ranges['28day'].stats.playlist_stats.total.replace(/,/g, ''))
      : 0,
    
    playlist_count_12m: data.time_ranges?.['12months']?.stats?.playlist_stats?.total
      ? parseInt(data.time_ranges['12months'].stats.playlist_stats.total.replace(/,/g, ''))
      : 0,
    
    // Top playlists (from 28-day data)
    top_playlists: data.time_ranges?.['28day']?.stats?.playlists
      ?.slice(0, 10)
      .map(p => ({
        name: p.name,
        made_by: p.made_by,
        streams: parseStreamCount(p.streams),
        date_added: p.date_added
      })) || []
  };
  
  return metrics;
}

async function processAllScrapedData() {
  console.log('📊 Processing scraped Spotify data...\n');

  const scraperDataDir = path.join(__dirname, '../spotify_scraper/data');
  
  if (!fs.existsSync(scraperDataDir)) {
    console.error('❌ Spotify scraper data directory not found:', scraperDataDir);
    console.log('Run the scraper first: cd spotify_scraper && python run_multi_scraper_config.py');
    process.exit(1);
  }

  // Find all scraped JSON files
  const files = fs.readdirSync(scraperDataDir)
    .filter(f => f.startsWith('song_') && f.endsWith('.json'));

  console.log(`✅ Found ${files.length} scraped song files\n`);

  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const file of files) {
    try {
      // Extract track ID from filename: song_5cBGiXFf9S9RlAwQUv0g4g_20250926_133839.json
      const trackIdMatch = file.match(/song_([a-zA-Z0-9]+)_/);
      if (!trackIdMatch) {
        console.log(`⚠️  Skipping ${file} - couldn't extract track ID`);
        continue;
      }

      const trackId = trackIdMatch[1];
      const filePath = path.join(scraperDataDir, file);
      
      // Process the file
      const metrics = await processScrapedSong(filePath, trackId);
      
      console.log(`\n📈 ${metrics.track_id}:`);
      console.log(`   7d: ${metrics.plays_last_7d.toLocaleString()} streams across ${metrics.playlist_count_7d.toLocaleString()} playlists`);
      console.log(`   28d: ${metrics.plays_last_28d.toLocaleString()} streams across ${metrics.playlist_count_28d.toLocaleString()} playlists`);
      console.log(`   12m: ${metrics.plays_last_12m.toLocaleString()} streams across ${metrics.playlist_count_12m.toLocaleString()} playlists`);
      
      // Find matching campaign by track ID in URL
      const { data: matchingCampaigns } = await supabase
        .from('spotify_campaigns')
        .select('id, campaign, vendor, url')
        .ilike('url', `%${trackId}%`);

      if (!matchingCampaigns || matchingCampaigns.length === 0) {
        console.log(`   ⚠️  No matching campaign found in database`);
        continue;
      }

      console.log(`   ✅ Found ${matchingCampaigns.length} matching campaigns`);

      // Update each matching campaign
      for (const campaign of matchingCampaigns) {
        const { error: updateError } = await supabase
          .from('spotify_campaigns')
          .update({
            plays_last_7d: metrics.plays_last_7d,
            plays_last_3m: metrics.plays_last_28d, // Using 28d as proxy for 3m
            plays_last_12m: metrics.plays_last_12m,
            playlist_adds: metrics.playlist_count_28d,
            // Store top playlists in a new column if we want
            // top_playlists_data: metrics.top_playlists
          })
          .eq('id', campaign.id);

        if (updateError) {
          console.log(`   ❌ Error updating campaign ${campaign.id}:`, updateError.message);
          errors++;
        } else {
          console.log(`   ✅ Updated: ${campaign.campaign} (${campaign.vendor})`);
          updated++;
        }
      }

      processed++;

    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
      errors++;
    }
  }

  console.log(`\n\n🎉 Processing complete!`);
  console.log('─'.repeat(50));
  console.log(`   📁 Files processed: ${processed}`);
  console.log(`   ✅ Campaigns updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('─'.repeat(50));

  // Calculate vendor performance from updated data
  console.log('\n📊 Calculating vendor performance...');

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name');

  for (const vendor of vendors || []) {
    const { data: vendorCampaigns } = await supabase
      .from('spotify_campaigns')
      .select('plays_last_7d, plays_last_28d, goal')
      .eq('vendor_id', vendor.id)
      .not('plays_last_7d', 'is', null);

    if (vendorCampaigns && vendorCampaigns.length > 0) {
      const totalStreams7d = vendorCampaigns.reduce((sum, c) => sum + (c.plays_last_7d || 0), 0);
      const avgStreams7d = totalStreams7d / vendorCampaigns.length;
      
      console.log(`   ${vendor.name}: ${totalStreams7d.toLocaleString()} total streams (avg ${avgStreams7d.toFixed(0)}/campaign)`);
    }
  }
}

processAllScrapedData();

