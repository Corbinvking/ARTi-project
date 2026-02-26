-- Migration: Create campaign_regions and campaign_regions_history tables
-- Stores per-country stream data scraped from the S4A Location tab

-- Current snapshot: upserted on each scrape run
CREATE TABLE IF NOT EXISTS campaign_regions (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES spotify_campaigns(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  streams_28d INTEGER DEFAULT 0,
  rank INTEGER,
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (campaign_id, country)
);

CREATE INDEX IF NOT EXISTS idx_campaign_regions_campaign_id ON campaign_regions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_regions_org_id ON campaign_regions(org_id);

-- Daily snapshots for trend tracking
CREATE TABLE IF NOT EXISTS campaign_regions_history (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES spotify_campaigns(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  streams_28d INTEGER DEFAULT 0,
  date_recorded DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (campaign_id, country, date_recorded)
);

CREATE INDEX IF NOT EXISTS idx_campaign_regions_history_campaign_id ON campaign_regions_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_regions_history_date ON campaign_regions_history(date_recorded);

-- RLS policies for campaign_regions
ALTER TABLE campaign_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign regions in their org"
  ON campaign_regions FOR SELECT
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert campaign regions in their org"
  ON campaign_regions FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can update campaign regions in their org"
  ON campaign_regions FOR UPDATE
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete campaign regions in their org"
  ON campaign_regions FOR DELETE
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- RLS policies for campaign_regions_history
ALTER TABLE campaign_regions_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign regions history"
  ON campaign_regions_history FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage campaign regions history"
  ON campaign_regions_history FOR ALL
  USING (true);

-- Updated_at trigger for campaign_regions
CREATE OR REPLACE FUNCTION update_campaign_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_regions_updated_at
  BEFORE UPDATE ON campaign_regions
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_regions_updated_at();

COMMENT ON TABLE campaign_regions IS 'Current per-country stream data scraped from S4A Location tab (28-day window)';
COMMENT ON TABLE campaign_regions_history IS 'Daily snapshots of per-country streams for trend tracking';
