#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function isAlgorithmicPlaylist(name) {
  const algoKeywords = [
    'discover weekly',
    'release radar',
    'daily mix',
    'your dj',
    'radio',
    'daylist',
    'smart shuffle',
    'blend',
    'time capsule',
    'repeat rewind',
    'on repeat',
    'spotify official'
  ];
  
  const lowerName = name.toLowerCase();
  return algoKeywords.some(keyword => lowerName.includes(keyword));
}

async function verify() {
  console.log('🔍 Verifying Scraped Data Import...\n');
  
  const scrapedDir = path.join('spotify_scraper', 'data');
  const files = fs.readdirSync(scrapedDir)
    .filter(f => f.startsWith('song_') && f.endsWith('.json'))
    .sort();
  
  console.log(`Found ${files.length} scraped song files\n`);
  
  const trackIds = new Set();
  files.forEach(f => {
    const match = f.match(/song_([a-zA-Z0-9]+)_/);
    if (match) trackIds.add(match[1]);
  });
  
  console.log(`Unique track IDs: ${trackIds.size}\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const stats = {
    tracksProcessed: 0,
    tracksInDB: 0,
    tracksNotInDB: 0,
    algorithmic: 0,
    vendor: 0,
    algoInDB: 0,
    algoMissing: 0
  };
  
  for (const trackId of trackIds) {
    stats.tracksProcessed++;
    
    // Find the most recent file for this track
    const trackFiles = files.filter(f => f.includes(trackId));
    const latestFile = trackFiles[trackFiles.length - 1];
    
    const filePath = path.join(scrapedDir, latestFile);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Extract playlists
    const allPlaylists = [];
    for (const timeRange in data.time_ranges || {}) {
      const rangeData = data.time_ranges[timeRange];
      const playlistsData = rangeData.stats?.playlists || rangeData.playlists || [];
      
      for (const playlist of playlistsData) {
        const name = playlist.name || playlist.playlist_name;
        if (!name) continue;
        
        const isAlgo = isAlgorithmicPlaylist(name);
        allPlaylists.push({ name, isAlgo });
        
        if (isAlgo) stats.algorithmic++;
        else stats.vendor++;
      }
    }
    
    // Check if track is in DB
    const { data: campaigns } = await supabase
      .from('spotify_campaigns')
      .select('id, campaign, campaign_groups(name, artist_name)')
      .eq('url', `https://open.spotify.com/track/${trackId}`)
      .limit(1);
    
    if (!campaigns || campaigns.length === 0) {
      console.log(`❌ Track ${trackId} NOT in database`);
      console.log(`   File: ${latestFile}`);
      console.log(`   Playlists in file: ${allPlaylists.length}`);
      console.log('');
      stats.tracksNotInDB++;
      continue;
    }
    
    stats.tracksInDB++;
    const campaign = campaigns[0];
    const campaignGroup = campaign.campaign_groups;
    
    // Check how many of these playlists are in DB
    const { data: dbPlaylists } = await supabase
      .from('campaign_playlists')
      .select('playlist_name, is_algorithmic')
      .eq('campaign_id', campaign.id);
    
    const algoInFile = allPlaylists.filter(p => p.isAlgo);
    const algoInDBCount = dbPlaylists?.filter(p => p.is_algorithmic).length || 0;
    
    if (algoInFile.length > 0) {
      if (algoInDBCount > 0) {
        console.log(`✅ ${campaignGroup?.name || campaign.campaign}`);
        console.log(`   Artist: ${campaignGroup?.artist_name || 'Unknown'}`);
        console.log(`   Track ID: ${trackId}`);
        console.log(`   🟢 Algorithmic: ${algoInDBCount}/${algoInFile.length} in DB`);
        console.log(`   🔴 Vendor: ${dbPlaylists?.filter(p => !p.is_algorithmic).length || 0} in DB`);
        console.log('');
        stats.algoInDB++;
      } else {
        console.log(`⚠️  ${campaignGroup?.name || campaign.campaign}`);
        console.log(`   Artist: ${campaignGroup?.artist_name || 'Unknown'}`);
        console.log(`   Track ID: ${trackId}`);
        console.log(`   🟡 Has ${algoInFile.length} algorithmic playlists in file but NONE in DB!`);
        console.log(`   🔴 Vendor: ${dbPlaylists?.filter(p => !p.is_algorithmic).length || 0} in DB`);
        console.log('');
        stats.algoMissing++;
      }
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Tracks in scraped files:        ${stats.tracksProcessed}`);
  console.log(`  ✅ Found in database:         ${stats.tracksInDB}`);
  console.log(`  ❌ NOT in database:           ${stats.tracksNotInDB}`);
  console.log('');
  console.log(`Tracks with algorithmic data:`);
  console.log(`  ✅ Algorithmic data in DB:    ${stats.algoInDB}`);
  console.log(`  ⚠️  Missing algorithmic data: ${stats.algoMissing}`);
  console.log('');
  console.log(`Total playlists in scraped files:`);
  console.log(`  🟢 Algorithmic playlists:     ${stats.algorithmic}`);
  console.log(`  🔴 Vendor playlists:          ${stats.vendor}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (stats.algoMissing > 0) {
    console.log('🎯 ACTION NEEDED:');
    console.log(`   ${stats.algoMissing} tracks have algorithmic playlist data in scraped files`);
    console.log(`   but it was NOT imported to the database!`);
    console.log('');
    console.log('   Run: node scripts/populate-playlist-vendor-data-v2.js');
    console.log('   This will import ALL algorithmic playlists from scraped files.\n');
  }
}

verify().catch(console.error);

