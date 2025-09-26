#!/usr/bin/env node

/**
 * One-Click Spotify Scraper + Local Supabase Sync
 * 
 * This script:
 * 1. Runs the Python scraper locally
 * 2. Reads the scraped data
 * 3. Automatically syncs to local Supabase instance
 * 4. Shows you the results
 */

const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runScraperAndSync() {
  console.log('🚀 One-Click Spotify Scraper + Local Supabase Sync\n');
  console.log('This will:');
  console.log('  1. 🎵 Run the Python scraper locally');
  console.log('  2. 📊 Read the scraped data');
  console.log('  3. 💾 Sync to your local Supabase instance');
  console.log('  4. 📋 Show you the results\n');

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

    // Step 2: Check if scraper directory exists
    console.log('\n2️⃣ Checking scraper setup...');
    const scraperDir = path.join(__dirname, '../spotify_scraper');
    
    if (!fs.existsSync(scraperDir)) {
      console.error('❌ Spotify scraper directory not found:', scraperDir);
      return;
    }

    const configFile = path.join(scraperDir, 'songs_config.json');
    if (!fs.existsSync(configFile)) {
      console.error('❌ songs_config.json not found');
      return;
    }

    console.log('✅ Scraper directory and config found');

    // Step 3: Check and setup Python environment
    console.log('\n3️⃣ Setting up Python environment...');
    
    // Check if virtual environment exists
    const venvPath = path.join(scraperDir, 'venv');
    if (!fs.existsSync(venvPath)) {
      console.log('   📦 Creating Python virtual environment...');
      const venvProcess = spawn('python', ['-m', 'venv', 'venv'], {
        cwd: scraperDir,
        stdio: 'inherit',
        shell: true
      });

      await new Promise((resolve, reject) => {
        venvProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Virtual environment created');
            resolve();
          } else {
            reject(new Error(`Failed to create virtual environment with code ${code}`));
          }
        });
      });
    } else {
      console.log('✅ Virtual environment found');
    }

    // Install requirements
    console.log('   📦 Installing Python dependencies...');
    const pipPath = process.platform === 'win32' 
      ? path.join(venvPath, 'Scripts', 'pip.exe')
      : path.join(venvPath, 'bin', 'pip');
    
    const installProcess = spawn(pipPath, ['install', '-r', 'requirements.txt'], {
      cwd: scraperDir,
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed');
          resolve();
        } else {
          reject(new Error(`Failed to install dependencies with code ${code}`));
        }
      });
    });

    // Install Playwright browsers
    console.log('   🎭 Installing Playwright browsers...');
    const playwrightPath = process.platform === 'win32'
      ? path.join(venvPath, 'Scripts', 'playwright.exe')
      : path.join(venvPath, 'bin', 'playwright');
    
    const playwrightInstallProcess = spawn(playwrightPath, ['install', 'chromium'], {
      cwd: scraperDir,
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      playwrightInstallProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Playwright browsers installed');
          resolve();
        } else {
          reject(new Error(`Failed to install Playwright browsers with code ${code}`));
        }
      });
    });

    // Step 4: Run the Python scraper
    console.log('\n4️⃣ Running Python scraper...');
    console.log('   🎭 This will open a browser window - you can watch it work!');
    
    const pythonPath = process.platform === 'win32'
      ? path.join(venvPath, 'Scripts', 'python.exe')
      : path.join(venvPath, 'bin', 'python');
    
    const scraperProcess = spawn(pythonPath, ['run_multi_scraper_config.py'], {
      cwd: scraperDir,
      stdio: 'inherit',
      shell: true
    });

    // Wait for scraper to complete
    await new Promise((resolve, reject) => {
      scraperProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Scraper completed successfully');
          resolve();
        } else {
          console.error(`❌ Scraper failed with code ${code}`);
          reject(new Error(`Scraper failed with code ${code}`));
        }
      });

      scraperProcess.on('error', (error) => {
        console.error('❌ Error running scraper:', error.message);
        reject(error);
      });
    });

    // Step 5: Read and process scraped data
    console.log('\n5️⃣ Processing scraped data...');
    const dataDir = path.join(scraperDir, 'data');
    
    if (!fs.existsSync(dataDir)) {
      console.error('❌ Data directory not found');
      return;
    }

    // Get the most recent song files
    const songFiles = fs.readdirSync(dataDir)
      .filter(file => file.startsWith('song_') && file.endsWith('.json'))
      .sort()
      .slice(-10); // Get the 10 most recent files

    if (songFiles.length === 0) {
      console.log('⚠️  No new scraped data files found');
      return;
    }

    console.log(`✅ Found ${songFiles.length} scraped data files`);

    // Step 6: Create or get default organization
    console.log('\n6️⃣ Setting up organization...');
    const defaultOrgId = '00000000-0000-0000-0000-000000000001';
    
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .upsert({
        id: defaultOrgId,
        name: 'Local Scraper Data',
        slug: 'local-scraper-data'
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating org:', orgError.message);
      return;
    }

    console.log('✅ Organization ready');

    // Step 7: Sync data to local Supabase
    console.log('\n7️⃣ Syncing data to local Supabase...');
    let successCount = 0;
    let errorCount = 0;

    for (const file of songFiles) {
      try {
        const filePath = path.join(dataDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const scrapedData = JSON.parse(fileContent);

        // Extract song URL from filename
        const songId = file.match(/song_([^_]+)_/)?.[1];
        const songUrl = `https://artists.spotify.com/song/${songId}`;

        // Parse the scraped data - this is playlist data, not song metadata
        // Extract playlist statistics from the data
        const playlistData = scrapedData.time_ranges || {};
        const stats28day = playlistData['28day']?.stats || {};
        const stats7day = playlistData['7day']?.stats || {};
        const stats12months = playlistData['12months']?.stats || {};
        
        // Calculate total playlists across all time ranges
        const totalPlaylists = (stats28day.playlists?.length || 0) + 
                              (stats7day.playlists?.length || 0) + 
                              (stats12months.playlists?.length || 0);
        
        // Calculate total streams across all time ranges
        const totalStreams = (stats28day.streams || 0) + 
                            (stats7day.streams || 0) + 
                            (stats12months.streams || 0);

        // Prepare data for insertion
        const insertData = {
          org_id: defaultOrgId,
          platform: 'spotify',
          song_url: songUrl,
          artist_name: null, // Not available in playlist data
          song_title: null,  // Not available in playlist data
          album_name: null,  // Not available in playlist data
          release_date: null,
          duration_ms: null,
          popularity: totalPlaylists, // Use playlist count as popularity metric
          explicit: null,
          genres: [],
          external_urls: {},
          raw_data: {
            ...scrapedData,
            summary: {
              total_playlists: totalPlaylists,
              total_streams: totalStreams,
              playlists_28day: stats28day.playlists?.length || 0,
              playlists_7day: stats7day.playlists?.length || 0,
              playlists_12months: stats12months.playlists?.length || 0,
              streams_28day: stats28day.streams || 0,
              streams_7day: stats7day.streams || 0,
              streams_12months: stats12months.streams || 0
            }
          },
          scraped_at: new Date()
        };

        // Insert into local Supabase
        const { error: insertError } = await supabase
          .from('scraped_data')
          .insert(insertData);

        if (insertError) {
          console.error(`❌ Error inserting ${file}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Synced: ${songId} (${totalPlaylists} playlists, ${totalStreams} streams)`);
          successCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        errorCount++;
      }
    }

    // Step 8: Show results
    console.log('\n📊 Sync Results:');
    console.log(`   ✅ Successfully synced: ${successCount} songs`);
    console.log(`   ❌ Errors: ${errorCount} songs`);
    console.log(`   📁 Files processed: ${songFiles.length}`);

    // Step 9: Show recent data
    console.log('\n9️⃣ Recent scraped data in local Supabase:');
    const { data: recentData, error: recentError } = await supabase
      .from('scraped_data')
      .select('*')
      .eq('org_id', defaultOrgId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Error fetching recent data:', recentError.message);
      return;
    }

    if (recentData.length > 0) {
      console.log('\n🎵 Latest scraped songs:');
      recentData.forEach((record, index) => {
        const songId = record.song_url?.split('/').pop() || 'Unknown';
        const summary = record.raw_data?.summary;
        console.log(`   ${index + 1}. Song ID: ${songId}`);
        console.log(`      📊 Total Playlists: ${record.popularity || 'N/A'}`);
        console.log(`      📈 Total Streams: ${summary?.total_streams || 'N/A'}`);
        console.log(`      📅 28-day: ${summary?.playlists_28day || 0} playlists`);
        console.log(`      📅 7-day: ${summary?.playlists_7day || 0} playlists`);
        console.log(`      📅 12-month: ${summary?.playlists_12months || 0} playlists`);
        console.log(`      📅 Scraped: ${new Date(record.scraped_at).toLocaleString()}`);
        console.log('');
      });
    }

    console.log('🎉 One-click scraper sync completed successfully!');
    console.log('\n📋 What you can do now:');
    console.log('   • View data in Supabase Studio: http://localhost:54323');
    console.log('   • Query data via API: http://localhost:54321');
    console.log('   • Run this script again to scrape more songs');
    console.log('   • Push data to production when ready');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the script
runScraperAndSync().catch(console.error);
