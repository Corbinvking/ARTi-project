-- Schedule timeline tracking for SoundCloud campaigns
-- Stores computed schedule window so we can auto-complete campaigns and show timeline markers

ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS ip_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ip_schedule_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ip_schedule_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ip_channels_count INTEGER,
ADD COLUMN IF NOT EXISTS ip_unrepost_after_hours INTEGER,
ADD COLUMN IF NOT EXISTS ip_spread_minutes INTEGER;

CREATE INDEX IF NOT EXISTS idx_sc_campaigns_schedule_end
  ON public.soundcloud_campaigns (ip_schedule_end_at)
  WHERE status = 'Active' AND ip_schedule_end_at IS NOT NULL;

COMMENT ON COLUMN public.soundcloud_campaigns.ip_scheduled_at IS 'When the Influence Planner schedule was created';
COMMENT ON COLUMN public.soundcloud_campaigns.ip_schedule_start_at IS 'When the first repost fires (from settings.date)';
COMMENT ON COLUMN public.soundcloud_campaigns.ip_schedule_end_at IS 'Computed end: start + (channels * spread) + unrepost hours';
COMMENT ON COLUMN public.soundcloud_campaigns.ip_channels_count IS 'Number of channels selected for the schedule';
COMMENT ON COLUMN public.soundcloud_campaigns.ip_unrepost_after_hours IS 'Hours after last repost before unrepost fires';
COMMENT ON COLUMN public.soundcloud_campaigns.ip_spread_minutes IS 'Minutes between each channel repost';
