-- Instagram Campaign Enhancements
-- Adds client Instagram handle and IG Sound URL fields

ALTER TABLE public.instagram_campaigns
ADD COLUMN IF NOT EXISTS client_instagram_handle TEXT;

ALTER TABLE public.instagram_campaigns
ADD COLUMN IF NOT EXISTS ig_sound_url TEXT;

COMMENT ON COLUMN public.instagram_campaigns.client_instagram_handle IS 'Client real Instagram @ handle';
COMMENT ON COLUMN public.instagram_campaigns.ig_sound_url IS 'Instagram audio/sound URL for pages to use (not SoundCloud/Spotify)';
