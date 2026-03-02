-- Add tracking columns to campaign_posts for live post analytics
ALTER TABLE campaign_posts
  ADD COLUMN IF NOT EXISTS tracked_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracked_likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracked_comments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'pending'
    CHECK (tracking_status IN ('pending', 'active', 'failed'));
