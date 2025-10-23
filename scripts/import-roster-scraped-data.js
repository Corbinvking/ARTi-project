#!/usr/bin/env node
/**
 * Import Roster Scraped Data
 * 
 * This script:
 * 1. Reads all roster_*.json files from spotify_scraper/data/
 * 2. Extracts track IDs from filenames
 * 3. Finds matching campaigns by spotify_track_id
 * 4. Updates campaigns with algorithmic playlist data
 * 5. Creates/updates playlist records
 * 6. Links playlists to campaigns via campaign_playlists
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Extract Spotify track ID from filename
 * roster_79qGgXL1tVI7DFFRzRJmty_20251023_180807.json -> 79qGgXL1tVI7DFFRzRJmty
 */
function extractTrackIdFromFilename(filename) {
  const match = filename.match(/^roster_([a-zA-Z0-9]+)_\d+_\d+\.json$/);
  return match ? match[1] : null;
}

/**
 * Read all roster JSON files from spotify_scraper/data/
 */
async function readRosterDataFiles() {
  const dataDir = path.join(__dirname, '..', 'spotify_scraper', 'data');
  
  try {
    const files = await fs.readdir(dataDir);
    const rosterFiles = files.filter(f => f.startsWith('roster_') && f.endsWith('.json'));
    
    console.log(`📁 Found ${rosterFiles.length} roster data files`);
    
    const dataFiles = [];
    
    for (const file of rosterFiles) {
      const trackId = extractTrackIdFromFilename(file);
      if (!trackId) {
        console.log(`   ⚠️  Could not extract track ID from: ${file}`);
        continue;
      }
      
      const filePath = path.join(dataDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      dataFiles.push({
        filename: file,
        trackId,
        data
      });
    }
    
    return dataFiles;
  } catch (error) {
    console.error(`❌ Error reading data directory: ${error.message}`);
    return [];
  }
}

/**
 * Extract track ID from Spotify URL
 * https://open.spotify.com/track/79qGgXL1tVI7DFFRzRJmty -> 79qGgXL1tVI7DFFRzRJmty
 */
function extractTrackIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Find campaign by Spotify track ID
 * Searches both 'url' and 'sfa' columns for the track ID
 */
async function findCampaignByTrackId(trackId) {
  // Get all campaigns
  const { data: campaigns, error } = await supabase
    .from('spotify_campaigns')
    .select('*');
  
  if (error) {
    console.error(`   ❌ Error finding campaign: ${error.message}`);
    return null;
  }
  
  // Find campaign where url or sfa contains the track ID
  const campaign = campaigns.find(c => {
    const urlTrackId = extractTrackIdFromUrl(c.url);
    const sfaTrackId = extractTrackIdFromUrl(c.sfa);
    return urlTrackId === trackId || sfaTrackId === trackId;
  });
  
  return campaign || null;
}

/**
 * Create or update playlist record
 * Since we don't have Spotify playlist IDs from the roster scraper,
 * we'll use name + curator as the unique identifier
 */
async function upsertPlaylist(playlistData) {
  // First, try to find existing playlist by name and curator
  const { data: existing, error: findError } = await supabase
    .from('playlists')
    .select('*')
    .eq('name', playlistData.name)
    .eq('curator', playlistData.curator)
    .maybeSingle();
  
  if (findError && findError.code !== 'PGRST116') {
    console.error(`   ❌ Error finding playlist: ${findError.message}`);
    return null;
  }
  
  if (existing) {
    // Update existing playlist
    const { data, error } = await supabase
      .from('playlists')
      .update({
        is_algorithmic: playlistData.is_algorithmic,
        last_updated: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error updating playlist: ${error.message}`);
      return null;
    }
    
    return data;
  } else {
    // Create new playlist (without spotify_playlist_id)
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name: playlistData.name,
        curator: playlistData.curator,
        is_algorithmic: playlistData.is_algorithmic,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error creating playlist: ${error.message}`);
      return null;
    }
    
    return data;
  }
}

/**
 * Link playlist to campaign
 */
async function linkPlaylistToCampaign(campaignId, playlistId, streamData) {
  // Check if link already exists
  const { data: existing } = await supabase
    .from('campaign_playlists')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('playlist_id', playlistId)
    .maybeSingle();
  
  if (existing) {
    // Update existing link with new stream data
    const { error } = await supabase
      .from('campaign_playlists')
      .update({
        streams_28day: streamData.streams_28day,
        streams_7day: streamData.streams_7day,
        streams_lifetime: streamData.streams_lifetime,
        last_updated: new Date().toISOString()
      })
      .eq('id', existing.id);
    
    if (error) {
      console.error(`   ❌ Error updating campaign_playlist: ${error.message}`);
      return false;
    }
    
    return true;
  }
  
  // Create new link
  const { error } = await supabase
    .from('campaign_playlists')
    .insert({
      campaign_id: campaignId,
      playlist_id: playlistId,
      streams_28day: streamData.streams_28day,
      streams_7day: streamData.streams_7day,
      streams_lifetime: streamData.streams_lifetime,
      last_updated: new Date().toISOString()
    });
  
  if (error) {
    console.error(`   ❌ Error creating campaign_playlist: ${error.message}`);
    return false;
  }
  
  return true;
}

/**
 * Process a single scraped data file
 */
async function processDataFile(fileData) {
  const { filename, trackId, data } = fileData;
  
  console.log(`\n🎵 Processing: ${filename}`);
  console.log(`   Track ID: ${trackId}`);
  
  // Find matching campaign
  const campaign = await findCampaignByTrackId(trackId);
  
  if (!campaign) {
    console.log(`   ⚠️  No campaign found with spotify_track_id: ${trackId}`);
    return {
      success: false,
      reason: 'no_campaign'
    };
  }
  
  console.log(`   ✅ Found campaign: ${campaign.campaign_name || campaign.id}`);
  
  // Process playlists from the scraped data
  let playlistsProcessed = 0;
  let playlistsFailed = 0;
  
  // The scraped data has playlists organized by time range
  // Structure: data.time_ranges[timeRange].stats.playlists
  // Extract all unique playlists across all time ranges
  const allPlaylists = new Map(); // playlist_name -> playlist data
  
  if (!data.time_ranges) {
    console.log(`   ⚠️  No time_ranges data found`);
    return {
      success: true,
      playlistsProcessed: 0,
      playlistsFailed: 0
    };
  }
  
  for (const timeRange of ['28day', '7day', '12months']) {
    if (!data.time_ranges[timeRange] || 
        !data.time_ranges[timeRange].stats || 
        !data.time_ranges[timeRange].stats.playlists) {
      continue;
    }
    
    const playlists = data.time_ranges[timeRange].stats.playlists;
    
    for (const playlist of playlists) {
      if (!playlist.name) {
        continue;
      }
      
      // Parse streams (remove commas: "4,456" -> 4456)
      const streams = parseInt(playlist.streams?.replace(/,/g, '') || '0');
      
      // Determine if it's algorithmic
      const curator = playlist.made_by || 'Unknown';
      const isAlgorithmic = 
        playlist.name?.toLowerCase().includes('discover weekly') ||
        playlist.name?.toLowerCase().includes('radio') ||
        playlist.name?.toLowerCase().includes('daily mix') ||
        playlist.name?.toLowerCase().includes('daylist') ||
        playlist.name?.toLowerCase().includes('smart shuffle') ||
        playlist.name?.toLowerCase().includes('release radar') ||
        curator?.toLowerCase() === 'spotify';
      
      // Use playlist name + curator as unique key (since we don't have playlist IDs)
      const playlistKey = `${playlist.name}|${curator}`;
      
      if (!allPlaylists.has(playlistKey)) {
        allPlaylists.set(playlistKey, {
          name: playlist.name,
          curator: curator,
          is_algorithmic: isAlgorithmic,
          date_added: playlist.date_added,
          streams: {}
        });
      }
      
      // Store stream data for this time range
      allPlaylists.get(playlistKey).streams[timeRange] = streams;
    }
  }
  
  console.log(`   📊 Found ${allPlaylists.size} unique playlists`);
  
  // Process each playlist - directly create/update campaign_playlists records
  for (const [playlistKey, playlistData] of allPlaylists) {
    try {
      // Check if this campaign-playlist link already exists
      const { data: existing, error: findError } = await supabase
        .from('campaign_playlists')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('playlist_name', playlistData.name)
        .eq('playlist_curator', playlistData.curator)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        console.error(`   ❌ Error finding campaign_playlist: ${findError.message}`);
        playlistsFailed++;
        continue;
      }
      
      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('campaign_playlists')
          .update({
            streams_28d: playlistData.streams['28day'] || 0,
            streams_7d: playlistData.streams['7day'] || 0,
            streams_12m: playlistData.streams['12months'] || 0,
            date_added: playlistData.date_added,
            last_scraped: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error(`   ❌ Error updating campaign_playlist: ${updateError.message}`);
          playlistsFailed++;
          continue;
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('campaign_playlists')
          .insert({
            campaign_id: campaign.id,
            playlist_name: playlistData.name,
            playlist_curator: playlistData.curator,
            streams_28d: playlistData.streams['28day'] || 0,
            streams_7d: playlistData.streams['7day'] || 0,
            streams_12m: playlistData.streams['12months'] || 0,
            date_added: playlistData.date_added,
            last_scraped: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`   ❌ Error creating campaign_playlist: ${insertError.message}`);
          playlistsFailed++;
          continue;
        }
      }
      
      playlistsProcessed++;
    } catch (error) {
      console.error(`   ❌ Error processing playlist ${playlistKey}: ${error.message}`);
      playlistsFailed++;
    }
  }
  
  console.log(`   ✅ Processed ${playlistsProcessed} playlists`);
  if (playlistsFailed > 0) {
    console.log(`   ⚠️  Failed ${playlistsFailed} playlists`);
  }
  
  return {
    success: true,
    playlistsProcessed,
    playlistsFailed
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('🚀 ROSTER SCRAPED DATA IMPORT');
  console.log('================================================================================\n');
  
  // Read all data files
  const dataFiles = await readRosterDataFiles();
  
  if (dataFiles.length === 0) {
    console.log('❌ No data files found to process');
    return;
  }
  
  console.log(`\n📋 Processing ${dataFiles.length} data files...\n`);
  
  let campaignsUpdated = 0;
  let campaignsNotFound = 0;
  let totalPlaylistsProcessed = 0;
  let totalPlaylistsFailed = 0;
  
  for (const fileData of dataFiles) {
    const result = await processDataFile(fileData);
    
    if (result.success) {
      campaignsUpdated++;
      totalPlaylistsProcessed += result.playlistsProcessed || 0;
      totalPlaylistsFailed += result.playlistsFailed || 0;
    } else if (result.reason === 'no_campaign') {
      campaignsNotFound++;
    }
  }
  
  console.log('\n================================================================================');
  console.log('📊 IMPORT SUMMARY');
  console.log('================================================================================');
  console.log(`\n✅ Data files processed: ${dataFiles.length}`);
  console.log(`✅ Campaigns updated: ${campaignsUpdated}`);
  console.log(`⚠️  Campaigns not found: ${campaignsNotFound}`);
  console.log(`\n✅ Playlists processed: ${totalPlaylistsProcessed}`);
  if (totalPlaylistsFailed > 0) {
    console.log(`❌ Playlists failed: ${totalPlaylistsFailed}`);
  }
  console.log('\n🎉 Import completed!\n');
}

main().catch(console.error);

