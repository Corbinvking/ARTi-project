// Quick test script for YouTube Data API v3
require('dotenv').config();
const { google } = require('googleapis');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

async function testYouTubeAPI() {
  console.log('🎬 Testing YouTube Data API v3...\n');
  
  // Test with a popular video (Rick Astley - Never Gonna Give You Up)
  const testVideoId = 'dQw4w9WgXcQ';
  
  try {
    console.log(`📊 Fetching stats for video: ${testVideoId}`);
    
    const response = await youtube.videos.list({
      part: ['statistics', 'contentDetails', 'snippet'],
      id: [testVideoId]
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.error('❌ Video not found');
      return;
    }

    const video = response.data.items[0];
    const stats = video.statistics;

    console.log('\n✅ Success! API is working.\n');
    console.log('📹 Video Details:');
    console.log(`   Title: ${video.snippet?.title}`);
    console.log(`   Published: ${video.snippet?.publishedAt}`);
    console.log(`   Duration: ${video.contentDetails?.duration}`);
    console.log('\n📊 Statistics:');
    console.log(`   Views: ${parseInt(stats?.viewCount || '0').toLocaleString()}`);
    console.log(`   Likes: ${parseInt(stats?.likeCount || '0').toLocaleString()}`);
    console.log(`   Comments: ${parseInt(stats?.commentCount || '0').toLocaleString()}`);
    
    console.log('\n✅ YouTube Data API v3 is configured correctly!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('\n⚠️  API key issue. Please check:');
      console.error('   1. YOUTUBE_API_KEY is set in .env');
      console.error('   2. API key is valid');
      console.error('   3. YouTube Data API v3 is enabled in Google Cloud Console');
    } else if (error.message.includes('quota')) {
      console.error('\n⚠️  Quota exceeded. YouTube API has daily limits.');
    }
  }
}

testYouTubeAPI();

