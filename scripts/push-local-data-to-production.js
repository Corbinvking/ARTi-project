#!/usr/bin/env node

/**
 * Push Local Scraped Data to Production
 * 
 * This script takes all the scraped data from your local Supabase
 * and pushes it to your production Supabase instance
 */

const { createClient } = require('@supabase/supabase-js');

// Local Supabase configuration
const localSupabaseUrl = 'http://127.0.0.1:54321';
const localSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Production Supabase configuration
const prodSupabaseUrl = 'https://api.artistinfluence.com';
const prodSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const localSupabase = createClient(localSupabaseUrl, localSupabaseKey);
const prodSupabase = createClient(prodSupabaseUrl, prodSupabaseKey);

async function pushLocalDataToProduction() {
  console.log('🚀 Pushing Local Scraped Data to Production...\n');

  try {
    // Step 1: Check local connection
    console.log('1️⃣ Checking local Supabase connection...');
    const { data: localTest, error: localError } = await localSupabase
      .from('scraped_data')
      .select('id')
      .limit(1);

    if (localError) {
      console.error('❌ Local Supabase not accessible:', localError.message);
      return;
    }

    console.log('✅ Local Supabase connected');

    // Step 2: Check production connection
    console.log('\n2️⃣ Checking production Supabase connection...');
    const { data: prodTest, error: prodError } = await prodSupabase
      .from('scraped_data')
      .select('id')
      .limit(1);

    if (prodError) {
      console.error('❌ Production Supabase not accessible:', prodError.message);
      return;
    }

    console.log('✅ Production Supabase connected');

    // Step 3: Get all local scraped data
    console.log('\n3️⃣ Fetching local scraped data...');
    const { data: localData, error: fetchError } = await localSupabase
      .from('scraped_data')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching local data:', fetchError.message);
      return;
    }

    if (localData.length === 0) {
      console.log('⚠️  No local scraped data found. Run the scraper first!');
      return;
    }

    console.log(`✅ Found ${localData.length} records in local database`);

    // Step 4: Create production organization
    console.log('\n4️⃣ Setting up production organization...');
    const prodOrgId = '00000000-0000-0000-0000-000000000001';
    
    const { data: prodOrg, error: prodOrgError } = await prodSupabase
      .from('orgs')
      .upsert({
        id: prodOrgId,
        name: 'Spotify Scraper Data',
        slug: 'spotify-scraper-data'
      })
      .select()
      .single();

    if (prodOrgError) {
      console.error('❌ Error creating production org:', prodOrgError.message);
      return;
    }

    console.log('✅ Production organization ready');

    // Step 5: Push data to production
    console.log('\n5️⃣ Pushing data to production...');
    let successCount = 0;
    let errorCount = 0;

    for (const record of localData) {
      try {
        // Update org_id to production org
        const prodRecord = {
          ...record,
          org_id: prodOrgId,
          id: undefined // Let production generate new ID
        };

        const { error: insertError } = await prodSupabase
          .from('scraped_data')
          .insert(prodRecord);

        if (insertError) {
          console.error(`❌ Error inserting ${record.artist_name} - ${record.song_title}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Pushed: ${record.artist_name} - ${record.song_title}`);
          successCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing record:`, error.message);
        errorCount++;
      }
    }

    // Step 6: Summary
    console.log('\n📊 Push Results:');
    console.log(`   ✅ Successfully pushed: ${successCount} records`);
    console.log(`   ❌ Errors: ${errorCount} records`);
    console.log(`   📁 Total records: ${localData.length}`);

    // Step 7: Verify production data
    console.log('\n6️⃣ Verifying production data...');
    const { data: prodData, error: verifyError } = await prodSupabase
      .from('scraped_data')
      .select('*')
      .eq('org_id', prodOrgId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (verifyError) {
      console.error('❌ Error verifying production data:', verifyError.message);
      return;
    }

    console.log(`✅ Found ${prodData.length} records in production database`);
    
    if (prodData.length > 0) {
      console.log('\n🎵 Recent production data:');
      prodData.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.artist_name} - ${record.song_title}`);
      });
    }

    console.log('\n🎉 Data push completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   • Check production data: https://db.artistinfluence.com');
    console.log('   • Test production API endpoints');
    console.log('   • Set up automated data sync if needed');

  } catch (error) {
    console.error('❌ Push failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the push
pushLocalDataToProduction().catch(console.error);
