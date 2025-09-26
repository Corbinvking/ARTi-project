#!/usr/bin/env node

/**
 * Setup Structured Tables Programmatically
 * 
 * This script creates the structured scraper tables using the Supabase REST API
 * Works for both local and production instances
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration - can be overridden with environment variables
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  environment: process.env.NODE_ENV || 'local'
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function setupStructuredTables() {
  console.log('🔧 Setting up Structured Scraper Tables Programmatically\n');
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

    // Create tables using direct SQL execution
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

    // Create each table
    for (const table of tables) {
      try {
        console.log(`   📊 Creating table: ${table.name}`);
        console.log(`      ${table.description}`);
        
        // Execute SQL using the REST API
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

    // Create indexes
    console.log('\n3️⃣ Creating indexes for better performance...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_scraping_jobs_org_id ON scraping_jobs(org_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraping_jobs_song_id ON scraping_jobs(song_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraping_jobs_scraped_at ON scraping_jobs(scraped_at);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_songs_org_id ON scraped_songs(org_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_songs_job_id ON scraped_songs(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_songs_song_id ON scraped_songs(song_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_songs_time_range ON scraped_songs(time_range);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_playlists_org_id ON scraped_playlists(org_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_playlists_job_id ON scraped_playlists(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_playlists_song_id ON scraped_playlists(song_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_playlists_time_range ON scraped_playlists(time_range);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_playlists_streams ON scraped_playlists(streams DESC);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_streams_org_id ON scraped_streams(org_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_streams_job_id ON scraped_streams(job_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_streams_song_id ON scraped_streams(song_id);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_streams_time_range ON scraped_streams(time_range);',
      'CREATE INDEX IF NOT EXISTS idx_scraped_streams_stream_count ON scraped_streams(stream_count DESC);'
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

    // Enable RLS
    console.log('\n4️⃣ Enabling Row Level Security...');
    
    const rlsSQL = `
      ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE scraped_songs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE scraped_playlists ENABLE ROW LEVEL SECURITY;
      ALTER TABLE scraped_streams ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Allow all operations on scraping_jobs" ON scraping_jobs FOR ALL USING (true);
      CREATE POLICY IF NOT EXISTS "Allow all operations on scraped_songs" ON scraped_songs FOR ALL USING (true);
      CREATE POLICY IF NOT EXISTS "Allow all operations on scraped_playlists" ON scraped_playlists FOR ALL USING (true);
      CREATE POLICY IF NOT EXISTS "Allow all operations on scraped_streams" ON scraped_streams FOR ALL USING (true);
    `;

    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        },
        body: JSON.stringify({
          sql: rlsSQL
        })
      });

      if (response.ok) {
        console.log('   ✅ RLS enabled successfully');
      } else {
        const error = await response.text();
        console.log(`   ⚠️  RLS setup warning: ${error}`);
      }
    } catch (error) {
      console.log(`   ⚠️  RLS setup warning: ${error.message}`);
    }

    // Create views
    console.log('\n5️⃣ Creating helpful views...');
    
    const views = [
      {
        name: 'song_performance_summary',
        sql: `
          CREATE OR REPLACE VIEW song_performance_summary AS
          SELECT 
              s.org_id,
              s.song_id,
              s.song_url,
              s.time_range,
              s.total_playlists,
              s.total_streams,
              s.scraped_at,
              CASE 
                  WHEN s.time_range = '28day' THEN 'Recent Performance'
                  WHEN s.time_range = '7day' THEN 'Weekly Performance'
                  WHEN s.time_range = '12months' THEN 'Annual Performance'
              END as performance_period,
              ROW_NUMBER() OVER (PARTITION BY s.time_range ORDER BY s.total_streams DESC) as stream_rank,
              ROW_NUMBER() OVER (PARTITION BY s.time_range ORDER BY s.total_playlists DESC) as playlist_rank
          FROM scraped_songs s
          ORDER BY s.time_range, s.total_streams DESC;
        `
      },
      {
        name: 'top_playlists_summary',
        sql: `
          CREATE OR REPLACE VIEW top_playlists_summary AS
          SELECT 
              p.org_id,
              p.song_id,
              p.time_range,
              p.playlist_name,
              p.made_by,
              p.streams,
              p.rank,
              p.date_added,
              COUNT(*) OVER (PARTITION BY p.playlist_name, p.time_range) as playlist_frequency,
              SUM(p.streams) OVER (PARTITION BY p.playlist_name, p.time_range) as total_playlist_streams,
              ROW_NUMBER() OVER (PARTITION BY p.time_range ORDER BY p.streams DESC) as global_rank
          FROM scraped_playlists p
          ORDER BY p.time_range, p.streams DESC;
        `
      },
      {
        name: 'job_summary',
        sql: `
          CREATE OR REPLACE VIEW job_summary AS
          SELECT 
              j.org_id,
              j.job_id,
              j.song_id,
              j.song_url,
              j.status,
              j.scraped_at,
              j.total_playlists,
              j.total_streams,
              j.time_ranges,
              j.raw_file,
              COUNT(DISTINCT s.time_range) as time_ranges_processed,
              COUNT(DISTINCT p.id) as total_playlists_found,
              COUNT(DISTINCT st.id) as total_stream_records,
              CASE 
                  WHEN j.total_streams > 1000000 THEN 'High Performance'
                  WHEN j.total_streams > 100000 THEN 'Medium Performance'
                  WHEN j.total_streams > 10000 THEN 'Low Performance'
                  ELSE 'Very Low Performance'
              END as performance_category
          FROM scraping_jobs j
          LEFT JOIN scraped_songs s ON j.job_id = s.job_id
          LEFT JOIN scraped_playlists p ON j.job_id = p.job_id
          LEFT JOIN scraped_streams st ON j.job_id = st.job_id
          GROUP BY j.id, j.org_id, j.job_id, j.song_id, j.song_url, j.status, j.scraped_at, 
                   j.total_playlists, j.total_streams, j.time_ranges, j.raw_file
          ORDER BY j.scraped_at DESC;
        `
      }
    ];

    for (const view of views) {
      try {
        console.log(`   📊 Creating view: ${view.name}`);
        
        const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`
          },
          body: JSON.stringify({
            sql: view.sql
          })
        });

        if (response.ok) {
          console.log(`   ✅ View ${view.name} created successfully`);
        } else {
          const error = await response.text();
          console.log(`   ❌ Error creating view ${view.name}: ${error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error creating view ${view.name}: ${error.message}`);
      }
    }

    // Verify tables exist
    console.log('\n6️⃣ Verifying table creation...');
    
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['scraping_jobs', 'scraped_songs', 'scraped_playlists', 'scraped_streams']);

    if (tablesError) {
      console.log('   ⚠️  Could not verify tables (this is normal for some setups)');
    } else {
      console.log(`   ✅ Found ${tablesData.length} structured tables`);
      tablesData.forEach(table => {
        console.log(`      • ${table.table_name}`);
      });
    }

    console.log('\n🎉 Structured tables setup completed successfully!');
    console.log('\n📋 What was created:');
    console.log('   • 4 structured tables for organized scraper data');
    console.log('   • Performance indexes for fast queries');
    console.log('   • Row Level Security policies');
    console.log('   • 3 helpful views for easy data analysis');
    
    console.log('\n📋 Next steps:');
    console.log('   1. Run: node scripts/parse-scraper-data.js');
    console.log('   2. Run: node scripts/view-scraper-data.js');
    console.log('   3. Or run: node scripts/run-complete-scraper-workflow.js');

    // Save configuration for production use
    if (config.environment === 'production') {
      const configFile = {
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
        environment: config.environment,
        tablesCreated: [
          'scraping_jobs',
          'scraped_songs', 
          'scraped_playlists',
          'scraped_streams'
        ],
        viewsCreated: [
          'song_performance_summary',
          'top_playlists_summary',
          'job_summary'
        ],
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync('structured-tables-config.json', JSON.stringify(configFile, null, 2));
      console.log('\n💾 Configuration saved to structured-tables-config.json');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the setup
setupStructuredTables().catch(console.error);
