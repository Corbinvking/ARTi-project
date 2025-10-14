#!/usr/bin/env node

/**
 * Extract playlist data from scraped files and link to vendors
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Map of known playlist curators to vendors
const VENDOR_PLAYLIST_MAP = {
  'Club Restricted': [
    'club restricted',
    'clubrestricted',
    'cr_',
    'club-restricted'
  ],
  'Glenn': [
    'glenn',
    'glennplaylist'
  ],
  'Golden Nugget': [
    'golden nugget',
    'goldennugget'
  ],
  'House Views': [
    'house views',
    'houseviews'
  ],
  'Levianth': [
    'levianth'
  ],
  'Alekk': [
    'alekk'
  ],
  'Moon': [
    'moon',
    'moonplaylist'
  ]
};

function matchVendor(playlistName, madeBy) {
  const searchText = `${playlistName} ${madeBy}`.toLowerCase();
  
  for (const [vendorName, keywords] of Object.entries(VENDOR_PLAYLIST_MAP)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return vendorName;
      }
    }
  }
  
  return null;
}

function parseStreamCount(str) {
  if (!str || str === '—' || str === 'Not available') return 0;
  return parseInt(str.replace(/,/g, '')) || 0;
}

async function populatePlaylistVendorData() {
  try {
    console.log('🎵 Populating playlist-vendor data from scraped files...\n');

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
    
    // Get vendor IDs
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name');
    
    if (vendorsError) {
      throw new Error(`Failed to fetch vendors: ${vendorsError.message}`);
    }
    
    const vendorMap = {};
    vendors.forEach(v => {
      vendorMap[v.name] = v.id;
    });
    
    console.log(`✅ Found ${vendors.length} vendors\n`);

    // Read scraped data files
    const scrapedDir = path.join(process.cwd(), 'spotify_scraper', 'data');
    
    if (!fs.existsSync(scrapedDir)) {
      throw new Error(`Scraped data directory not found: ${scrapedDir}`);
    }

    const files = fs.readdirSync(scrapedDir)
      .filter(f => f.startsWith('song_') && f.endsWith('.json'));
    
    console.log(`📁 Found ${files.length} scraped files\n`);

    let totalPlaylists = 0;
    let matchedPlaylists = 0;
    let unmatchedPlaylists = 0;

    for (const file of files) {
      const filePath = path.join(scrapedDir, file);
      
      try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);
        
        // Extract track ID from URL or filename
        let trackId = null;
        if (data.url) {
          const urlMatch = data.url.match(/song\/([a-zA-Z0-9]+)\//);
          if (urlMatch) {
            trackId = urlMatch[1];
          }
        }
        if (!trackId) {
          const fileMatch = file.match(/song_([a-zA-Z0-9]+)_/);
          if (fileMatch) {
            trackId = fileMatch[1];
          }
        }
        if (!trackId) {
          console.log(`   ⚠️  Could not extract track ID from ${file}\n`);
          continue;
        }
        
        console.log(`🔍 Looking for track: ${trackId}`);
        
        // Find matching campaign
        const { data: campaigns, error: campaignError } = await supabase
          .from('spotify_campaigns')
          .select('id, campaign, vendor, url')
          .ilike('url', `%${trackId}%`);
        
        if (campaignError) {
          console.warn(`   ⚠️  Database error: ${campaignError.message}`);
          continue;
        }
        
        if (!campaigns || campaigns.length === 0) {
          console.log(`   ❌ No campaign found for track ${trackId}\n`);
          continue;
        }
        
        const campaign = campaigns[0];
        console.log(`   ✅ Found campaign: ${campaign.campaign} (${campaign.vendor})`);
        
        // Use the campaign's vendor directly
        const campaignVendorName = campaign.vendor?.trim();
        let vendorId = vendorMap[campaignVendorName];
        
        if (!vendorId) {
          console.log(`   ⚠️  Vendor "${campaignVendorName}" not found in database`);
          continue;
        }
        
        // Get playlists from 28-day data (most representative)
        const playlists = data.time_ranges?.['28day']?.stats?.playlists || [];
        
        console.log(`   📊 Processing ${playlists.length} playlists for ${campaignVendorName}`);
        
        for (const playlist of playlists.slice(0, 20)) { // Top 20 playlists
          totalPlaylists++;
          
          const playlistName = playlist.name || '';
          const madeBy = playlist.made_by || '';
          const streams = parseStreamCount(playlist.streams);
          const dateAdded = playlist.date_added || null;
          
          // Only store playlists with actual streams
          if (streams > 0) {
            matchedPlaylists++;
            
            // Insert into campaign_playlists (or update if exists)
            // First check if it exists
            const { data: existing } = await supabase
              .from('campaign_playlists')
              .select('id')
              .eq('campaign_id', campaign.id)
              .eq('vendor_id', vendorId)
              .eq('playlist_name', playlistName)
              .single();
            
            let insertError = null;
            if (existing) {
              // Update existing
              const { error } = await supabase
                .from('campaign_playlists')
                .update({
                  playlist_curator: madeBy || null,
                  streams_28d: streams,
                  date_added: dateAdded,
                  last_scraped: new Date().toISOString()
                })
                .eq('id', existing.id);
              insertError = error;
            } else {
              // Insert new
              const { error } = await supabase
                .from('campaign_playlists')
                .insert({
                  campaign_id: campaign.id,
                  vendor_id: vendorId,
                  playlist_name: playlistName,
                  playlist_curator: madeBy || null,
                  streams_28d: streams,
                  date_added: dateAdded,
                  org_id: defaultOrgId
                });
              insertError = error;
            }
            
            if (insertError) {
              console.warn(`      ⚠️  Error inserting "${playlistName}": ${insertError.message}`);
            }
          }
        }
        
        console.log(`   ✅ Added ${Math.min(playlists.length, 20)} playlists to ${campaignVendorName}\n`);
        
        console.log('');
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }

    console.log('\n🎉 Playlist-vendor data population complete!');
    console.log('──────────────────────────────────────────────────');
    console.log(`   📊 Total playlists processed: ${totalPlaylists}`);
    console.log(`   ✅ Matched to vendors: ${matchedPlaylists}`);
    console.log(`   ❓ Unmatched: ${unmatchedPlaylists}`);
    console.log('──────────────────────────────────────────────────');

    // Show vendor summary
    const { data: vendorStats } = await supabase
      .from('vendors')
      .select(`
        name,
        campaign_playlists(count)
      `);
    
    if (vendorStats) {
      console.log('\n📊 Playlists per Vendor:');
      console.log('──────────────────────────────────────────────────');
      vendorStats.forEach(v => {
        const count = v.campaign_playlists?.[0]?.count || 0;
        console.log(`   ${v.name.padEnd(20)} ${count} playlists`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populatePlaylistVendorData();

