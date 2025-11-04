/**
 * Enrich Campaign Playlists from CSV
 * 
 * This script:
 * 1. Reads the Active Campaigns CSV
 * 2. Extracts playlist URLs from the "SP Playlist Stuff" column
 * 3. Fetches metadata from Spotify Web API (followers, description, owner, etc.)
 * 4. Links playlists to campaigns in the campaign_playlists table
 * 5. Updates or creates entries in the playlists table
 * 
 * Usage: npx tsx scripts/enrich-campaign-playlists.ts
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// Spotify Web API Client
class SpotifyWebAPIClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl = 'https://api.spotify.com/v1';

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    console.log('🔑 Requesting new Spotify access token...');

    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);

    console.log('✅ Spotify access token obtained');
    return this.accessToken;
  }

  async getPlaylist(playlistId: string) {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist ${playlistId}: ${response.status}`);
    }

    return await response.json();
  }

  static extractSpotifyId(url: string): string | null {
    try {
      const patterns = [
        /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
        /playlist\/([a-zA-Z0-9]+)/,
        /^([a-zA-Z0-9]{22})$/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

interface CampaignPlaylistData {
  campaignName: string;
  campaignId?: number;
  url: string;
  playlistId: string;
  name?: string;
  followers?: number;
  description?: string;
  owner?: string;
  trackCount?: number;
  vendorName?: string;
}

async function main() {
  console.log('🚀 Starting campaign-playlist enrichment from CSV...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Initialize Spotify client
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || '294f0422469444b5b4b0178ce438b5b8';
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || '7320687e4ceb475b82c2f3a543eb2f9e';
  const spotifyClient = new SpotifyWebAPIClient(spotifyClientId, spotifyClientSecret);

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'Spotify Playlisting-Active Campaigns (1).csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  console.log(`📄 Reading CSV from: ${csvPath}\n`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Found ${records.length} campaigns in CSV\n`);

  // Process each campaign
  const results = {
    campaignsProcessed: 0,
    playlistsEnriched: 0,
    playlistsLinked: 0,
    playlistsCreated: 0,
    failed: 0,
    errors: [] as { campaign: string; url: string; error: string }[],
  };

  for (const record of records) {
    const campaignName = record['Campaign'];
    const vendorName = record['Vendor'] || null;
    const playlistStuff = record['SP Playlist Stuff'] || '';
    
    if (!playlistStuff) continue;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📌 Campaign: ${campaignName}`);
    console.log(`🏢 Vendor: ${vendorName || 'None'}`);

    // Find campaign in database
    const { data: campaign } = await supabase
      .from('spotify_campaigns')
      .select('id, campaign, vendor_id')
      .eq('campaign', campaignName)
      .single();

    if (!campaign) {
      console.log(`⚠️  Campaign not found in database, skipping...\n`);
      continue;
    }

    results.campaignsProcessed++;

    // Extract playlist URLs
    const urls = playlistStuff
      .split(/[\n\t]/)
      .map((u: string) => u.trim())
      .filter((u: string) => u.includes('spotify.com/playlist'));

    console.log(`🎵 Found ${urls.length} playlist(s) for this campaign`);

    for (const url of urls) {
      try {
        const playlistId = SpotifyWebAPIClient.extractSpotifyId(url);
        
        if (!playlistId) {
          console.log(`  ⏭️  Skipping invalid URL: ${url}`);
          continue;
        }

        console.log(`\n  Processing playlist: ${playlistId}`);

        // Fetch from Spotify API
        const spotifyData = await spotifyClient.getPlaylist(playlistId);
        
        const playlistData = {
          name: spotifyData.name,
          followers: spotifyData.followers?.total || 0,
          description: spotifyData.description || '',
          owner: spotifyData.owner?.display_name || 'Unknown',
          trackCount: spotifyData.tracks?.total || 0,
        };

        console.log(`    ✅ ${playlistData.name}`);
        console.log(`    👥 ${playlistData.followers.toLocaleString()} followers`);
        console.log(`    📀 ${playlistData.trackCount} tracks`);

        // Check if playlist exists in playlists table
        const { data: existingPlaylist } = await supabase
          .from('playlists')
          .select('id, vendor_id')
          .eq('url', url)
          .single();

        let playlistDbId: string;

        if (existingPlaylist) {
          // Update existing playlist
          const { error: updateError } = await supabase
            .from('playlists')
            .update({
              name: playlistData.name,
              follower_count: playlistData.followers,
              spotify_id: playlistId,
              description: playlistData.description,
              owner_name: playlistData.owner,
              track_count: playlistData.trackCount,
              last_enriched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingPlaylist.id);

          if (updateError) throw updateError;

          playlistDbId = existingPlaylist.id;
          results.playlistsEnriched++;
          console.log(`    🔄 Updated existing playlist`);
        } else {
          // Create new playlist entry
          // First, try to find or create vendor
          let vendorId = campaign.vendor_id;

          if (!vendorId && vendorName) {
            // Try to find vendor by name
            const { data: vendor } = await supabase
              .from('vendors')
              .select('id')
              .eq('name', vendorName)
              .single();

            if (vendor) {
              vendorId = vendor.id;
            } else {
              // Create new vendor
              const { data: newVendor, error: vendorError } = await supabase
                .from('vendors')
                .insert({
                  name: vendorName,
                  max_daily_streams: 0,
                })
                .select('id')
                .single();

              if (!vendorError && newVendor) {
                vendorId = newVendor.id;
                console.log(`    ➕ Created new vendor: ${vendorName}`);
              }
            }
          }

          // Create playlist
          const { data: newPlaylist, error: createError } = await supabase
            .from('playlists')
            .insert({
              name: playlistData.name,
              url: url,
              vendor_id: vendorId,
              follower_count: playlistData.followers,
              spotify_id: playlistId,
              description: playlistData.description,
              owner_name: playlistData.owner,
              track_count: playlistData.trackCount,
              genres: [],
              avg_daily_streams: 0,
              last_enriched_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (createError) throw createError;

          playlistDbId = newPlaylist.id;
          results.playlistsCreated++;
          console.log(`    ➕ Created new playlist entry`);
        }

        // Link to campaign via campaign_playlists
        const { data: existingLink } = await supabase
          .from('campaign_playlists')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('playlist_url', url)
          .single();

        if (!existingLink) {
          const { error: linkError } = await supabase
            .from('campaign_playlists')
            .insert({
              campaign_id: campaign.id,
              playlist_name: playlistData.name,
              playlist_curator: playlistData.owner,
              playlist_url: url,
              playlist_spotify_id: playlistId,
              playlist_follower_count: playlistData.followers,
              playlist_description: playlistData.description,
              playlist_owner: playlistData.owner,
              playlist_track_count: playlistData.trackCount,
              vendor_id: campaign.vendor_id,
              streams_7d: 0,
              streams_28d: 0,
              streams_12m: 0,
            });

          if (linkError) {
            console.log(`    ⚠️  Could not link to campaign: ${linkError.message}`);
          } else {
            results.playlistsLinked++;
            console.log(`    🔗 Linked to campaign`);
          }
        } else {
          // Update existing link with metadata
          const { error: updateLinkError } = await supabase
            .from('campaign_playlists')
            .update({
              playlist_follower_count: playlistData.followers,
              playlist_description: playlistData.description,
              playlist_owner: playlistData.owner,
              playlist_track_count: playlistData.trackCount,
              playlist_spotify_id: playlistId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingLink.id);

          if (!updateLinkError) {
            console.log(`    🔄 Updated existing campaign link`);
          }
        }

        // Rate limiting: 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`    ❌ Error: ${error.message}`);
        results.failed++;
        results.errors.push({
          campaign: campaignName,
          url,
          error: error.message,
        });
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 ENRICHMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`📋 Campaigns processed:   ${results.campaignsProcessed}`);
  console.log(`🎵 Playlists enriched:    ${results.playlistsEnriched}`);
  console.log(`➕ Playlists created:     ${results.playlistsCreated}`);
  console.log(`🔗 Campaign links created: ${results.playlistsLinked}`);
  console.log(`❌ Failed:                ${results.failed}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    results.errors.slice(0, 10).forEach(({ campaign, url, error }) => {
      console.log(`  Campaign: ${campaign}`);
      console.log(`  URL: ${url}`);
      console.log(`  Error: ${error}\n`);
    });
    if (results.errors.length > 10) {
      console.log(`  ... and ${results.errors.length - 10} more errors`);
    }
  }

  console.log('\n✅ Enrichment complete!');
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

