-- Add InfluencePlanner API settings to soundcloud_settings table

ALTER TABLE public.soundcloud_settings
  ADD COLUMN IF NOT EXISTS ip_base_url TEXT DEFAULT 'https://api.influenceplanner.com/partner/v1/',
  ADD COLUMN IF NOT EXISTS ip_username TEXT,
  ADD COLUMN IF NOT EXISTS ip_api_key TEXT;

COMMENT ON COLUMN public.soundcloud_settings.ip_base_url IS 'InfluencePlanner Partner API base URL';
COMMENT ON COLUMN public.soundcloud_settings.ip_username IS 'InfluencePlanner Partner API username';
COMMENT ON COLUMN public.soundcloud_settings.ip_api_key IS 'InfluencePlanner Partner API key (server-side only)';
