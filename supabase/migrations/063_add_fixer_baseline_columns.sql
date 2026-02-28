-- Add baseline snapshot columns for ratio fixer delta tracking
ALTER TABLE youtube_campaigns
  ADD COLUMN IF NOT EXISTS likes_at_fixer_start INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_at_fixer_start INTEGER DEFAULT 0;

COMMENT ON COLUMN youtube_campaigns.likes_at_fixer_start IS 'Snapshot of current_likes when ratio fixer was started, used to calculate engagement deltas';
COMMENT ON COLUMN youtube_campaigns.comments_at_fixer_start IS 'Snapshot of current_comments when ratio fixer was started, used to calculate engagement deltas';
