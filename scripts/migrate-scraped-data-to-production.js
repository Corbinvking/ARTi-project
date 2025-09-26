#!/usr/bin/env node

/**
 * Migrate scraped Spotify data from local files to production database
 * Reads JSON files from spotify_scraper/data/ and uploads to production
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Production Supabase configuration
const supabaseUrl = 'https://api.artistinfluence.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateScrapedData() {
  console.log('🚀 Migrating Scraped Spotify Data to Production...\n');

  try {
    // Step 1: Get or create a default organization
    console.log('1️⃣ Setting up organization...');
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

    console.log('✅ Organization ready:', org.id);

    // Step 2: Read all scraped data files
    console.log('\n2️⃣ Reading scraped data files...');
    const dataDir = path.join(__dirname, '../spotify_scraper/data');
    
    if (!fs.existsSync(dataDir)) {
      console.error('❌ Data directory not found:', dataDir);
      return;
    }

    const files = fs.readdirSync(dataDir)
      .filter(file => file.startsWith('song_') && file.endsWith('.json'))
      .sort();

    console.log(`✅ Found ${files.length} scraped data files`);

    if (files.length === 0) {
      console.log('⚠️  No scraped data files found. Run the scraper first!');
      return;
    }

    // Step 3: Process each file
    console.log('\n3️⃣ Processing scraped data...');
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(dataDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const scrapedData = JSON.parse(fileContent);

        // Extract song URL from filename or data
        const songId = file.match(/song_([^_]+)_/)?.[1];
        const songUrl = `https://artists.spotify.com/song/${songId}`;

        // Parse the scraped data structure
        const songData = scrapedData.song || scrapedData.data?.song || scrapedData;
        
        if (!songData) {
          console.log(`⚠️  Skipping ${file}: No song data found`);
          continue;
        }

        // Prepare data for insertion
        const insertData = {
          org_id: defaultOrgId,
          platform: 'spotify',
          song_url: songUrl,
          artist_name: songData.artist_name || songData.artist,
          song_title: songData.song_title || songData.title || songData.name,
          album_name: songData.album_name || songData.album,
          release_date: songData.release_date ? new Date(songData.release_date) : null,
          duration_ms: songData.duration_ms || songData.duration,
          popularity: songData.popularity,
          explicit: songData.explicit,
          genres: songData.genres || [],
          external_urls: songData.external_urls || {},
          raw_data: scrapedData,
          scraped_at: new Date()
        };

        // Insert into database
        const { error: insertError } = await supabase
          .from('scraped_data')
          .insert(insertData);

        if (insertError) {
          console.error(`❌ Error inserting ${file}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Migrated: ${insertData.artist_name} - ${insertData.song_title}`);
          successCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        errorCount++;
      }
    }

    // Step 4: Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount} songs`);
    console.log(`   ❌ Errors: ${errorCount} songs`);
    console.log(`   📁 Total files processed: ${files.length}`);

    // Step 5: Verify data in production
    console.log('\n5️⃣ Verifying migrated data...');
    const { data: migratedData, error: verifyError } = await supabase
      .from('scraped_data')
      .select('*')
      .eq('org_id', defaultOrgId)
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError.message);
      return;
    }

    console.log(`✅ Found ${migratedData.length} records in production database`);
    
    if (migratedData.length > 0) {
      console.log('\n🎵 Recent migrations:');
      migratedData.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.artist_name} - ${record.song_title}`);
      });
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Check the data in Supabase Studio: https://db.artistinfluence.com');
    console.log('   2. Test the API endpoints with the migrated data');
    console.log('   3. Set up automated scraping schedule if needed');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the migration
migrateScrapedData().catch(console.error);
