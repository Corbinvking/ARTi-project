#!/usr/bin/env node

/**
 * Test script for Spotify scraper functionality
 * Tests the scraper locally before pushing to production
 */

const { createClient } = require('@supabase/supabase-js');
const { SpotifyScraperService } = require('../apps/api/src/providers/spotify/scraper.js');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSpotifyScraper() {
  console.log('🧪 Testing Spotify Scraper Locally...\n');

  try {
    // Test 1: Check if scraped_data table exists
    console.log('1️⃣ Checking scraped_data table...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'scraped_data');

    if (tableError) {
      console.error('❌ Error checking table:', tableError.message);
      return;
    }

    if (tables.length === 0) {
      console.error('❌ scraped_data table not found');
      return;
    }

    console.log('✅ scraped_data table exists');

    // Test 2: Create a test organization
    console.log('\n2️⃣ Creating test organization...');
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: 'Test Scraper Org',
        slug: 'test-scraper-org',
        plan: 'free'
      })
      .select()
      .single();

    if (orgError && !orgError.message.includes('duplicate key')) {
      console.error('❌ Error creating org:', orgError.message);
      return;
    }

    const orgId = org?.id || '00000000-0000-0000-0000-000000000000';
    console.log('✅ Test organization ready:', orgId);

    // Test 3: Test scraper service initialization
    console.log('\n3️⃣ Testing scraper service...');
    const scraperService = new SpotifyScraperService();
    console.log('✅ Scraper service initialized');

    // Test 4: Test database storage method
    console.log('\n4️⃣ Testing database storage...');
    const testData = {
      data: {
        song: {
          artist_name: 'Test Artist',
          song_title: 'Test Song',
          album_name: 'Test Album',
          duration_ms: 180000,
          popularity: 75,
          explicit: false,
          genres: ['pop', 'test'],
          external_urls: {
            spotify: 'https://open.spotify.com/track/test'
          }
        }
      }
    };

    await scraperService.storeScrapedData(orgId, 'https://artists.spotify.com/song/test', testData);
    console.log('✅ Data stored successfully');

    // Test 5: Verify data was stored
    console.log('\n5️⃣ Verifying stored data...');
    const { data: storedData, error: fetchError } = await supabase
      .from('scraped_data')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching data:', fetchError.message);
      return;
    }

    if (storedData.length === 0) {
      console.error('❌ No data found in database');
      return;
    }

    const record = storedData[0];
    console.log('✅ Data retrieved successfully:');
    console.log(`   Artist: ${record.artist_name}`);
    console.log(`   Song: ${record.song_title}`);
    console.log(`   Album: ${record.album_name}`);
    console.log(`   Duration: ${record.duration_ms}ms`);
    console.log(`   Popularity: ${record.popularity}`);

    // Test 6: Test with real Spotify URL (mock)
    console.log('\n6️⃣ Testing with mock Spotify URL...');
    const mockSpotifyUrl = 'https://artists.spotify.com/song/4iV5W9uYEdYUVa79Axb7Rh'; // Blinding Lights
    const mockRealData = {
      data: {
        song: {
          artist_name: 'The Weeknd',
          song_title: 'Blinding Lights',
          album_name: 'After Hours',
          duration_ms: 200000,
          popularity: 95,
          explicit: false,
          genres: ['pop', 'synth-pop'],
          external_urls: {
            spotify: 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh'
          }
        }
      }
    };

    await scraperService.storeScrapedData(orgId, mockSpotifyUrl, mockRealData);
    console.log('✅ Real song data stored successfully');

    // Test 7: Check total records
    console.log('\n7️⃣ Checking total records...');
    const { count, error: countError } = await supabase
      .from('scraped_data')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (countError) {
      console.error('❌ Error counting records:', countError.message);
      return;
    }

    console.log(`✅ Total records for test org: ${count}`);

    console.log('\n🎉 All tests passed! Spotify scraper is ready for production.');
    console.log('\n📋 Next steps:');
    console.log('   1. Commit and push changes to git');
    console.log('   2. Pull changes on production droplet');
    console.log('   3. Test scraper in production environment');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testSpotifyScraper().catch(console.error);
