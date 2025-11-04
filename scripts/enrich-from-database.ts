/**
 * Enrich Playlists from Database
 * 
 * This script:
 * 1. Reads campaigns directly from the database (not CSV)
 * 2. Extracts playlist URLs from the playlist_links column
 * 3. Fetches metadata from Spotify Web API
 * 4. Updates the database with enriched data
 * 
 * Usage: npx tsx scripts/enrich-from-database.ts
 */

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

    console.log('✅ Spotify access token obtained\n');
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
          // Remove query parameters
          return match[1].split('?')[0];
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

async function main() {
  console.log('🚀 Starting playlist enrichment from database...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  console.log(`🔗 Connecting to: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Initialize Spotify client
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || '294f0422469444b5b4b0178ce438b5b8';
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || '7320687e4ceb475b82c2f3a543eb2f9e';
  const spotifyClient = new SpotifyWebAPIClient(spotifyClientId, spotifyClientSecret);

  // Fetch campaigns from database
  console.log('📊 Fetching campaigns from database...\n');
  
  const { data: campaigns, error: fetchError } = await supabase
    .from('spotify_campaigns')
    .select('id, campaign, vendor, playlist_links, vendor_id')
    .not('playlist_links', 'is', null)
    .neq('playlist_links', '');

  if (fetchError) {
    throw new Error(`Failed to fetch campaigns: ${fetchError.message}`);
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('⚠️  No campaigns with playlist links found in database\n');
    console.log('Make sure you ran the import script first:\n');
    console.log('  bash scripts/simple-import.sh\n');
    return;
  }

  console.log(`✅ Found ${campaigns.length} campaigns with playlist data\n`);

  const results = {
    campaignsProcessed: 0,
    playlistsEnriched: 0,
    playlistsLinked: 0,
    failed: 0,
    errors: [] as { campaign: string; url: string; error: string }[],
  };

  for (const campaign of campaigns) {
    const campaignName = campaign.campaign || 'Unknown';
    const playlistLinks = campaign.playlist_links || '';
    
    if (!playlistLinks) continue;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📌 Campaign: ${campaignName}`);
    console.log(`🆔 ID: ${campaign.id}`);

    // Extract playlist URLs
    const urls = playlistLinks
      .split(/[\n\t]/)
      .map((u: string) => u.trim())
      .filter((u: string) => u.includes('spotify.com/playlist'));

    console.log(`🎵 Found ${urls.length} playlist URL(s)`);

    results.campaignsProcessed++;

    for (const url of urls) {
      try {
        const playlistId = SpotifyWebAPIClient.extractSpotifyId(url);
        
        if (!playlistId) {
          console.log(`  ⏭️  Skipping invalid URL: ${url.substring(0, 50)}...`);
          continue;
        }

        console.log(`\n  Processing: ${playlistId}`);

        // Fetch from Spotify API
        const spotifyData = await spotifyClient.getPlaylist(playlistId);
        
        console.log(`    ✅ ${spotifyData.name}`);
        console.log(`    👥 ${spotifyData.followers?.total?.toLocaleString() || 0} followers`);

        // Check if playlist exists
        const { data: existingPlaylist } = await supabase
          .from('playlists')
          .select('id')
          .eq('url', url)
          .single();

        if (existingPlaylist) {
          // Update existing
          await supabase
            .from('playlists')
            .update({
              name: spotifyData.name,
              follower_count: spotifyData.followers?.total || 0,
              spotify_id: playlistId,
              description: spotifyData.description || '',
              owner_name: spotifyData.owner?.display_name || '',
              track_count: spotifyData.tracks?.total || 0,
              last_enriched_at: new Date().toISOString(),
            })
            .eq('id', existingPlaylist.id);

          results.playlistsEnriched++;
          console.log(`    🔄 Updated playlist`);
        } else {
          // Create new playlist
          const { data: newPlaylist } = await supabase
            .from('playlists')
            .insert({
              name: spotifyData.name,
              url: url,
              vendor_id: campaign.vendor_id,
              follower_count: spotifyData.followers?.total || 0,
              spotify_id: playlistId,
              description: spotifyData.description || '',
              owner_name: spotifyData.owner?.display_name || '',
              track_count: spotifyData.tracks?.total || 0,
              genres: [],
              avg_daily_streams: 0,
              last_enriched_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          results.playlistsEnriched++;
          console.log(`    ➕ Created playlist`);
        }

        // Link to campaign
        const { data: existingLink } = await supabase
          .from('campaign_playlists')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('playlist_url', url)
          .single();

        if (!existingLink) {
          await supabase
            .from('campaign_playlists')
            .insert({
              campaign_id: campaign.id,
              playlist_name: spotifyData.name,
              playlist_curator: spotifyData.owner?.display_name || '',
              playlist_url: url,
              playlist_spotify_id: playlistId,
              playlist_follower_count: spotifyData.followers?.total || 0,
              vendor_id: campaign.vendor_id,
              streams_7d: 0,
              streams_28d: 0,
              streams_12m: 0,
            });

          results.playlistsLinked++;
          console.log(`    🔗 Linked to campaign`);
        }

        // Rate limiting
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
  console.log(`🔗 Campaign links created: ${results.playlistsLinked}`);
  console.log(`❌ Failed:                ${results.failed}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS (first 10):\n');
    results.errors.slice(0, 10).forEach(({ campaign, url, error }) => {
      console.log(`  Campaign: ${campaign}`);
      console.log(`  URL: ${url.substring(0, 60)}...`);
      console.log(`  Error: ${error}\n`);
    });
  }

  console.log('\n✅ Enrichment complete!');
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

