#!/usr/bin/env node

/**
 * Complete workflow to scrape S4A list and import to database
 * 1. Runs Python scraper against s4alist.md
 * 2. Processes scraped JSON files
 * 3. Creates/updates clients, campaigns, and playlists
 */

const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runScraper() {
  return new Promise((resolve, reject) => {
    console.log('🎵 Running Spotify Scraper...\n');
    console.log('=' * 70);
    console.log('⚠️  IMPORTANT LOGIN INFORMATION:');
    console.log('=' * 70);
    console.log('📌 A browser window will open automatically');
    console.log('📌 You will have 60 SECONDS to log in if not already logged in');
    console.log('📌 Once logged in, the session persists - no need to log in again');
    console.log('📌 The scraper will process all 16 songs (~20-30 minutes total)');
    console.log('=' * 70);
    console.log('\n🚀 Starting browser...\n');
    
    const scraperPath = path.join(__dirname, '..', 'spotify_scraper');
    const pythonPath = path.join(scraperPath, 'venv', 'Scripts', 'python.exe');
    const scriptPath = path.join(scraperPath, 'run_s4a_list.py');
    
    const scraper = spawn(pythonPath, [scriptPath], {
      cwd: scraperPath,
      stdio: 'inherit'
    });
    
    scraper.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Scraping completed successfully!\n');
        resolve();
      } else {
        console.log(`\n⚠️  Scraper exited with code ${code}`);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Scraper exited with code ${code}`));
        }
      }
    });
    
    scraper.on('error', (err) => {
      reject(err);
    });
  });
}

async function importScrapedData() {
  console.log('📊 Importing scraped data to database...\n');
  
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

  const defaultOrgId = defaultOrg?.id;

  // Read scraped files
  const scrapedDir = path.join(__dirname, '..', 'spotify_scraper', 'data');
  const files = fs.readdirSync(scrapedDir)
    .filter(f => f.startsWith('song_') && f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first

  console.log(`📁 Found ${files.length} scraped JSON files\n`);

  const stats = {
    filesProcessed: 0,
    clientsCreated: 0,
    campaignsCreated: 0,
    campaignsUpdated: 0,
    playlistsCreated: 0,
    playlistsUpdated: 0,
    errors: 0
  };

  // Parse s4alist.md to get artist names
  const s4aList = parseS4AList();

  for (const file of files) {
    try {
      const filePath = path.join(scrapedDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Skip if file is empty or invalid
      if (!fileContent || fileContent.trim() === '') {
        console.log(`⏭️  Skipping empty file: ${file}`);
        continue;
      }

      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (e) {
        console.log(`❌ Invalid JSON in ${file}: ${e.message}`);
        stats.errors++;
        continue;
      }

      // Extract track ID from filename
      const trackIdMatch = file.match(/song_([a-zA-Z0-9]+)_/);
      if (!trackIdMatch) {
        console.log(`⏭️  Skipping ${file} - no track ID found`);
        continue;
      }

      const trackId = trackIdMatch[1];
      const trackUrl = data.url || `https://open.spotify.com/track/${trackId}`;

      // Get song info from first time range
      const firstRange = Object.keys(data.time_ranges || {})[0];
      if (!firstRange) {
        console.log(`⏭️  Skipping ${file} - no time range data`);
        continue;
      }

      const songStats = data.time_ranges[firstRange].stats;
      const songTitle = songStats.title || songStats.song_title || 'Unknown';
      
      // Try to get artist name from s4alist.md mapping or from stats
      const artistName = s4aList[trackId] || songStats.artist || songStats.artist_name || 'Unknown Artist';

      console.log(`\n🎵 Processing: ${artistName} - ${songTitle}`);
      console.log(`   Track ID: ${trackId}`);

      // Find or create client
      let client = await findOrCreateClient(supabase, artistName, defaultOrgId);
      if (!client) {
        console.log(`   ❌ Failed to create/find client`);
        stats.errors++;
        continue;
      }
      
      if (client.created) {
        stats.clientsCreated++;
        console.log(`   ✅ Created new client: ${artistName}`);
      } else {
        console.log(`   ✓ Found existing client: ${artistName}`);
      }

      // Find or create campaign
      const { campaign, isNew } = await findOrCreateCampaign(
        supabase,
        client.id,
        artistName,
        songTitle,
        trackUrl,
        data.url,
        defaultOrgId
      );

      if (!campaign) {
        console.log(`   ❌ Failed to create/find campaign`);
        stats.errors++;
        continue;
      }

      if (isNew) {
        stats.campaignsCreated++;
        console.log(`   ✅ Created new campaign`);
      } else {
        stats.campaignsUpdated++;
        console.log(`   ✓ Found existing campaign`);
      }

      // Process playlists
      const playlists = extractPlaylists(data);
      console.log(`   📊 Found ${playlists.length} playlists`);

      for (const playlist of playlists) {
        try {
          const result = await upsertPlaylist(supabase, campaign.id, playlist, defaultOrgId);
          if (result.created) {
            stats.playlistsCreated++;
          } else {
            stats.playlistsUpdated++;
          }
        } catch (error) {
          console.log(`   ❌ Error upserting playlist "${playlist.name}": ${error.message}`);
          stats.errors++;
        }
      }

      stats.filesProcessed++;

    } catch (error) {
      console.log(`❌ Error processing ${file}: ${error.message}`);
      stats.errors++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`📁 Files processed: ${stats.filesProcessed}`);
  console.log(`👤 Clients created: ${stats.clientsCreated}`);
  console.log(`📋 Campaigns created: ${stats.campaignsCreated}`);
  console.log(`📋 Campaigns updated: ${stats.campaignsUpdated}`);
  console.log(`🎵 Playlists created: ${stats.playlistsCreated}`);
  console.log(`🎵 Playlists updated: ${stats.playlistsUpdated}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log('='.repeat(70));
}

function parseS4AList() {
  const s4aPath = path.join(__dirname, '..', 's4alist.md');
  if (!fs.existsSync(s4aPath)) {
    return {};
  }

  const content = fs.readFileSync(s4aPath, 'utf-8');
  const lines = content.split('\n');
  const artistMap = {};
  let currentArtist = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-')) {
      currentArtist = trimmed.substring(1).trim();
    } else if (trimmed.startsWith('https://artists.spotify.com') && currentArtist) {
      const trackMatch = trimmed.match(/\/song\/([a-zA-Z0-9]+)\//);
      if (trackMatch) {
        artistMap[trackMatch[1]] = currentArtist;
      }
    }
  }

  return artistMap;
}

async function findOrCreateClient(supabase, artistName, orgId) {
  // Try to find existing client
  const { data: existing } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', artistName)
    .single();

  if (existing) {
    return { ...existing, created: false };
  }

  // Create new client
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name: artistName,
      org_id: orgId
    })
    .select()
    .single();

  if (error) {
    console.error(`Error creating client: ${error.message}`);
    return null;
  }

  return { ...newClient, created: true };
}

async function findOrCreateCampaign(supabase, clientId, artistName, songTitle, trackUrl, sfaUrl, orgId) {
  const campaignName = `${artistName} - ${songTitle}`;

  // Try to find existing campaign by URL or name
  const { data: existing } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, url, sfa')
    .or(`url.eq.${trackUrl},campaign.eq.${campaignName}`)
    .single();

  if (existing) {
    // Update SFA link if missing
    if (sfaUrl && !existing.sfa) {
      await supabase
        .from('spotify_campaigns')
        .update({ sfa: sfaUrl })
        .eq('id', existing.id);
    }
    return { campaign: existing, isNew: false };
  }

  // Create new campaign (as spotify_campaign, not campaign_group)
  const { data: newCampaign, error } = await supabase
    .from('spotify_campaigns')
    .insert({
      client_id: clientId,
      campaign: campaignName,
      url: trackUrl,
      sfa: sfaUrl,
      goal: '0',
      remaining: '0',
      sale_price: '0',
      daily: '0',
      weekly: '0',
      status: 'Active',
      source: 'S4A Scraper',
      campaign_type: 'Stream Boost'
    })
    .select()
    .single();

  if (error) {
    console.error(`Error creating campaign: ${error.message}`);
    return { campaign: null, isNew: false };
  }

  return { campaign: newCampaign, isNew: true };
}

function extractPlaylists(scrapedData) {
  const playlists = [];
  
  for (const [timeRange, rangeData] of Object.entries(scrapedData.time_ranges || {})) {
    // Playlists are in stats.playlists, not rangeData.playlists
    const playlistsData = rangeData.stats?.playlists || rangeData.playlists || [];
    
    for (const playlist of playlistsData) {
      const name = playlist.name || playlist.playlist_name;
      if (!name) continue;

      // Check if already added
      if (playlists.some(p => p.name === name)) continue;

      // Parse streams (remove commas if present)
      let streams = 0;
      if (playlist.streams) {
        const streamsStr = playlist.streams.toString().replace(/,/g, '');
        streams = parseInt(streamsStr) || 0;
      }

      playlists.push({
        name: name,
        curator: playlist.made_by || playlist.curator || null,
        streams: streams,
        dateAdded: playlist.date_added || playlist.added_at || null,
        isAlgorithmic: isAlgorithmicPlaylist(name)
      });
    }
  }

  return playlists;
}

function isAlgorithmicPlaylist(name) {
  const algorithmicKeywords = [
    'discover weekly',
    'release radar',
    'daily mix',
    'radio',
    'your dj',
    'daylist',
    'smart shuffle'
  ];
  
  const lowerName = name.toLowerCase();
  return algorithmicKeywords.some(keyword => lowerName.includes(keyword));
}

async function upsertPlaylist(supabase, campaignId, playlist, orgId) {
  // Check if playlist already exists
  const { data: existing } = await supabase
    .from('campaign_playlists')
    .select('id, streams_28d')
    .eq('campaign_id', campaignId)
    .eq('playlist_name', playlist.name)
    .single();

  if (existing) {
    // Update if streams changed
    if (existing.streams_28d !== playlist.streams) {
      await supabase
        .from('campaign_playlists')
        .update({
          streams_28d: playlist.streams,
          playlist_curator: playlist.curator,
          date_added: playlist.dateAdded,
          last_scraped: new Date().toISOString()
        })
        .eq('id', existing.id);
    }
    return { created: false };
  }

  // Create new playlist
  const { error } = await supabase
    .from('campaign_playlists')
    .insert({
      campaign_id: campaignId,
      playlist_name: playlist.name,
      playlist_curator: playlist.curator,
      streams_28d: playlist.streams,
      date_added: playlist.dateAdded,
      is_algorithmic: playlist.isAlgorithmic,
      org_id: orgId
    });

  if (error) {
    throw error;
  }

  return { created: true };
}

async function main() {
  try {
    console.log('🚀 S4A List Scraper & Import Workflow\n');
    console.log('This will:');
    console.log('  1. Scrape all songs from s4alist.md');
    console.log('  2. Import playlist data to database');
    console.log('  3. Create clients/campaigns as needed\n');
    console.log('='.repeat(70) + '\n');

    // Step 1: Run scraper
    await runScraper();

    // Step 2: Import data
    await importScrapedData();

    console.log('\n🎉 Complete! All data has been scraped and imported.');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

