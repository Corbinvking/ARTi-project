-- Create structured tables for Spotify scraper data
-- This migration creates a proper relational structure for scraped data

-- 1. Scraping Jobs table - tracks each scraping job
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

-- 2. Scraped Songs table - song data per time range
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

-- 3. Scraped Playlists table - individual playlist data
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

-- 4. Scraped Streams table - detailed stream data
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_org_id ON scraping_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_song_id ON scraping_jobs(song_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_scraped_at ON scraping_jobs(scraped_at);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);

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

-- Create a view for easy querying of song performance across time ranges
CREATE OR REPLACE VIEW song_performance_summary AS
SELECT 
    s.org_id,
    s.song_id,
    s.song_url,
    s.time_range,
    s.total_playlists,
    s.total_streams,
    s.scraped_at,
    -- Calculate performance metrics
    CASE 
        WHEN s.time_range = '28day' THEN 'Recent Performance'
        WHEN s.time_range = '7day' THEN 'Weekly Performance'
        WHEN s.time_range = '12months' THEN 'Annual Performance'
    END as performance_period,
    -- Rank within time range
    ROW_NUMBER() OVER (PARTITION BY s.time_range ORDER BY s.total_streams DESC) as stream_rank,
    ROW_NUMBER() OVER (PARTITION BY s.time_range ORDER BY s.total_playlists DESC) as playlist_rank
FROM scraped_songs s
ORDER BY s.time_range, s.total_streams DESC;

-- Create a view for top playlists across all songs
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
    -- Calculate playlist performance metrics
    COUNT(*) OVER (PARTITION BY p.playlist_name, p.time_range) as playlist_frequency,
    SUM(p.streams) OVER (PARTITION BY p.playlist_name, p.time_range) as total_playlist_streams,
    ROW_NUMBER() OVER (PARTITION BY p.time_range ORDER BY p.streams DESC) as global_rank
FROM scraped_playlists p
ORDER BY p.time_range, p.streams DESC;

-- Create a view for job summaries
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
    -- Calculate job metrics
    COUNT(DISTINCT s.time_range) as time_ranges_processed,
    COUNT(DISTINCT p.id) as total_playlists_found,
    COUNT(DISTINCT st.id) as total_stream_records,
    -- Performance indicators
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

-- Add RLS policies
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_streams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on scraping_jobs" ON scraping_jobs FOR ALL USING (true);
CREATE POLICY "Allow all operations on scraped_songs" ON scraped_songs FOR ALL USING (true);
CREATE POLICY "Allow all operations on scraped_playlists" ON scraped_playlists FOR ALL USING (true);
CREATE POLICY "Allow all operations on scraped_streams" ON scraped_streams FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE scraping_jobs IS 'Tracks each scraping job with metadata and summary statistics';
COMMENT ON TABLE scraped_songs IS 'Song data aggregated by time range (28day, 7day, 12months)';
COMMENT ON TABLE scraped_playlists IS 'Individual playlist data with stream counts and rankings';
COMMENT ON TABLE scraped_streams IS 'Detailed stream data per playlist per time range';

COMMENT ON VIEW song_performance_summary IS 'Easy querying of song performance across time ranges with rankings';
COMMENT ON VIEW top_playlists_summary IS 'Top playlists across all songs with performance metrics';
COMMENT ON VIEW job_summary IS 'Comprehensive job summaries with performance categories';
