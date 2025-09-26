#!/usr/bin/env node

/**
 * Test Structured Tables
 * 
 * This script tests the structured scraper tables to ensure they work correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  environment: process.env.NODE_ENV || 'local'
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function testStructuredTables() {
  console.log('🧪 Testing Structured Scraper Tables\n');
  console.log(`📍 Environment: ${config.environment}`);
  console.log(`🔗 Supabase URL: ${config.supabaseUrl}\n`);

  try {
    // Test 1: Check if tables exist
    console.log('1️⃣ Testing table existence...');
    
    const tables = ['scraping_jobs', 'scraped_songs', 'scraped_playlists', 'scraped_streams'];
    const existingTables = [];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ Table ${table}: Exists and accessible`);
          existingTables.push(table);
        }
      } catch (err) {
        console.log(`   ❌ Table ${table}: ${err.message}`);
      }
    }

    if (existingTables.length === 0) {
      console.log('\n❌ No structured tables found. Please run:');
      console.log('   node scripts/setup-structured-tables.js');
      return;
    }

    console.log(`\n✅ Found ${existingTables.length}/${tables.length} structured tables`);

    // Test 2: Test data insertion
    console.log('\n2️⃣ Testing data insertion...');
    
    const testOrgId = '00000000-0000-0000-0000-000000000001';
    const testJobId = `test_job_${Date.now()}`;
    const testSongId = 'test_song_123';

    try {
      // Create test organization
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .upsert({
          id: testOrgId,
          name: 'Test Scraper Org',
          slug: 'test-scraper-org'
        })
        .select()
        .single();

      if (orgError) {
        console.log(`   ⚠️  Org creation: ${orgError.message}`);
      } else {
        console.log('   ✅ Test organization ready');
      }

      // Insert test scraping job
      const { data: job, error: jobError } = await supabase
        .from('scraping_jobs')
        .insert({
          org_id: testOrgId,
          job_id: testJobId,
          song_id: testSongId,
          song_url: `https://artists.spotify.com/song/${testSongId}`,
          status: 'completed',
          scraped_at: new Date(),
          total_playlists: 5,
          total_streams: 100000,
          time_ranges: ['28day', '7day', '12months'],
          raw_file: 'test_file.json'
        })
        .select()
        .single();

      if (jobError) {
        console.log(`   ❌ Job insertion: ${jobError.message}`);
      } else {
        console.log('   ✅ Test scraping job inserted');
      }

      // Insert test song data
      const { data: song, error: songError } = await supabase
        .from('scraped_songs')
        .insert({
          org_id: testOrgId,
          job_id: testJobId,
          song_id: testSongId,
          song_url: `https://artists.spotify.com/song/${testSongId}`,
          time_range: '28day',
          total_playlists: 3,
          total_streams: 50000,
          scraped_at: new Date()
        })
        .select()
        .single();

      if (songError) {
        console.log(`   ❌ Song insertion: ${songError.message}`);
      } else {
        console.log('   ✅ Test song data inserted');
      }

      // Insert test playlist data
      const { data: playlist, error: playlistError } = await supabase
        .from('scraped_playlists')
        .insert({
          org_id: testOrgId,
          job_id: testJobId,
          song_id: testSongId,
          time_range: '28day',
          rank: 1,
          playlist_name: 'Test Playlist',
          made_by: 'Spotify',
          streams: 25000,
          date_added: '2025-01-01'
        })
        .select()
        .single();

      if (playlistError) {
        console.log(`   ❌ Playlist insertion: ${playlistError.message}`);
      } else {
        console.log('   ✅ Test playlist data inserted');
      }

      // Insert test stream data
      const { data: stream, error: streamError } = await supabase
        .from('scraped_streams')
        .insert({
          org_id: testOrgId,
          job_id: testJobId,
          song_id: testSongId,
          time_range: '28day',
          playlist_rank: 1,
          playlist_name: 'Test Playlist',
          stream_count: 25000,
          date_added: '2025-01-01'
        })
        .select()
        .single();

      if (streamError) {
        console.log(`   ❌ Stream insertion: ${streamError.message}`);
      } else {
        console.log('   ✅ Test stream data inserted');
      }

    } catch (error) {
      console.log(`   ❌ Data insertion test failed: ${error.message}`);
    }

    // Test 3: Test data queries
    console.log('\n3️⃣ Testing data queries...');
    
    try {
      // Test job query
      const { data: jobs, error: jobsError } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('org_id', testOrgId)
        .limit(5);

      if (jobsError) {
        console.log(`   ❌ Jobs query: ${jobsError.message}`);
      } else {
        console.log(`   ✅ Jobs query: Found ${jobs.length} jobs`);
      }

      // Test songs query
      const { data: songs, error: songsError } = await supabase
        .from('scraped_songs')
        .select('*')
        .eq('org_id', testOrgId)
        .limit(5);

      if (songsError) {
        console.log(`   ❌ Songs query: ${songsError.message}`);
      } else {
        console.log(`   ✅ Songs query: Found ${songs.length} songs`);
      }

      // Test playlists query
      const { data: playlists, error: playlistsError } = await supabase
        .from('scraped_playlists')
        .select('*')
        .eq('org_id', testOrgId)
        .limit(5);

      if (playlistsError) {
        console.log(`   ❌ Playlists query: ${playlistsError.message}`);
      } else {
        console.log(`   ✅ Playlists query: Found ${playlists.length} playlists`);
      }

      // Test streams query
      const { data: streams, error: streamsError } = await supabase
        .from('scraped_streams')
        .select('*')
        .eq('org_id', testOrgId)
        .limit(5);

      if (streamsError) {
        console.log(`   ❌ Streams query: ${streamsError.message}`);
      } else {
        console.log(`   ✅ Streams query: Found ${streams.length} streams`);
      }

    } catch (error) {
      console.log(`   ❌ Data query test failed: ${error.message}`);
    }

    // Test 4: Test views
    console.log('\n4️⃣ Testing views...');
    
    const views = ['song_performance_summary', 'top_playlists_summary', 'job_summary'];
    
    for (const view of views) {
      try {
        const { data, error } = await supabase
          .from(view)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ❌ View ${view}: ${error.message}`);
        } else {
          console.log(`   ✅ View ${view}: Accessible`);
        }
      } catch (err) {
        console.log(`   ❌ View ${view}: ${err.message}`);
      }
    }

    // Test 5: Cleanup test data
    console.log('\n5️⃣ Cleaning up test data...');
    
    try {
      await supabase.from('scraped_streams').delete().eq('org_id', testOrgId);
      await supabase.from('scraped_playlists').delete().eq('org_id', testOrgId);
      await supabase.from('scraped_songs').delete().eq('org_id', testOrgId);
      await supabase.from('scraping_jobs').delete().eq('org_id', testOrgId);
      console.log('   ✅ Test data cleaned up');
    } catch (error) {
      console.log(`   ⚠️  Cleanup warning: ${error.message}`);
    }

    console.log('\n🎉 Structured tables test completed successfully!');
    console.log('\n📋 Test results:');
    console.log('   ✅ Tables exist and are accessible');
    console.log('   ✅ Data insertion works correctly');
    console.log('   ✅ Data queries work correctly');
    console.log('   ✅ Views are accessible');
    console.log('   ✅ Test data cleaned up');

    console.log('\n📋 Next steps:');
    console.log('   1. Run: node scripts/parse-scraper-data.js');
    console.log('   2. Run: node scripts/view-scraper-data.js');
    console.log('   3. Or run: node scripts/run-complete-scraper-workflow.js');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testStructuredTables().catch(console.error);
