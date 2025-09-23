-- Create platform-specific campaign tables for CSV data recovery

-- Spotify campaigns table
CREATE TABLE IF NOT EXISTS spotify_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name TEXT,
    artist TEXT,
    song TEXT,
    playlist TEXT,
    date_added DATE,
    streams BIGINT,
    playlist_followers BIGINT,
    playlist_reach BIGINT,
    platform TEXT DEFAULT 'spotify',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SoundCloud campaigns table  
CREATE TABLE IF NOT EXISTS soundcloud_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name TEXT,
    artist TEXT,
    song TEXT,
    track_url TEXT,
    plays BIGINT,
    likes BIGINT,
    comments BIGINT,
    reposts BIGINT,
    platform TEXT DEFAULT 'soundcloud',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- YouTube campaigns table
CREATE TABLE IF NOT EXISTS youtube_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name TEXT,
    artist TEXT,
    song TEXT,
    video_url TEXT,
    views BIGINT,
    likes BIGINT,
    comments BIGINT,
    subscribers_gained BIGINT,
    platform TEXT DEFAULT 'youtube',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instagram campaigns table
CREATE TABLE IF NOT EXISTS instagram_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name TEXT,
    artist TEXT,
    song TEXT,
    post_url TEXT,
    likes BIGINT,
    comments BIGINT,
    shares BIGINT,
    reach BIGINT,
    platform TEXT DEFAULT 'instagram',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_artist ON spotify_campaigns(artist);
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_song ON spotify_campaigns(song);
CREATE INDEX IF NOT EXISTS idx_soundcloud_campaigns_artist ON soundcloud_campaigns(artist);
CREATE INDEX IF NOT EXISTS idx_soundcloud_campaigns_song ON soundcloud_campaigns(song);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_artist ON youtube_campaigns(artist);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_song ON youtube_campaigns(song);
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_artist ON instagram_campaigns(artist);
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_song ON instagram_campaigns(song);
