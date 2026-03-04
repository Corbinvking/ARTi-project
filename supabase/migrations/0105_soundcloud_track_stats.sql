-- Add SoundCloud track stats columns to soundcloud_campaigns
-- These are populated by the Apify SoundCloud scraper (actor T7Ee1ggCzRUSaUgme)

ALTER TABLE soundcloud_campaigns
  ADD COLUMN IF NOT EXISTS sc_track_id       BIGINT,
  ADD COLUMN IF NOT EXISTS playback_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reposts_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS genre             TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms       INTEGER,
  ADD COLUMN IF NOT EXISTS artwork_url       TEXT,
  ADD COLUMN IF NOT EXISTS artist_username   TEXT,
  ADD COLUMN IF NOT EXISTS artist_followers  INTEGER,
  ADD COLUMN IF NOT EXISTS last_scraped_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scrape_data       JSONB;
