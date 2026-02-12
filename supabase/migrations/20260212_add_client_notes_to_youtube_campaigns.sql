-- Add client_notes column to youtube_campaigns
-- Used for per-campaign notes from the client (e.g., "ASIA Skip", special instructions)

ALTER TABLE public.youtube_campaigns
  ADD COLUMN IF NOT EXISTS client_notes TEXT DEFAULT NULL;

COMMENT ON COLUMN public.youtube_campaigns.client_notes IS 'Per-campaign notes from/about the client';

DO $$
BEGIN
  RAISE NOTICE '✅ Added client_notes column to youtube_campaigns';
END $$;
