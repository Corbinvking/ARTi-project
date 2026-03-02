-- Migration: Add scraper notification tracking fields to youtube_campaigns
-- Purpose: Track when the comment scraper has been notified about a campaign

-- Add scraper notification fields
ALTER TABLE youtube_campaigns
ADD COLUMN IF NOT EXISTS scraper_notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scraper_notification_sent_at TIMESTAMPTZ;

-- Add index for efficient querying of pending notifications
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_scraper_notification 
ON youtube_campaigns (scraper_notification_sent, status) 
WHERE scraper_notification_sent = FALSE OR scraper_notification_sent IS NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN youtube_campaigns.scraper_notification_sent IS 'Whether the comment scraper has been notified to scrape comments for this campaign';
COMMENT ON COLUMN youtube_campaigns.scraper_notification_sent_at IS 'Timestamp when the scraper was notified';
