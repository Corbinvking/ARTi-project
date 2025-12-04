-- Migration: Add instagram_url field to instagram_campaigns for scraper to use
-- This field stores the Instagram profile or post URL to scrape for each campaign

-- Add instagram_url column
ALTER TABLE public.instagram_campaigns
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Add last_scraped_at column to track when scraper last ran
ALTER TABLE public.instagram_campaigns
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

-- Add scraper_enabled flag to control which campaigns get scraped
ALTER TABLE public.instagram_campaigns
ADD COLUMN IF NOT EXISTS scraper_enabled BOOLEAN DEFAULT false;

-- Create index for scraper queries (only enabled campaigns with URLs)
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_scraper 
ON public.instagram_campaigns(scraper_enabled, instagram_url) 
WHERE scraper_enabled = true AND instagram_url IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.instagram_campaigns.instagram_url IS 'Instagram profile URL or post URL to scrape for analytics';
COMMENT ON COLUMN public.instagram_campaigns.last_scraped_at IS 'Timestamp of last successful scrape';
COMMENT ON COLUMN public.instagram_campaigns.scraper_enabled IS 'Whether this campaign should be included in daily scraper runs';

