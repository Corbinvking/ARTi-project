/**
 * Enrich Playlists from CSV
 * 
 * This script:
 * 1. Reads the Active Campaigns CSV
 * 2. Extracts playlist URLs from the "SP Playlist Stuff" column
 * 3. Fetches follower counts and metadata from Spotify Web API
 * 4. Populates the playlists and campaign_playlists tables
 * 
 * Usage: npx tsx scripts/enrich-playlists-from-csv.ts
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

interface PlaylistData {
  campaign: string;
  campaignId?: number;
  url: string;
  playlistId: string;
  name?: string;
  followers?: number;
  description?: string;
  owner?: string;
  trackCount?: number;
}

async function main() {
  console.log('🚀 Starting playlist enrichment from CSV...\n');

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

  // Extract all playlist URLs
  const playlistsToProcess: PlaylistData[] = [];
  const playlistUrlSet = new Set<string>();

  for (const record of records) {
    const campaign = record['Campaign'];
    const playlistStuff = record['SP Playlist Stuff'] || '';
    
    if (!playlistStuff) continue;

    // Split by newlines and tabs to handle multi-line playlist columns
    const urls = playlistStuff
      .split(/[\n\t]/)
      .map((u: string) => u.trim())
      .filter((u: string) => u.includes('spotify.com/playlist'));

    for (const url of urls) {
      const playlistId = SpotifyWebAPIClient.extractSpotifyId(url);
      
      if (playlistId && !playlistUrlSet.has(url)) {
        playlistUrlSet.add(url);
        playlistsToProcess.push({
          campaign,
          url,
          playlistId,
        });
      }
    }
  }

  console.log(`🎵 Found ${playlistsToProcess.length} unique playlists to process\n`);

  // Process playlists
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as { campaign: string; url: string; error: string }[],
  };

  for (let i = 0; i < playlistsToProcess.length; i++) {
    const playlist = playlistsToProcess[i];
    
    try {
      console.log(`[${i + 1}/${playlistsToProcess.length}] Processing: ${playlist.campaign}`);
      console.log(`  Playlist ID: ${playlist.playlistId}`);

      // Fetch playlist data from Spotify
      const spotifyData = await spotifyClient.getPlaylist(playlist.playlistId);
      
      playlist.name = spotifyData.name;
      playlist.followers = spotifyData.followers?.total || 0;
      playlist.description = spotifyData.description || '';
      playlist.owner = spotifyData.owner?.display_name || 'Unknown';
      playlist.trackCount = spotifyData.tracks?.total || 0;

      console.log(`  ✅ Name: ${playlist.name}`);
      console.log(`  👥 Followers: ${playlist.followers.toLocaleString()}`);
      console.log(`  📀 Tracks: ${playlist.trackCount}`);

      // Check if playlist already exists in database
      const { data: existingPlaylist } = await supabase
        .from('playlists')
        .select('id, follower_count')
        .eq('url', playlist.url)
        .single();

      if (existingPlaylist) {
        // Update existing playlist
        const { error: updateError } = await supabase
          .from('playlists')
          .update({
            name: playlist.name,
            follower_count: playlist.followers,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPlaylist.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`  🔄 Updated existing playlist (follower count: ${existingPlaylist.follower_count} → ${playlist.followers})\n`);
      } else {
        console.log(`  ℹ️  Playlist not in database yet - will be added when campaign is linked\n`);
        results.skipped++;
        continue;
      }

      results.success++;

      // Rate limiting: 1 request per 200ms (well within Spotify's limits)
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}\n`);
      results.failed++;
      results.errors.push({
        campaign: playlist.campaign,
        url: playlist.url,
        error: error.message,
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 ENRICHMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully enriched: ${results.success}`);
  console.log(`⏭️  Skipped (not in DB):   ${results.skipped}`);
  console.log(`❌ Failed:                ${results.failed}`);
  console.log(`📊 Total processed:       ${playlistsToProcess.length}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    results.errors.forEach(({ campaign, url, error }) => {
      console.log(`  Campaign: ${campaign}`);
      console.log(`  URL: ${url}`);
      console.log(`  Error: ${error}\n`);
    });
  }

  // Export enriched data to JSON for reference
  const outputPath = path.join(process.cwd(), 'enriched-playlists.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      playlistsToProcess.filter(p => p.followers !== undefined),
      null,
      2
    )
  );
  console.log(`\n💾 Enriched data saved to: ${outputPath}`);
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

