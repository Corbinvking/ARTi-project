#!/usr/bin/env node

/**
 * Extract playlist data from scraped files and link to vendors
 * Version 2: Separates Spotify algorithmic playlists from vendor playlists
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Spotify algorithmic playlists that should be tracked separately
const SPOTIFY_ALGORITHMIC_PLAYLISTS = [
  'Discover Weekly',
  'Radio',
  'Release Radar',
  'Daylist',
  'Smart Shuffle',
  'Your DJ',
  'Mixes'
];

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
  ],
  'Majed': [
    'majed'
  ]
};

function isSpotifyAlgorithmicPlaylist(playlistName) {
  return SPOTIFY_ALGORITHMIC_PLAYLISTS.some(name => 
    playlistName.trim().toLowerCase() === name.toLowerCase()
  );
}

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
    console.log('🎵 Populating playlist-vendor data from scraped files (v2 - with Spotify playlists separation)...\n');

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
    
    if (files.length === 0) {
      console.log('❌ No scraped data files found');
      return;
    }

    console.log(`📁 Found ${files.length} scraped data files\n`);

    let regularPlaylistsProcessed = 0;
    let spotifyPlaylistsProcessed = 0;
    let playlistsUpdated = 0;
    let playlistsInserted = 0;
    let playlistsSkipped = 0;

    for (const file of files) {
      try {
        const filePath = path.join(scrapedDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

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
          console.log(`⚠️  Skipping ${file}: Could not extract track ID`);
          continue;
        }

        // Find campaign for this track
        const { data: campaigns, error: campaignsError } = await supabase
          .from('spotify_campaigns')
          .select('id, url, vendor, client_id')
          .or(`url.ilike.%${trackId}%,sfa.ilike.%${trackId}%`);

        if (campaignsError) {
          console.log(`❌ Error finding campaign for ${trackId}: ${campaignsError.message}`);
          continue;
        }

        if (!campaigns || campaigns.length === 0) {
          console.log(`⚠️  No campaign found for track ${trackId}`);
          continue;
        }

        const campaign = campaigns[0];
        const vendorId = campaign.vendor ? vendorMap[campaign.vendor] : null;

        // Process playlists from the 28-day time range
        const timeRange = data.time_ranges?.['28day'] || data.time_ranges?.[Object.keys(data.time_ranges)[0]];
        if (!timeRange || !timeRange.stats?.playlists) {
          console.log(`⚠️  No playlist data in ${file}`);
          continue;
        }

        const playlists = timeRange.stats.playlists;
        console.log(`\n📊 Processing ${playlists.length} playlists from ${file}...`);

        for (const playlist of playlists) {
          const playlistName = playlist.name?.trim();
          if (!playlistName) continue;

          const streams = parseStreamCount(playlist.streams);
          const madeBy = playlist.made_by?.trim() || null;
          const dateAdded = playlist.date_added === 'Not available' ? null : playlist.date_added;

          // Check if this is a Spotify algorithmic playlist
          const isSpotifyPlaylist = isSpotifyAlgorithmicPlaylist(playlistName);

          if (isSpotifyPlaylist) {
            // Insert into campaign_playlists with special vendor "Spotify Algorithmic"
            const { data: existing } = await supabase
              .from('campaign_playlists')
              .select('id')
              .eq('campaign_id', campaign.id)
              .eq('playlist_name', playlistName)
              .is('vendor_id', null)
              .single();

            let insertError = null;
            if (existing) {
              // Update existing
              const { error } = await supabase
                .from('campaign_playlists')
                .update({
                  playlist_curator: 'Spotify',
                  streams_28d: streams,
                  date_added: dateAdded,
                  last_scraped: new Date().toISOString(),
                  is_algorithmic: true
                })
                .eq('id', existing.id);
              insertError = error;
              if (!error) playlistsUpdated++;
            } else {
              // Insert new
              const { error } = await supabase
                .from('campaign_playlists')
                .insert({
                  campaign_id: campaign.id,
                  vendor_id: null, // No vendor for Spotify playlists
                  playlist_name: playlistName,
                  playlist_curator: 'Spotify',
                  streams_28d: streams,
                  date_added: dateAdded,
                  org_id: defaultOrgId,
                  is_algorithmic: true
                });
              insertError = error;
              if (!error) playlistsInserted++;
            }

            if (insertError) {
              console.log(`   ❌ Error inserting Spotify playlist "${playlistName}": ${insertError.message}`);
            } else {
              console.log(`   ✅ Processed Spotify playlist: ${playlistName} (${streams} streams)`);
              spotifyPlaylistsProcessed++;
            }
          } else {
            // Regular vendor playlist
            // Try to match vendor from playlist info or use campaign vendor
            const matchedVendor = matchVendor(playlistName, madeBy || '');
            const finalVendorId = matchedVendor ? vendorMap[matchedVendor] : vendorId;

            if (!finalVendorId) {
              console.log(`   ⚠️  Skipping "${playlistName}": No vendor found`);
              playlistsSkipped++;
              continue;
            }

            // Insert or update in campaign_playlists
            const { data: existing } = await supabase
              .from('campaign_playlists')
              .select('id')
              .eq('campaign_id', campaign.id)
              .eq('vendor_id', finalVendorId)
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
                  last_scraped: new Date().toISOString(),
                  is_algorithmic: false
                })
                .eq('id', existing.id);
              insertError = error;
              if (!error) playlistsUpdated++;
            } else {
              // Insert new
              const { error } = await supabase
                .from('campaign_playlists')
                .insert({
                  campaign_id: campaign.id,
                  vendor_id: finalVendorId,
                  playlist_name: playlistName,
                  playlist_curator: madeBy || null,
                  streams_28d: streams,
                  date_added: dateAdded,
                  org_id: defaultOrgId,
                  is_algorithmic: false
                });
              insertError = error;
              if (!error) playlistsInserted++;
            }

            if (insertError) {
              console.log(`   ❌ Error inserting "${playlistName}": ${insertError.message}`);
            } else {
              console.log(`   ✅ Processed: ${playlistName} (${streams} streams, Vendor: ${matchedVendor || campaign.vendor || 'Unknown'})`);
              regularPlaylistsProcessed++;
            }
          }
        }
      } catch (error) {
        console.log(`❌ Error processing ${file}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Regular vendor playlists processed: ${regularPlaylistsProcessed}`);
    console.log(`🎯 Spotify algorithmic playlists processed: ${spotifyPlaylistsProcessed}`);
    console.log(`📝 Playlists inserted: ${playlistsInserted}`);
    console.log(`🔄 Playlists updated: ${playlistsUpdated}`);
    console.log(`⚠️  Playlists skipped: ${playlistsSkipped}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populatePlaylistVendorData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { populatePlaylistVendorData };

