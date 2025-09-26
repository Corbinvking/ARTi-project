#!/usr/bin/env node

/**
 * Spotify Scraper Data Viewer
 * 
 * This script provides a command-line interface to view and query
 * the structured scraper data in various useful ways
 */

const { createClient } = require('@supabase/supabase-js');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function viewScraperData() {
  console.log('📊 Spotify Scraper Data Viewer\n');
  console.log('Available views:');
  console.log('  1. 📋 Job Summary');
  console.log('  2. 🎵 Song Performance');
  console.log('  3. 🎶 Top Playlists');
  console.log('  4. 📈 Stream Analytics');
  console.log('  5. 🔍 Custom Queries');
  console.log('  6. 📊 All Views\n');

  try {
    // Check connection
    const { data: testData, error: testError } = await supabase
      .from('scraping_jobs')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }

    console.log('✅ Connected to local Supabase\n');

    // Show all views
    await showJobSummary();
    await showSongPerformance();
    await showTopPlaylists();
    await showStreamAnalytics();
    await showCustomQueries();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function showJobSummary() {
  console.log('📋 JOB SUMMARY');
  console.log('='.repeat(50));
  
  const { data: jobs, error } = await supabase
    .from('job_summary')
    .select('*')
    .order('scraped_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching jobs:', error.message);
    return;
  }

  if (jobs.length === 0) {
    console.log('⚠️  No scraping jobs found');
    return;
  }

  console.log(`\n📊 Found ${jobs.length} scraping jobs:\n`);

  jobs.forEach((job, index) => {
    console.log(`${index + 1}. Song ID: ${job.song_id}`);
    console.log(`   📊 Total Playlists: ${job.total_playlists.toLocaleString()}`);
    console.log(`   📈 Total Streams: ${job.total_streams.toLocaleString()}`);
    console.log(`   🏷️  Performance: ${job.performance_category}`);
    console.log(`   📅 Time Ranges: ${job.time_ranges.join(', ')}`);
    console.log(`   📅 Scraped: ${new Date(job.scraped_at).toLocaleString()}`);
    console.log('');
  });
}

async function showSongPerformance() {
  console.log('\n🎵 SONG PERFORMANCE');
  console.log('='.repeat(50));
  
  const { data: performance, error } = await supabase
    .from('song_performance_summary')
    .select('*')
    .order('time_range, total_streams', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error fetching performance:', error.message);
    return;
  }

  if (performance.length === 0) {
    console.log('⚠️  No performance data found');
    return;
  }

  console.log(`\n📊 Song performance across time ranges:\n`);

  // Group by time range
  const byTimeRange = performance.reduce((acc, item) => {
    if (!acc[item.time_range]) acc[item.time_range] = [];
    acc[item.time_range].push(item);
    return acc;
  }, {});

  Object.entries(byTimeRange).forEach(([timeRange, songs]) => {
    console.log(`📅 ${timeRange.toUpperCase()} Performance:`);
    songs.slice(0, 5).forEach((song, index) => {
      console.log(`   ${index + 1}. Song ID: ${song.song_id}`);
      console.log(`      📊 Streams: ${song.total_streams.toLocaleString()}`);
      console.log(`      🎶 Playlists: ${song.total_playlists.toLocaleString()}`);
      console.log(`      🏆 Stream Rank: #${song.stream_rank}`);
      console.log('');
    });
  });
}

async function showTopPlaylists() {
  console.log('\n🎶 TOP PLAYLISTS');
  console.log('='.repeat(50));
  
  const { data: playlists, error } = await supabase
    .from('top_playlists_summary')
    .select('*')
    .order('time_range, streams', { ascending: false })
    .limit(15);

  if (error) {
    console.error('❌ Error fetching playlists:', error.message);
    return;
  }

  if (playlists.length === 0) {
    console.log('⚠️  No playlist data found');
    return;
  }

  console.log(`\n🎵 Top playlists by streams:\n`);

  // Group by time range
  const byTimeRange = playlists.reduce((acc, item) => {
    if (!acc[item.time_range]) acc[item.time_range] = [];
    acc[item.time_range].push(item);
    return acc;
  }, {});

  Object.entries(byTimeRange).forEach(([timeRange, playlists]) => {
    console.log(`📅 ${timeRange.toUpperCase()} Top Playlists:`);
    playlists.slice(0, 5).forEach((playlist, index) => {
      console.log(`   ${index + 1}. ${playlist.playlist_name}`);
      console.log(`      📊 Streams: ${playlist.streams.toLocaleString()}`);
      console.log(`      👤 Made by: ${playlist.made_by}`);
      console.log(`      🏆 Global Rank: #${playlist.global_rank}`);
      console.log(`      📅 Song ID: ${playlist.song_id}`);
      console.log('');
    });
  });
}

async function showStreamAnalytics() {
  console.log('\n📈 STREAM ANALYTICS');
  console.log('='.repeat(50));
  
  // Get total streams by time range
  const { data: streamTotals, error: streamError } = await supabase
    .from('scraped_songs')
    .select('time_range, total_streams, total_playlists')
    .order('time_range');

  if (streamError) {
    console.error('❌ Error fetching stream analytics:', streamError.message);
    return;
  }

  if (streamTotals.length === 0) {
    console.log('⚠️  No stream analytics found');
    return;
  }

  console.log(`\n📊 Stream analytics by time range:\n`);

  // Aggregate by time range
  const analytics = streamTotals.reduce((acc, item) => {
    if (!acc[item.time_range]) {
      acc[item.time_range] = {
        total_streams: 0,
        total_playlists: 0,
        song_count: 0
      };
    }
    acc[item.time_range].total_streams += item.total_streams;
    acc[item.time_range].total_playlists += item.total_playlists;
    acc[item.time_range].song_count += 1;
    return acc;
  }, {});

  Object.entries(analytics).forEach(([timeRange, data]) => {
    console.log(`📅 ${timeRange.toUpperCase()}:`);
    console.log(`   📊 Total Streams: ${data.total_streams.toLocaleString()}`);
    console.log(`   🎶 Total Playlists: ${data.total_playlists.toLocaleString()}`);
    console.log(`   🎵 Songs: ${data.song_count}`);
    console.log(`   📈 Avg Streams per Song: ${Math.round(data.total_streams / data.song_count).toLocaleString()}`);
    console.log(`   📈 Avg Playlists per Song: ${Math.round(data.total_playlists / data.song_count).toLocaleString()}`);
    console.log('');
  });
}

async function showCustomQueries() {
  console.log('\n🔍 CUSTOM QUERIES');
  console.log('='.repeat(50));
  
  console.log('\n📋 Useful SQL queries you can run in Supabase Studio:\n');

  const queries = [
    {
      title: "Top 10 Songs by Total Streams",
      query: `SELECT song_id, SUM(total_streams) as total_streams
              FROM scraped_songs 
              GROUP BY song_id 
              ORDER BY total_streams DESC 
              LIMIT 10;`
    },
    {
      title: "Most Popular Playlists",
      query: `SELECT playlist_name, made_by, SUM(streams) as total_streams
              FROM scraped_playlists 
              GROUP BY playlist_name, made_by 
              ORDER BY total_streams DESC 
              LIMIT 10;`
    },
    {
      title: "Songs with Most Playlist Placements",
      query: `SELECT song_id, COUNT(*) as playlist_count
              FROM scraped_playlists 
              GROUP BY song_id 
              ORDER BY playlist_count DESC 
              LIMIT 10;`
    },
    {
      title: "Performance by Time Range",
      query: `SELECT time_range, 
                     COUNT(*) as song_count,
                     SUM(total_streams) as total_streams,
                     AVG(total_streams) as avg_streams
              FROM scraped_songs 
              GROUP BY time_range 
              ORDER BY time_range;`
    },
    {
      title: "Recent Scraping Activity",
      query: `SELECT song_id, scraped_at, total_playlists, total_streams
              FROM scraping_jobs 
              ORDER BY scraped_at DESC 
              LIMIT 10;`
    }
  ];

  queries.forEach((query, index) => {
    console.log(`${index + 1}. ${query.title}`);
    console.log(`   SQL: ${query.query}`);
    console.log('');
  });

  console.log('💡 Access Supabase Studio at: http://localhost:54323');
  console.log('💡 Use the SQL Editor to run these queries');
}

// Run the viewer
viewScraperData().catch(console.error);
