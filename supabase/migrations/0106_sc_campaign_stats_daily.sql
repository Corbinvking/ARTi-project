-- Historical daily stats for SoundCloud campaigns (mirrors YouTube's campaign_stats_daily)
CREATE TABLE IF NOT EXISTS sc_campaign_stats_daily (
  id            BIGSERIAL PRIMARY KEY,
  campaign_id   INTEGER NOT NULL REFERENCES soundcloud_campaigns(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  playback_count INTEGER DEFAULT 0,
  likes_count    INTEGER DEFAULT 0,
  reposts_count  INTEGER DEFAULT 0,
  comment_count  INTEGER DEFAULT 0,
  artist_followers INTEGER,
  collected_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sc_stats_daily_campaign
  ON sc_campaign_stats_daily (campaign_id, date);
