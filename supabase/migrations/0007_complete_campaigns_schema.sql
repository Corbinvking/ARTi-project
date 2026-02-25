-- COMPLETE CAMPAIGNS SCHEMA for ALL CSV files
-- This schema accommodates ALL columns from all 4 CSV files

DROP TABLE IF EXISTS campaigns CASCADE;

CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  
  -- SPOTIFY FIELDS (26 columns)
  campaign TEXT,
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
  spotify_campaign_from_sp_vendor_updates TEXT,
  
  -- SOUNDCLOUD FIELDS (19 columns)
  track_info TEXT,
  clients TEXT,
  service_type TEXT,
  receipts TEXT,
  confirm_start_date TEXT,
  send_receipts TEXT,
  ask_client_for_playlist TEXT,
  salesperson_email TEXT,
  
  -- YOUTUBE FIELDS (19 columns)
  desired_daily TEXT,
  ask_for_access TEXT,
  ask_client_for_yt_ss TEXT,
  views_stalled TEXT,
  paid_r TEXT,
  comments TEXT,
  in_fixer TEXT,
  client_notes TEXT,
  
  -- INSTAGRAM FIELDS (17 columns)
  price TEXT,
  spend TEXT,
  sound_url TEXT,
  tracker TEXT,
  campaign_started TEXT,
  send_tracker TEXT,
  send_final_report TEXT,
  salespeople TEXT,
  report_notes TEXT,
  paid_ops TEXT,
  
  -- COMPUTED/DERIVED FIELDS
  artist TEXT, -- extracted from campaign/track_info
  song TEXT,   -- extracted from campaign/track_info
  
  -- Store complete raw data for analysis
  raw_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_client ON campaigns(client);
CREATE INDEX idx_campaigns_clients ON campaigns(clients);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_artist ON campaigns(artist);
CREATE INDEX idx_campaigns_campaign ON campaigns(campaign);
CREATE INDEX idx_campaigns_track_info ON campaigns(track_info);
CREATE INDEX idx_campaigns_salesperson ON campaigns(salesperson);
CREATE INDEX idx_campaigns_raw_data ON campaigns USING GIN(raw_data);

-- Enable RLS for multi-tenant security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy (allow all for now, can refine later)
CREATE POLICY "Allow all access for now" ON campaigns
  FOR ALL USING (true);
