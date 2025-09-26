#!/usr/bin/env node

/**
 * Setup Structured Tables for Production
 * 
 * This script creates the structured scraper tables on the production Supabase instance
 */

const { createClient } = require('@supabase/supabase-js');

// Production Supabase configuration
const config = {
  supabaseUrl: 'https://api.artistinfluence.com',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  environment: 'production'
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function setupProductionTables() {
  console.log('🚀 Setting up Structured Scraper Tables for Production\n');
  console.log(`📍 Environment: ${config.environment}`);
  console.log(`🔗 Supabase URL: ${config.supabaseUrl}\n`);

  try {
    // Test connection
    console.log('1️⃣ Testing production connection...');
    const { data: testData, error: testError } = await supabase
      .from('orgs')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Production connection failed:', testError.message);
      console.error('   Make sure the production Supabase is running and accessible');
      return;
    }

    console.log('✅ Connected to production Supabase successfully');

    // Import and run the setup function
    console.log('\n2️⃣ Setting up structured tables...');
    
    // Set environment variables for the setup script
    process.env.SUPABASE_URL = config.supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = config.supabaseKey;
    process.env.NODE_ENV = 'production';

    // Import and run the setup function
    const { setupStructuredTables } = await import('./setup-structured-tables.js');
    await setupStructuredTables();

    console.log('\n🎉 Production structured tables setup completed!');
    console.log('\n📋 Production tables ready:');
    console.log('   • scraping_jobs - Tracks each scraping job');
    console.log('   • scraped_songs - Song data per time range');
    console.log('   • scraped_playlists - Individual playlist data');
    console.log('   • scraped_streams - Detailed stream data');
    
    console.log('\n📋 Production views ready:');
    console.log('   • song_performance_summary - Song performance analysis');
    console.log('   • top_playlists_summary - Top playlists analysis');
    console.log('   • job_summary - Job performance analysis');

    console.log('\n🚀 Next steps:');
    console.log('   1. Test the tables: node scripts/test-production-tables.js');
    console.log('   2. Push local data: node scripts/push-local-data-to-production.js');
    console.log('   3. Set up automated scraping in production');

  } catch (error) {
    console.error('❌ Production setup failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the production setup
setupProductionTables().catch(console.error);
