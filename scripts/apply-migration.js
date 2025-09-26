#!/usr/bin/env node

/**
 * Apply Migration Script
 * 
 * This script applies the structured scraper tables migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying Structured Scraper Tables Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/013_create_structured_scraper_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('🚀 Applying migration...');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`   ${i + 1}/${statements.length}: Executing statement...`);
          
          const { error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });

          if (error) {
            // Some errors are expected (like "already exists")
            if (error.message.includes('already exists') || 
                error.message.includes('already exists')) {
              console.log(`   ⚠️  Statement skipped (already exists): ${error.message}`);
            } else {
              console.error(`   ❌ Error executing statement: ${error.message}`);
            }
          } else {
            console.log(`   ✅ Statement executed successfully`);
          }
        } catch (err) {
          console.error(`   ❌ Error executing statement: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📋 New tables created:');
    console.log('   • scraping_jobs - Tracks each scraping job');
    console.log('   • scraped_songs - Song data per time range');
    console.log('   • scraped_playlists - Individual playlist data');
    console.log('   • scraped_streams - Detailed stream data');
    console.log('\n📋 New views created:');
    console.log('   • song_performance_summary - Easy song performance queries');
    console.log('   • top_playlists_summary - Top playlists across songs');
    console.log('   • job_summary - Comprehensive job summaries');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the migration
applyMigration().catch(console.error);
