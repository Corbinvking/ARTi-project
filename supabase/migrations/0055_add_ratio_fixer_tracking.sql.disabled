-- Migration: Add Ratio Fixer tracking columns to youtube_campaigns
-- This enables integration with the Flask Ratio Fixer app for automated engagement ordering

-- Add columns to track Ratio Fixer state
ALTER TABLE youtube_campaigns
  ADD COLUMN IF NOT EXISTS ratio_fixer_campaign_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS ratio_fixer_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ratio_fixer_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ratio_fixer_stopped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS desired_likes INTEGER,
  ADD COLUMN IF NOT EXISTS desired_comments INTEGER,
  ADD COLUMN IF NOT EXISTS ordered_likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ordered_comments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ratio_fixer_last_check TIMESTAMPTZ;

-- Add comments to document the columns
COMMENT ON COLUMN youtube_campaigns.ratio_fixer_campaign_id IS 'UUID of the campaign in the Flask Ratio Fixer app';
COMMENT ON COLUMN youtube_campaigns.ratio_fixer_status IS 'Status of ratio fixer: idle, starting, running, stopping, stopped, error';
COMMENT ON COLUMN youtube_campaigns.ratio_fixer_started_at IS 'When the ratio fixer was last started for this campaign';
COMMENT ON COLUMN youtube_campaigns.ratio_fixer_stopped_at IS 'When the ratio fixer was last stopped for this campaign';
COMMENT ON COLUMN youtube_campaigns.desired_likes IS 'ML-calculated target likes based on current views and genre';
COMMENT ON COLUMN youtube_campaigns.desired_comments IS 'ML-calculated target comments based on current views and genre';
COMMENT ON COLUMN youtube_campaigns.ordered_likes IS 'Total likes ordered from JingleSMM for this campaign';
COMMENT ON COLUMN youtube_campaigns.ordered_comments IS 'Total comments ordered from JingleSMM for this campaign';
COMMENT ON COLUMN youtube_campaigns.ratio_fixer_last_check IS 'Last time we checked ratio fixer status';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_ratio_fixer_campaign_id 
  ON youtube_campaigns(ratio_fixer_campaign_id);

CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_ratio_fixer_status 
  ON youtube_campaigns(ratio_fixer_status);

-- Create a table to track individual orders placed through JingleSMM
CREATE TABLE IF NOT EXISTS youtube_ratio_fixer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES youtube_campaigns(id) ON DELETE CASCADE,
  ratio_fixer_campaign_id VARCHAR(36),
  
  -- Order details
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('likes', 'comments')),
  service_id INTEGER NOT NULL,
  service_name TEXT,
  quantity INTEGER NOT NULL,
  
  -- JingleSMM tracking
  jingle_order_id VARCHAR(50),
  jingle_status VARCHAR(20), -- Pending, In progress, Completed, Canceled
  
  -- Cost tracking
  cost DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Timestamps
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE youtube_ratio_fixer_orders IS 'Tracks individual engagement orders placed through JingleSMM for ratio fixing';
COMMENT ON COLUMN youtube_ratio_fixer_orders.order_type IS 'Type of engagement ordered: likes or comments';
COMMENT ON COLUMN youtube_ratio_fixer_orders.service_id IS 'JingleSMM service ID used for this order';
COMMENT ON COLUMN youtube_ratio_fixer_orders.quantity IS 'Number of engagements ordered';
COMMENT ON COLUMN youtube_ratio_fixer_orders.jingle_order_id IS 'Order ID returned from JingleSMM API';
COMMENT ON COLUMN youtube_ratio_fixer_orders.jingle_status IS 'Current status of the order from JingleSMM';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_orders_campaign_id 
  ON youtube_ratio_fixer_orders(campaign_id);

CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_orders_org_id 
  ON youtube_ratio_fixer_orders(org_id);

CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_orders_jingle_order_id 
  ON youtube_ratio_fixer_orders(jingle_order_id);

CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_orders_ordered_at 
  ON youtube_ratio_fixer_orders(ordered_at DESC);

-- Add RLS policies
ALTER TABLE youtube_ratio_fixer_orders ENABLE ROW LEVEL SECURITY;

-- Allow users to view orders for their org
CREATE POLICY "Users can view ratio fixer orders for their org"
  ON youtube_ratio_fixer_orders
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert orders for their org
CREATE POLICY "Users can create ratio fixer orders for their org"
  ON youtube_ratio_fixer_orders
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Allow users to update orders for their org
CREATE POLICY "Users can update ratio fixer orders for their org"
  ON youtube_ratio_fixer_orders
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_youtube_ratio_fixer_orders_updated_at
  BEFORE UPDATE ON youtube_ratio_fixer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

