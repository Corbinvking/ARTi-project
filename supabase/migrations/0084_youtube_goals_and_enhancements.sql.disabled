-- YouTube campaign enhancements: goals, server tracking, cadence, CSV upload

-- Add like and comment goal fields
ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS like_goal INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS comment_goal INTEGER DEFAULT NULL;

-- Add server auto-selection tracking
ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS like_server_auto_selected BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS comment_server_auto_selected BOOLEAN DEFAULT TRUE;

-- Add API cadence control (keep 3x daily as default)
-- Values: '3x_daily', 'daily', 'manual'
ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS api_poll_cadence TEXT DEFAULT '3x_daily';

-- Add comments CSV file path (for uploaded files vs URL)
ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS comments_csv_file_path TEXT DEFAULT NULL;

-- Add last API poll timestamp for cadence tracking
ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS last_api_poll_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for API polling queries
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_api_poll
  ON public.youtube_campaigns (api_poll_cadence, last_api_poll_at)
  WHERE status IN ('active', 'pending', 'ready');

-- Comment on columns for documentation
COMMENT ON COLUMN public.youtube_campaigns.like_goal IS 'User-set target likes for the campaign';
COMMENT ON COLUMN public.youtube_campaigns.comment_goal IS 'User-set target comments for the campaign';
COMMENT ON COLUMN public.youtube_campaigns.like_server_auto_selected IS 'Whether the like server was auto-selected (true) or manually overridden (false)';
COMMENT ON COLUMN public.youtube_campaigns.comment_server_auto_selected IS 'Whether the comment server was auto-selected (true) or manually overridden (false)';
COMMENT ON COLUMN public.youtube_campaigns.api_poll_cadence IS 'API polling frequency: 3x_daily (default), daily, or manual';
COMMENT ON COLUMN public.youtube_campaigns.comments_csv_file_path IS 'Path to uploaded comments CSV file in storage (alternative to comments_sheet_url)';
COMMENT ON COLUMN public.youtube_campaigns.last_api_poll_at IS 'Timestamp of last successful API stats poll';
