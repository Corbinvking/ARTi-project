#!/usr/bin/env node

/**
 * Create Tables via Supabase API
 * 
 * This script creates the structured scraper tables using the Supabase REST API
 */

const { createClient } = require('@supabase/supabase-js');

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTablesViaAPI() {
  console.log('🔧 Creating Structured Tables via Supabase API...\n');

  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('orgs')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }

    console.log('✅ Connected to local Supabase');

    // Create tables using the REST API
    const tables = [
      {
        name: 'scraping_jobs',
        sql: `
          CREATE TABLE IF NOT EXISTS scraping_jobs (
              id SERIAL PRIMARY KEY,
              org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
              job_id TEXT UNIQUE NOT NULL,
              song_id TEXT NOT NULL,
              song_url TEXT NOT NULL,
              status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
              scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
              total_playlists INTEGER DEFAULT 0,
              total_streams BIGINT DEFAULT 0,
              time_ranges TEXT[] DEFAULT '{}',
              raw_file TEXT,
              error_message TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'scraped_songs',
        sql: `
          CREATE TABLE IF NOT EXISTS scraped_songs (
              id SERIAL PRIMARY KEY,
              org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
              job_id TEXT REFERENCES scraping_jobs(job_id) ON DELETE CASCADE,
              song_id TEXT NOT NULL,
              song_url TEXT NOT NULL,
              time_range TEXT NOT NULL CHECK (time_range IN ('28day', '7day', '12months')),
              total_playlists INTEGER DEFAULT 0,
              total_streams BIGINT DEFAULT 0,
              scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'scraped_playlists',
        sql: `
          CREATE TABLE IF NOT EXISTS scraped_playlists (
              id SERIAL PRIMARY KEY,
              org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
              job_id TEXT REFERENCES scraping_jobs(job_id) ON DELETE CASCADE,
              song_id TEXT NOT NULL,
              time_range TEXT NOT NULL CHECK (time_range IN ('28day', '7day', '12months')),
              rank INTEGER NOT NULL,
              playlist_name TEXT NOT NULL,
              made_by TEXT DEFAULT 'Unknown',
              streams BIGINT DEFAULT 0,
              date_added TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'scraped_streams',
        sql: `
          CREATE TABLE IF NOT EXISTS scraped_streams (
              id SERIAL PRIMARY KEY,
              org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
              job_id TEXT REFERENCES scraping_jobs(job_id) ON DELETE CASCADE,
              song_id TEXT NOT NULL,
              time_range TEXT NOT NULL CHECK (time_range IN ('28day', '7day', '12months')),
              playlist_rank INTEGER NOT NULL,
              playlist_name TEXT NOT NULL,
              stream_count BIGINT DEFAULT 0,
              date_added TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }
    ];

    console.log('🚀 Creating tables...');

    for (const table of tables) {
      try {
        console.log(`   Creating table: ${table.name}`);
        
        // Use the REST API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            sql: table.sql
          })
        });

        if (response.ok) {
          console.log(`   ✅ Table ${table.name} created successfully`);
        } else {
          const error = await response.text();
          if (error.includes('already exists')) {
            console.log(`   ⚠️  Table ${table.name} already exists`);
          } else {
            console.log(`   ❌ Error creating table ${table.name}: ${error}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error creating table ${table.name}: ${error.message}`);
      }
    }

    console.log('\n✅ Table creation completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: node scripts/parse-scraper-data.js');
    console.log('   2. Run: node scripts/view-scraper-data.js');
    console.log('   3. Or run: node scripts/run-complete-scraper-workflow.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the script
createTablesViaAPI().catch(console.error);
