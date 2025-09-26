#!/usr/bin/env node

/**
 * Spotify Scraper Data Parser
 * 
 * This script transforms raw scraper data into well-structured tables:
 * - songs: Basic song information
 * - playlists: Individual playlist data
 * - streams: Stream data per playlist per time period
 * - scraping_jobs: Job metadata and summaries
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function parseScraperData() {
  console.log('🔍 Spotify Scraper Data Parser\n');
  console.log('This will:');
  console.log('  1. 📊 Parse raw scraper data files');
  console.log('  2. 🗂️  Create structured tables (songs, playlists, streams)');
  console.log('  3. 💾 Store data in organized, queryable format');
  console.log('  4. 📋 Generate summary reports\n');

  try {
    // Step 1: Check if local Supabase is running
    console.log('1️⃣ Checking local Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('scraped_data')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Local Supabase not running or scraped_data table not found');
      console.error('   Please run: npx supabase start');
      return;
    }

    console.log('✅ Local Supabase is running and accessible');

    // Step 2: Find all scraper data files
    console.log('\n2️⃣ Finding scraper data files...');
    const scraperDir = path.join(__dirname, '../spotify_scraper');
    const dataDir = path.join(scraperDir, 'data');
    
    if (!fs.existsSync(dataDir)) {
      console.error('❌ Data directory not found:', dataDir);
      return;
    }

    const dataFiles = fs.readdirSync(dataDir)
      .filter(file => file.startsWith('song_') && file.endsWith('.json'))
      .sort();

    if (dataFiles.length === 0) {
      console.log('⚠️  No scraper data files found');
      return;
    }

    console.log(`✅ Found ${dataFiles.length} scraper data files`);

    // Step 3: Create or get default organization
    console.log('\n3️⃣ Setting up organization...');
    const defaultOrgId = '00000000-0000-0000-0000-000000000001';
    
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .upsert({
        id: defaultOrgId,
        name: 'Spotify Scraper Data',
        slug: 'spotify-scraper-data'
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating org:', orgError.message);
      return;
    }

    console.log('✅ Organization ready');

    // Step 4: Process each data file
    console.log('\n4️⃣ Processing scraper data files...');
    let processedJobs = 0;
    let processedSongs = 0;
    let processedPlaylists = 0;
    let processedStreams = 0;

    for (const file of dataFiles) {
      try {
        console.log(`\n📁 Processing: ${file}`);
        
        const filePath = path.join(dataDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const rawData = JSON.parse(fileContent);

        // Extract song ID from filename
        const songId = file.match(/song_([^_]+)_/)?.[1];
        if (!songId) {
          console.log(`⚠️  Skipping ${file}: Could not extract song ID`);
          continue;
        }

        const songUrl = `https://artists.spotify.com/song/${songId}`;
        const scrapedAt = new Date(rawData.scraped_at || new Date());

        // Create scraping job record
        const jobData = {
          org_id: defaultOrgId,
          job_id: `job_${songId}_${Date.now()}`,
          song_id: songId,
          song_url: songUrl,
          status: 'completed',
          scraped_at: scrapedAt,
          total_playlists: 0,
          total_streams: 0,
          time_ranges: Object.keys(rawData.time_ranges || {}),
          raw_file: file,
          created_at: new Date()
        };

        // Process time ranges and calculate totals
        const timeRanges = rawData.time_ranges || {};
        let totalPlaylists = 0;
        let totalStreams = 0;

        for (const [timeRange, data] of Object.entries(timeRanges)) {
          const stats = data.stats || {};
          const playlists = stats.playlists || [];
          const streams = stats.streams || 0;

          totalPlaylists += playlists.length;
          totalStreams += streams;

          // Create song record (one per time range for now)
          const songData = {
            org_id: defaultOrgId,
            job_id: jobData.job_id,
            song_id: songId,
            song_url: songUrl,
            time_range: timeRange,
            total_playlists: playlists.length,
            total_streams: streams,
            scraped_at: scrapedAt,
            created_at: new Date()
          };

          // Insert song record
          const { error: songError } = await supabase
            .from('scraped_songs')
            .insert(songData);

          if (songError) {
            console.error(`❌ Error inserting song data:`, songError.message);
            continue;
          }

          processedSongs++;

          // Process individual playlists
          for (const [index, playlist] of playlists.entries()) {
            const playlistData = {
              org_id: defaultOrgId,
              job_id: jobData.job_id,
              song_id: songId,
              time_range: timeRange,
              rank: parseInt(playlist.rank) || index + 1,
              playlist_name: playlist.name || 'Unknown Playlist',
              made_by: playlist.made_by || 'Unknown',
              streams: this.parseStreamCount(playlist.streams),
              date_added: playlist.date_added || null,
              created_at: new Date()
            };

            // Insert playlist record
            const { error: playlistError } = await supabase
              .from('scraped_playlists')
              .insert(playlistData);

            if (playlistError) {
              console.error(`❌ Error inserting playlist data:`, playlistError.message);
              continue;
            }

            processedPlaylists++;

            // Create stream record
            const streamData = {
              org_id: defaultOrgId,
              job_id: jobData.job_id,
              song_id: songId,
              time_range: timeRange,
              playlist_rank: playlistData.rank,
              playlist_name: playlistData.playlist_name,
              stream_count: playlistData.streams,
              date_added: playlistData.date_added,
              created_at: new Date()
            };

            // Insert stream record
            const { error: streamError } = await supabase
              .from('scraped_streams')
              .insert(streamData);

            if (streamError) {
              console.error(`❌ Error inserting stream data:`, streamError.message);
              continue;
            }

            processedStreams++;
          }
        }

        // Update job totals
        jobData.total_playlists = totalPlaylists;
        jobData.total_streams = totalStreams;

        // Insert job record
        const { error: jobError } = await supabase
          .from('scraping_jobs')
          .insert(jobData);

        if (jobError) {
          console.error(`❌ Error inserting job data:`, jobError.message);
          continue;
        }

        processedJobs++;
        console.log(`✅ Processed: ${songId} (${totalPlaylists} playlists, ${totalStreams} streams)`);

      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }

    // Step 5: Generate summary
    console.log('\n📊 Parsing Results:');
    console.log(`   ✅ Jobs processed: ${processedJobs}`);
    console.log(`   ✅ Songs processed: ${processedSongs}`);
    console.log(`   ✅ Playlists processed: ${processedPlaylists}`);
    console.log(`   ✅ Streams processed: ${processedStreams}`);

    // Step 6: Show sample data
    console.log('\n5️⃣ Sample structured data:');
    
    // Show recent jobs
    const { data: recentJobs, error: jobsError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('org_id', defaultOrgId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!jobsError && recentJobs.length > 0) {
      console.log('\n📋 Recent scraping jobs:');
      recentJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. Song ID: ${job.song_id}`);
        console.log(`      📊 Total Playlists: ${job.total_playlists}`);
        console.log(`      📈 Total Streams: ${job.total_streams}`);
        console.log(`      📅 Time Ranges: ${job.time_ranges.join(', ')}`);
        console.log(`      📅 Scraped: ${new Date(job.scraped_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Show top playlists
    const { data: topPlaylists, error: playlistsError } = await supabase
      .from('scraped_playlists')
      .select('*')
      .eq('org_id', defaultOrgId)
      .order('streams', { ascending: false })
      .limit(5);

    if (!playlistsError && topPlaylists.length > 0) {
      console.log('\n🎵 Top playlists by streams:');
      topPlaylists.forEach((playlist, index) => {
        console.log(`   ${index + 1}. ${playlist.playlist_name}`);
        console.log(`      📊 Streams: ${playlist.streams.toLocaleString()}`);
        console.log(`      📅 Time Range: ${playlist.time_range}`);
        console.log(`      🏆 Rank: ${playlist.rank}`);
        console.log('');
      });
    }

    console.log('🎉 Data parsing completed successfully!');
    console.log('\n📋 What you can do now:');
    console.log('   • View structured data in Supabase Studio: http://localhost:54323');
    console.log('   • Query data via API: http://localhost:54321');
    console.log('   • Run data analysis queries on the structured tables');
    console.log('   • Export data for further analysis');

  } catch (error) {
    console.error('❌ Parsing failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Helper function to parse stream count strings
function parseStreamCount(streamString) {
  if (!streamString || streamString === 'Not available') {
    return 0;
  }
  
  // Remove commas and parse as integer
  const cleaned = streamString.replace(/,/g, '');
  const parsed = parseInt(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

// Run the parser
parseScraperData().catch(console.error);
