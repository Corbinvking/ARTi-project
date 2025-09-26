#!/usr/bin/env node

/**
 * Manual Table Creation Helper
 * 
 * This script provides the SQL commands to create structured tables manually
 * and tests the connection to ensure everything is ready
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  environment: process.env.NODE_ENV || 'local'
};

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

async function createTablesManual() {
  console.log('🔧 Manual Table Creation Helper\n');
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

    // Check if tables already exist
    console.log('\n2️⃣ Checking existing tables...');
    
    const tables = ['scraping_jobs', 'scraped_songs', 'scraped_playlists', 'scraped_streams'];
    const existingTables = [];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ Table ${table}: Already exists`);
          existingTables.push(table);
        }
      } catch (err) {
        console.log(`   ❌ Table ${table}: ${err.message}`);
      }
    }

    if (existingTables.length === tables.length) {
      console.log('\n🎉 All structured tables already exist!');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: node scripts/parse-scraper-data.js');
      console.log('   2. Run: node scripts/view-scraper-data.js');
      return;
    }

    console.log(`\n📊 Found ${existingTables.length}/${tables.length} existing tables`);
    console.log('\n3️⃣ Manual table creation required...');

    // Provide SQL commands
    console.log('\n📋 SQL Commands to Create Tables:');
    console.log('='.repeat(60));
    console.log('\n1. Open Supabase Studio: http://localhost:54323');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the following SQL commands:\n');

    const sqlCommands = `
-- Create scraping_jobs table
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

-- Create scraped_songs table
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

-- Create scraped_playlists table
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

-- Create scraped_streams table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_org_id ON scraping_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_song_id ON scraping_jobs(song_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_scraped_at ON scraping_jobs(scraped_at);

CREATE INDEX IF NOT EXISTS idx_scraped_songs_org_id ON scraped_songs(org_id);
CREATE INDEX IF NOT EXISTS idx_scraped_songs_job_id ON scraped_songs(job_id);
CREATE INDEX IF NOT EXISTS idx_scraped_songs_song_id ON scraped_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_scraped_songs_time_range ON scraped_songs(time_range);

CREATE INDEX IF NOT EXISTS idx_scraped_playlists_org_id ON scraped_playlists(org_id);
CREATE INDEX IF NOT EXISTS idx_scraped_playlists_job_id ON scraped_playlists(job_id);
CREATE INDEX IF NOT EXISTS idx_scraped_playlists_song_id ON scraped_playlists(song_id);
CREATE INDEX IF NOT EXISTS idx_scraped_playlists_time_range ON scraped_playlists(time_range);
CREATE INDEX IF NOT EXISTS idx_scraped_playlists_streams ON scraped_playlists(streams DESC);

CREATE INDEX IF NOT EXISTS idx_scraped_streams_org_id ON scraped_streams(org_id);
CREATE INDEX IF NOT EXISTS idx_scraped_streams_job_id ON scraped_streams(job_id);
CREATE INDEX IF NOT EXISTS idx_scraped_streams_song_id ON scraped_streams(song_id);
CREATE INDEX IF NOT EXISTS idx_scraped_streams_time_range ON scraped_streams(time_range);
CREATE INDEX IF NOT EXISTS idx_scraped_streams_stream_count ON scraped_streams(stream_count DESC);

-- Enable Row Level Security
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_streams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now)
CREATE POLICY IF NOT EXISTS "Allow all operations on scraping_jobs" ON scraping_jobs FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on scraped_songs" ON scraped_songs FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on scraped_playlists" ON scraped_playlists FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on scraped_streams" ON scraped_streams FOR ALL USING (true);
`;

    console.log(sqlCommands);
    console.log('='.repeat(60));

    console.log('\n4️⃣ After creating tables, run:');
    console.log('   node scripts/test-structured-tables.js');
    console.log('   node scripts/parse-scraper-data.js');
    console.log('   node scripts/view-scraper-data.js');

    // Save SQL to file for easy access
    const fs = require('fs');
    fs.writeFileSync('create-structured-tables.sql', sqlCommands);
    console.log('\n💾 SQL commands saved to: create-structured-tables.sql');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the setup
createTablesManual().catch(console.error);
