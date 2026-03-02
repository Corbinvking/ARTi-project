-- Fix campaign_posts to work with instagram_campaigns (which uses SERIAL integer IDs)
-- The original FK pointed to stream_strategist_campaigns (UUID), but we use this table
-- for Instagram campaign post tracking.

ALTER TABLE campaign_posts DROP CONSTRAINT IF EXISTS campaign_posts_campaign_id_fkey;
ALTER TABLE campaign_posts DROP CONSTRAINT IF EXISTS campaign_posts_creator_id_fkey;

ALTER TABLE campaign_posts ALTER COLUMN campaign_id TYPE TEXT;
