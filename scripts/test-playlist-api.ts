/**
 * Test Spotify Playlist API
 * 
 * Quick script to test fetching a single playlist's metadata
 * 
 * Usage:
 *   npx tsx scripts/test-playlist-api.ts <playlist_url_or_id>
 * 
 * Examples:
 *   npx tsx scripts/test-playlist-api.ts 3zOnEjdz7EFZaibEDHhT72
 *   npx tsx scripts/test-playlist-api.ts "https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72"
 */

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

    console.log('🔑 Requesting access token from Spotify...');

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
      const errorText = await response.text();
      throw new Error(`Spotify authentication failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);

    console.log('✅ Access token obtained\n');
    return this.accessToken;
  }

  async getPlaylist(playlistId: string) {
    const token = await this.getAccessToken();
    
    console.log(`📡 Fetching playlist data from Spotify API...`);
    console.log(`   Playlist ID: ${playlistId}\n`);

    const response = await fetch(`${this.baseUrl}/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch playlist: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  static extractSpotifyId(input: string): string {
    // If it's already just an ID
    if (/^[a-zA-Z0-9]{22}$/.test(input)) {
      return input;
    }

    // Extract from URL
    const patterns = [
      /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /playlist\/([a-zA-Z0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    throw new Error(`Could not extract Spotify ID from: ${input}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Error: Please provide a playlist URL or ID\n');
    console.log('Usage:');
    console.log('  npx tsx scripts/test-playlist-api.ts <playlist_url_or_id>\n');
    console.log('Examples:');
    console.log('  npx tsx scripts/test-playlist-api.ts 3zOnEjdz7EFZaibEDHhT72');
    console.log('  npx tsx scripts/test-playlist-api.ts "https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72"\n');
    process.exit(1);
  }

  const input = args[0];

  console.log('\n' + '='.repeat(60));
  console.log('🎵 Spotify Playlist API Test');
  console.log('='.repeat(60) + '\n');

  // Initialize client
  const clientId = process.env.SPOTIFY_CLIENT_ID || '294f0422469444b5b4b0178ce438b5b8';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '7320687e4ceb475b82c2f3a543eb2f9e';
  
  console.log(`📝 Using credentials:`);
  console.log(`   Client ID: ${clientId.substring(0, 10)}...`);
  console.log(`   Client Secret: ${clientSecret.substring(0, 10)}...\n`);

  const client = new SpotifyWebAPIClient(clientId, clientSecret);

  try {
    // Extract playlist ID
    const playlistId = SpotifyWebAPIClient.extractSpotifyId(input);
    
    // Fetch playlist data
    const playlist = await client.getPlaylist(playlistId);

    // Display results
    console.log('✅ Successfully fetched playlist data!\n');
    console.log('='.repeat(60));
    console.log('📊 PLAYLIST INFORMATION');
    console.log('='.repeat(60));
    console.log(`🎵 Name:        ${playlist.name}`);
    console.log(`👥 Followers:   ${playlist.followers?.total?.toLocaleString() || 'N/A'}`);
    console.log(`📀 Tracks:      ${playlist.tracks?.total?.toLocaleString() || 'N/A'}`);
    console.log(`👤 Owner:       ${playlist.owner?.display_name || 'Unknown'}`);
    console.log(`🆔 Spotify ID:  ${playlist.id}`);
    console.log(`🌐 URL:         ${playlist.external_urls?.spotify || 'N/A'}`);
    console.log(`📝 Public:      ${playlist.public ? 'Yes' : 'No'}`);
    console.log(`🤝 Collaborative: ${playlist.collaborative ? 'Yes' : 'No'}`);
    
    if (playlist.description) {
      console.log(`\n📄 Description:`);
      console.log(`   ${playlist.description}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 DATABASE READY DATA');
    console.log('='.repeat(60));
    console.log('SQL INSERT statement for playlists table:\n');
    console.log(`INSERT INTO playlists (`);
    console.log(`  name, url, spotify_id, follower_count, track_count,`);
    console.log(`  description, owner_name, last_enriched_at`);
    console.log(`) VALUES (`);
    console.log(`  '${playlist.name.replace(/'/g, "''")}',`);
    console.log(`  '${playlist.external_urls?.spotify}',`);
    console.log(`  '${playlist.id}',`);
    console.log(`  ${playlist.followers?.total || 0},`);
    console.log(`  ${playlist.tracks?.total || 0},`);
    console.log(`  '${(playlist.description || '').replace(/'/g, "''")}',`);
    console.log(`  '${playlist.owner?.display_name || 'Unknown'}',`);
    console.log(`  NOW()`);
    console.log(`);`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR');
    console.error('='.repeat(60));
    console.error(`\n${error.message}\n`);
    
    if (error.message.includes('authentication failed')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Verify your SPOTIFY_CLIENT_ID environment variable');
      console.error('   2. Verify your SPOTIFY_CLIENT_SECRET environment variable');
      console.error('   3. Check if credentials are valid on Spotify Developer Dashboard\n');
    } else if (error.message.includes('Could not extract')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure you provided a valid Spotify playlist URL or ID');
      console.error('   2. Valid formats:');
      console.error('      - https://open.spotify.com/playlist/3zOnEjdz7EFZaibEDHhT72');
      console.error('      - 3zOnEjdz7EFZaibEDHhT72\n');
    }

    process.exit(1);
  }
}

main();

