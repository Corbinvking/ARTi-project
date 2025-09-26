#!/usr/bin/env node

/**
 * Create Tables Directly
 * 
 * This script creates the structured scraper tables using direct Supabase client calls
 * Works for both local and production instances
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  environment: process.env.NODE_ENV || 'local'
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function createTablesDirect() {
  console.log('🔧 Creating Structured Tables Directly\n');
  console.log(`📍 Environment: ${config.environment}`);
  console.log(`🔗 Supabase URL: ${config.supabaseUrl}\n`);

  try {
    // Test connection
    console.log('1️⃣ Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('orgs')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }

    console.log('✅ Connected to Supabase successfully');

    // Create tables using the REST API with raw SQL
    console.log('\n2️⃣ Creating structured tables...');
    
    const tables = [
      {
        name: 'scraping_jobs',
        description: 'Tracks each scraping job with metadata and summary statistics',
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
        description: 'Song data aggregated by time range (28day, 7day, 12months)',
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
        description: 'Individual playlist data with stream counts and rankings',
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
        description: 'Detailed stream data per playlist per time range',
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

    // Create each table using the REST API
    for (const table of tables) {
      try {
        console.log(`   📊 Creating table: ${table.name}`);
        console.log(`      ${table.description}`);
        
        // Use the REST API to execute SQL
        const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`
          },
          body: JSON.stringify({
            sql: table.sql
          })
        });

        if (response.ok) {
          console.log(`   ✅ Table ${table.name} created successfully`);
        } else {
          const error = await response.text();
          if (error.includes('already exists') || error.includes('relation') && error.includes('already exists')) {
            console.log(`   ⚠️  Table ${table.name} already exists`);
          } else {
            console.log(`   ❌ Error creating table ${table.name}: ${error}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error creating table ${table.name}: ${error.message}`);
      }
    }

    // Test if tables were created by trying to query them
    console.log('\n3️⃣ Verifying table creation...');
    
    const tableNames = ['scraping_jobs', 'scraped_songs', 'scraped_playlists', 'scraped_streams'];
    const createdTables = [];

    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ❌ Table ${tableName}: ${error.message}`);
        } else {
          console.log(`   ✅ Table ${tableName}: Exists and accessible`);
          createdTables.push(tableName);
        }
      } catch (err) {
        console.log(`   ❌ Table ${tableName}: ${err.message}`);
      }
    }

    if (createdTables.length === 0) {
      console.log('\n❌ No tables were created. Trying alternative approach...');
      
      // Alternative approach: Create tables using the Supabase client directly
      console.log('\n4️⃣ Trying alternative table creation...');
      
      // Create a simple test table first
      try {
        const { data, error } = await supabase
          .from('test_table_creation')
          .select('*')
          .limit(1);

        if (error && error.message.includes('relation "test_table_creation" does not exist')) {
          console.log('   ✅ Supabase client is working, but tables need to be created via SQL');
          console.log('\n💡 Manual setup required:');
          console.log('   1. Open Supabase Studio: http://localhost:54323');
          console.log('   2. Go to SQL Editor');
          console.log('   3. Run the SQL from: supabase/migrations/013_create_structured_scraper_tables.sql');
          console.log('   4. Or use the setup guide: SETUP-STRUCTURED-TABLES.md');
        }
      } catch (err) {
        console.log(`   ❌ Alternative test failed: ${err.message}`);
      }
    } else {
      console.log(`\n✅ Successfully created ${createdTables.length}/${tableNames.length} tables`);
      
      // Create indexes
      console.log('\n4️⃣ Creating indexes...');
      
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_scraping_jobs_org_id ON scraping_jobs(org_id);',
        'CREATE INDEX IF NOT EXISTS idx_scraping_jobs_song_id ON scraping_jobs(song_id);',
        'CREATE INDEX IF NOT EXISTS idx_scraped_songs_org_id ON scraped_songs(org_id);',
        'CREATE INDEX IF NOT EXISTS idx_scraped_playlists_org_id ON scraped_playlists(org_id);',
        'CREATE INDEX IF NOT EXISTS idx_scraped_streams_org_id ON scraped_streams(org_id);'
      ];

      for (const indexSQL of indexes) {
        try {
          const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.supabaseKey,
              'Authorization': `Bearer ${config.supabaseKey}`
            },
            body: JSON.stringify({
              sql: indexSQL
            })
          });

          if (response.ok) {
            console.log(`   ✅ Index created`);
          } else {
            const error = await response.text();
            if (error.includes('already exists')) {
              console.log(`   ⚠️  Index already exists`);
            } else {
              console.log(`   ❌ Error creating index: ${error}`);
            }
          }
        } catch (error) {
          console.log(`   ❌ Error creating index: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Table creation process completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: node scripts/test-structured-tables.js');
    console.log('   2. Run: node scripts/parse-scraper-data.js');
    console.log('   3. Run: node scripts/view-scraper-data.js');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the setup
createTablesDirect().catch(console.error);
