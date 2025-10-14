-- Migration: Create campaign_playlists table to track playlist performance per campaign
-- This table stores the scraped playlist data showing which playlists contributed streams to which campaigns

CREATE TABLE IF NOT EXISTS campaign_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INTEGER REFERENCES spotify_campaigns(id) ON DELETE CASCADE,
  playlist_name TEXT NOT NULL,
  playlist_curator TEXT, -- e.g., "Spotify", "—" (user), or curator name
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL, -- Link to vendor who placed it
  
  -- Stream metrics per playlist
  streams_7d INTEGER DEFAULT 0,
  streams_28d INTEGER DEFAULT 0,
  streams_12m INTEGER DEFAULT 0,
  
  date_added TEXT, -- Date the song was added to the playlist (from scraper)
  last_scraped TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaign_playlists_campaign_id ON campaign_playlists(campaign_id);
CREATE INDEX idx_campaign_playlists_vendor_id ON campaign_playlists(vendor_id);
CREATE INDEX idx_campaign_playlists_org_id ON campaign_playlists(org_id);
CREATE INDEX idx_campaign_playlists_playlist_name ON campaign_playlists(playlist_name);

-- RLS Policies
ALTER TABLE campaign_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign playlists in their org"
  ON campaign_playlists FOR SELECT
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert campaign playlists in their org"
  ON campaign_playlists FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can update campaign playlists in their org"
  ON campaign_playlists FOR UPDATE
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete campaign playlists in their org"
  ON campaign_playlists FOR DELETE
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_campaign_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_playlists_updated_at
  BEFORE UPDATE ON campaign_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_playlists_updated_at();

-- Comment
COMMENT ON TABLE campaign_playlists IS 'Stores playlist performance data scraped from Spotify for Artists, linking playlists to campaigns and vendors';

