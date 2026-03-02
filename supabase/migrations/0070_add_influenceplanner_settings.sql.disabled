-- Add InfluencePlanner API settings to soundcloud settings table

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ip_base_url TEXT DEFAULT 'https://api.influenceplanner.com/partner/v1/',
  ADD COLUMN IF NOT EXISTS ip_username TEXT,
  ADD COLUMN IF NOT EXISTS ip_api_key TEXT;

COMMENT ON COLUMN public.settings.ip_base_url IS 'InfluencePlanner Partner API base URL';
COMMENT ON COLUMN public.settings.ip_username IS 'InfluencePlanner Partner API username';
COMMENT ON COLUMN public.settings.ip_api_key IS 'InfluencePlanner Partner API key (server-side only)';
