/**
 * Test Spotify Web API Integration
 * 
 * Tests the Spotify Web API endpoints to ensure proper authentication
 * and data retrieval before running the full enrichment script.
 */

// Use native fetch if available (Node 18+), otherwise use https
const fetch = globalThis.fetch || (async (url) => {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(data),
          text: async () => data,
        });
      });
    }).on('error', reject);
  });
});

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Sample Spotify IDs for testing
const TEST_PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M'; // Today's Top Hits
const TEST_TRACK_ID = '3n3Ppam7vgaVa1iaRUc9Lp'; // Mr. Brightside by The Killers

async function testPlaylistEndpoint() {
  console.log('================================================================================');
  console.log('🧪 Testing Playlist Endpoint');
  console.log('================================================================================\n');

  try {
    const response = await fetch(`${API_BASE_URL}/api/spotify-web-api/playlist/${TEST_PLAYLIST_ID}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Playlist endpoint failed:', error);
      return false;
    }

    const result = await response.json();
    
    console.log('✅ Playlist endpoint working!');
    console.log(`   Name: ${result.data.name}`);
    console.log(`   Followers: ${result.data.followers.toLocaleString()}`);
    console.log(`   Tracks: ${result.data.track_count}`);
    console.log(`   Owner: ${result.data.owner}\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing playlist endpoint:', error.message);
    return false;
  }
}

async function testTrackEndpoint() {
  console.log('================================================================================');
  console.log('🧪 Testing Track Endpoint');
  console.log('================================================================================\n');

  try {
    const response = await fetch(`${API_BASE_URL}/api/spotify-web-api/track/${TEST_TRACK_ID}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Track endpoint failed:', error);
      return false;
    }

    const result = await response.json();
    
    console.log('✅ Track endpoint working!');
    console.log(`   Name: ${result.data.name}`);
    console.log(`   Artists: ${result.data.artists.map(a => a.name).join(', ')}`);
    console.log(`   Album: ${result.data.album}`);
    console.log(`   Genres: ${result.data.genres.join(', ') || 'None'}`);
    console.log(`   Popularity: ${result.data.popularity}/100\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing track endpoint:', error.message);
    return false;
  }
}

async function testIdExtraction() {
  console.log('================================================================================');
  console.log('🧪 Testing ID Extraction');
  console.log('================================================================================\n');

  const testCases = [
    { url: 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp', type: 'track', expected: '3n3Ppam7vgaVa1iaRUc9Lp' },
    { url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', type: 'playlist', expected: '37i9dQZF1DXcBWIGoYBM5M' },
    { url: 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp', type: 'track', expected: '3n3Ppam7vgaVa1iaRUc9Lp' },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/spotify-web-api/extract-id?url=${encodeURIComponent(testCase.url)}&type=${testCase.type}`
      );
      
      if (!response.ok) {
        console.error(`❌ Failed to extract ID from ${testCase.url}`);
        allPassed = false;
        continue;
      }

      const result = await response.json();
      
      if (result.id === testCase.expected) {
        console.log(`✅ ${testCase.type}: ${testCase.url} → ${result.id}`);
      } else {
        console.error(`❌ ${testCase.type}: Expected ${testCase.expected}, got ${result.id}`);
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Error testing ${testCase.url}:`, error.message);
      allPassed = false;
    }
  }

  console.log();
  return allPassed;
}

async function main() {
  console.log('\n🚀 Spotify Web API Integration Test\n');
  console.log(`📍 Testing API at: ${API_BASE_URL}\n`);

  const results = {
    playlist: await testPlaylistEndpoint(),
    track: await testTrackEndpoint(),
    extraction: await testIdExtraction(),
  };

  console.log('================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  console.log(`Playlist Endpoint: ${results.playlist ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Track Endpoint: ${results.track ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`ID Extraction: ${results.extraction ? '✅ PASS' : '❌ FAIL'}`);
  console.log('================================================================================\n');

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('✨ All tests passed! Ready to run enrichment script.');
  } else {
    console.log('⚠️  Some tests failed. Please fix errors before running enrichment.');
    process.exit(1);
  }
}

main();

