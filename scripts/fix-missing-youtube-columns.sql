-- Add missing columns to youtube_campaigns in production
-- These columns exist in the TypeScript types but were never migrated

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS like_goal INTEGER DEFAULT NULL;

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS comment_goal INTEGER DEFAULT NULL;

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS api_poll_cadence TEXT DEFAULT '3x_daily';

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS last_api_poll_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS comments_csv_file_path TEXT DEFAULT NULL;

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS like_server_auto_selected BOOLEAN DEFAULT TRUE;

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS comment_server_auto_selected BOOLEAN DEFAULT TRUE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'Added missing columns: like_goal, comment_goal, api_poll_cadence, last_api_poll_at, comments_csv_file_path, like_server_auto_selected, comment_server_auto_selected';
END $$;
