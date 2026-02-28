-- Time-series snapshots for ratio fixer performance tracking.
-- The bridge inserts a row every ~5 minutes while the fixer is running,
-- giving the frontend enough data points to render a performance chart.

CREATE TABLE IF NOT EXISTS ratio_fixer_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  campaign_id   UUID NOT NULL REFERENCES youtube_campaigns(id) ON DELETE CASCADE,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Video stats from Flask at this moment
  views         INTEGER NOT NULL DEFAULT 0,
  likes         INTEGER NOT NULL DEFAULT 0,
  comments      INTEGER NOT NULL DEFAULT 0,

  -- Engagement ordered so far
  ordered_likes    INTEGER NOT NULL DEFAULT 0,
  ordered_comments INTEGER NOT NULL DEFAULT 0,

  -- Target engagement from Flask regression
  desired_likes    INTEGER NOT NULL DEFAULT 0,
  desired_comments INTEGER NOT NULL DEFAULT 0,

  -- Flask status string (e.g. "monitoring", "ordering likes", etc.)
  flask_status  TEXT
);

CREATE INDEX IF NOT EXISTS idx_rfs_campaign_time
  ON ratio_fixer_snapshots (campaign_id, recorded_at DESC);

-- Keep the table lean: auto-delete snapshots older than 30 days
-- (can be run via pg_cron or a manual cleanup job)
COMMENT ON TABLE ratio_fixer_snapshots IS
  'Periodic snapshots of ratio fixer stats for performance charting. Inserted by the Fastify bridge every ~5 minutes.';
