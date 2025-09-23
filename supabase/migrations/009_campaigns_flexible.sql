-- STAGE 1.2: Flexible campaigns table for all CSV data

DROP TABLE IF EXISTS campaigns CASCADE;

CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  
  -- Common fields across all platforms (matching actual CSV headers)
  campaign_name TEXT,
  client TEXT,
  goal TEXT,
  salesperson TEXT,
  remaining TEXT,
  daily TEXT,
  weekly TEXT,
  url TEXT,
  sale_price TEXT,
  start_date TEXT,
  status TEXT,
  invoice TEXT,
  vendor TEXT,
  paid_vendor TEXT,
  curator_status TEXT,
  playlists TEXT,
  sfa TEXT,
  notify_vendor TEXT,
  ask_for_sfa TEXT,
  update_client TEXT,
  client_email TEXT,
  vendor_email TEXT,
  notes TEXT,
  last_modified TEXT,
  sp_vendor_updates TEXT,
  spotify_campaign TEXT,
  
  -- Additional flexible fields for all platforms
  artist TEXT,
  song TEXT,
  track TEXT,
  video_url TEXT,
  post_url TEXT,
  
  -- Store complete raw data for analysis
  raw_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_client ON campaigns(client);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_artist ON campaigns(artist);
CREATE INDEX idx_campaigns_raw_data ON campaigns USING GIN(raw_data);

-- Enable RLS for multi-tenant security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy (can be refined later)
CREATE POLICY "Allow all access for now" ON campaigns
  FOR ALL USING (true);
