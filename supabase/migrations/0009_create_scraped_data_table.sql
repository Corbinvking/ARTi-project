-- Create table for storing scraped Spotify data
CREATE TABLE IF NOT EXISTS scraped_data (
    id SERIAL PRIMARY KEY,
    org_id UUID,
    platform TEXT DEFAULT 'spotify',
    song_url TEXT NOT NULL,
    artist_name TEXT,
    song_title TEXT,
    album_name TEXT,
    release_date DATE,
    duration_ms INTEGER,
    popularity INTEGER,
    explicit BOOLEAN,
    genres TEXT[],
    external_urls JSONB,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraped_data_org_platform ON scraped_data(org_id, platform);
CREATE INDEX IF NOT EXISTS idx_scraped_data_scraped_at ON scraped_data(scraped_at);
CREATE INDEX IF NOT EXISTS idx_scraped_data_artist_song ON scraped_data(artist_name, song_title);

-- Add RLS policies
ALTER TABLE scraped_data ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their org's data
CREATE POLICY "Users can view their org's scraped data" ON scraped_data
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for service role to insert data
CREATE POLICY "Service role can insert scraped data" ON scraped_data
    FOR INSERT WITH CHECK (true);

-- Policy for service role to update data
CREATE POLICY "Service role can update scraped data" ON scraped_data
    FOR UPDATE USING (true);
