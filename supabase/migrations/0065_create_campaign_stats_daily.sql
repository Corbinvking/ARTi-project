-- Migration: Create campaign_stats_daily table for historical YouTube stats tracking
-- Purpose: Store daily snapshots of YouTube campaign performance (3x daily collection)
-- Date: 2025-12-18

-- Create campaign_stats_daily table
CREATE TABLE IF NOT EXISTS campaign_stats_daily (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES youtube_campaigns(id) ON DELETE CASCADE,
    date date NOT NULL,
    time_of_day text NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening')),
    views bigint NOT NULL DEFAULT 0,
    likes bigint NOT NULL DEFAULT 0,
    comments bigint NOT NULL DEFAULT 0,
    total_subscribers bigint DEFAULT NULL,
    subscribers_gained bigint DEFAULT 0,
    collected_at timestamptz NOT NULL DEFAULT now(),
    
    -- Prevent duplicate entries for same campaign/date/time_of_day
    CONSTRAINT unique_campaign_daily_snapshot UNIQUE (campaign_id, date, time_of_day)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_campaign_stats_daily_campaign_id ON campaign_stats_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_stats_daily_date ON campaign_stats_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_stats_daily_campaign_date ON campaign_stats_daily(campaign_id, date DESC);

-- Enable RLS
ALTER TABLE campaign_stats_daily ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view campaign stats" ON campaign_stats_daily;
DROP POLICY IF EXISTS "System can insert campaign stats" ON campaign_stats_daily;

-- RLS Policies
CREATE POLICY "Users can view campaign stats"
ON campaign_stats_daily
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert campaign stats"
ON campaign_stats_daily
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update campaign stats"
ON campaign_stats_daily
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow service role full access (for API/worker operations)
DROP POLICY IF EXISTS "Service role has full access" ON campaign_stats_daily;
CREATE POLICY "Service role has full access"
ON campaign_stats_daily
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE campaign_stats_daily IS 'Historical daily snapshots of YouTube campaign performance metrics (collected 3x daily)';
COMMENT ON COLUMN campaign_stats_daily.time_of_day IS 'Time of day when stats were collected: morning (8AM), afternoon (2PM), evening (8PM)';

