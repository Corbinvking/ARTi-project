#!/usr/bin/env node

/**
 * Enhanced CSV Playlist Import
 * Extracts playlist data from the "Playlists" column in CSV
 * and creates campaign_playlists records
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const defaultOrgId = '00000000-0000-0000-0000-000000000001';

// Read and parse CSV
function loadCSV() {
  let content = fs.readFileSync('Spotify Playlisting-Active Campaigns.csv', 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true
  });
}

// Extract playlist names from the Playlists column
function extractPlaylistNames(playlistsText) {
  if (!playlistsText) return [];
  
  const lines = playlistsText.split('\n').map(l => l.trim()).filter(l => l);
  const playlists = [];
  
  for (const line of lines) {
    // Skip if it's a URL
    if (line.startsWith('http')) continue;
    
    // Remove leading dash
    let name = line.replace(/^-\s*/, '').trim();
    
    // Skip empty
    if (!name) continue;
    
    // Remove [NEW] suffix
    name = name.replace(/\s*\[NEW\]\s*$/i, '').trim();
    
    playlists.push(name);
  }
  
  return playlists;
}

async function importPlaylists() {
  console.log('🎵 Enhanced CSV Playlist Import\n');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const records = loadCSV();
  console.log(`Total CSV rows: ${records.length}\n`);
  
  // Get all vendors for mapping
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name');
  
  const vendorMap = {};
  vendors?.forEach(v => {
    vendorMap[v.name.toLowerCase()] = v.id;
  });
  
  console.log(`✅ Loaded ${vendors?.length} vendors\n`);
  
  const stats = {
    campaignsProcessed: 0,
    campaignsSkipped: 0,
    playlistsCreated: 0,
    playlistsSkipped: 0,
    errors: []
  };
  
  for (const row of records) {
    const campaignName = row.Campaign?.trim();
    if (!campaignName) continue;
    
    // Skip if no playlist data
    if (!row.Playlists || !row.Playlists.trim()) {
      continue;
    }
    
    // Find campaign in database
    const { data: campaignGroup } = await supabase
      .from('campaign_groups')
      .select('id, name')
      .ilike('name', campaignName)
      .single();
    
    if (!campaignGroup) {
      console.log(`⚠️  Campaign not found: ${campaignName}`);
      stats.campaignsSkipped++;
      continue;
    }
    
    // Get songs for this campaign
    const { data: songs } = await supabase
      .from('spotify_campaigns')
      .select('id')
      .eq('campaign_group_id', campaignGroup.id);
    
    if (!songs || songs.length === 0) {
      console.log(`⚠️  No songs found for: ${campaignName}`);
      stats.campaignsSkipped++;
      continue;
    }
    
    // Use first song as the campaign_id
    const campaignId = songs[0].id;
    
    // Get vendor ID
    const vendorName = row.Vendor?.trim().toLowerCase();
    const vendorId = vendorName ? vendorMap[vendorName] : null;
    
    if (!vendorId && vendorName) {
      console.log(`⚠️  Vendor not found: ${row.Vendor} for ${campaignName}`);
    }
    
    // Extract playlist names
    const playlistNames = extractPlaylistNames(row.Playlists);
    
    if (playlistNames.length === 0) {
      continue;
    }
    
    console.log(`\n📀 ${campaignName}`);
    console.log(`   Songs: ${songs.length}`);
    console.log(`   Vendor: ${row.Vendor || 'None'}`);
    console.log(`   Playlists: ${playlistNames.length}`);
    
    // Parse stream data
    const daily = parseInt(row.Daily) || 0;
    const weekly = parseInt(row.Weekly) || 0;
    const streams28d = weekly * 4; // Estimate monthly from weekly
    
    // Create playlist records
    let createdCount = 0;
    for (const playlistName of playlistNames) {
      // Check if playlist already exists
      const { data: existing } = await supabase
        .from('campaign_playlists')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('playlist_name', playlistName)
        .maybeSingle();
      
      if (existing) {
        stats.playlistsSkipped++;
        continue;
      }
      
      // Create new playlist record
      const { error } = await supabase
        .from('campaign_playlists')
        .insert({
          campaign_id: campaignId,
          vendor_id: vendorId,
          playlist_name: playlistName,
          streams_28d: streams28d,
          org_id: defaultOrgId,
          is_algorithmic: false,
          date_added: row['Start Date'] ? new Date(row['Start Date']).toISOString() : new Date().toISOString()
        });
      
      if (error) {
        console.log(`   ❌ Error creating "${playlistName}": ${error.message}`);
        stats.errors.push({ campaign: campaignName, playlist: playlistName, error: error.message });
      } else {
        createdCount++;
        stats.playlistsCreated++;
      }
    }
    
    console.log(`   ✅ Created ${createdCount} playlists`);
    stats.campaignsProcessed++;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Campaigns processed:     ${stats.campaignsProcessed}`);
  console.log(`Campaigns skipped:       ${stats.campaignsSkipped}`);
  console.log(`Playlists created:       ${stats.playlistsCreated}`);
  console.log(`Playlists skipped:       ${stats.playlistsSkipped} (already exist)`);
  console.log(`Errors:                  ${stats.errors.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (stats.errors.length > 0) {
    console.log('⚠️  Errors encountered:');
    stats.errors.slice(0, 10).forEach(e => {
      console.log(`   - ${e.campaign} / ${e.playlist}: ${e.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`);
    }
  }
}

importPlaylists().catch(console.error);

