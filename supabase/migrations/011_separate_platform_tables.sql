-- Create separate tables for each CSV platform with exact column structures

-- SPOTIFY CAMPAIGNS TABLE
DROP TABLE IF EXISTS spotify_campaigns CASCADE;

CREATE TABLE spotify_campaigns (
  id SERIAL PRIMARY KEY,
  "campaign" TEXT,
  "client" TEXT,
  "goal" TEXT,
  "salesperson" TEXT,
  "remaining" TEXT,
  "daily" TEXT,
  "weekly" TEXT,
  "url" TEXT,
  "sale_price" TEXT,
  "start_date" TEXT,
  "status" TEXT,
  "invoice" TEXT,
  "vendor" TEXT,
  "paid_vendor" TEXT,
  "curator_status" TEXT,
  "playlists" TEXT,
  "sfa" TEXT,
  "notify_vendor" TEXT,
  "ask_for_sfa" TEXT,
  "update_client" TEXT,
  "client_email" TEXT,
  "vendor_email" TEXT,
  "notes" TEXT,
  "last_modified" TEXT,
  "sp_vendor_updates" TEXT,
  "spotify_campaign_from_sp_vendor_updates" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SOUNDCLOUD CAMPAIGNS TABLE  
DROP TABLE IF EXISTS soundcloud_campaigns CASCADE;

CREATE TABLE soundcloud_campaigns (
  id SERIAL PRIMARY KEY,
  "track_info" TEXT,
  "client" TEXT,
  "service_type" TEXT,
  "goal" TEXT,
  "remaining" TEXT,
  "status" TEXT,
  "url" TEXT,
  "submit_date" TEXT,
  "start_date" TEXT,
  "receipts" TEXT,
  "salesperson" TEXT,
  "invoice" TEXT,
  "sale_price" TEXT,
  "confirm_start_date" TEXT,
  "notes" TEXT,
  "send_receipts" TEXT,
  "ask_client_for_playlist" TEXT,
  "last_modified" TEXT,
  "salesperson_email" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- YOUTUBE CAMPAIGNS TABLE
DROP TABLE IF EXISTS youtube_campaigns CASCADE;

CREATE TABLE youtube_campaigns (
  id SERIAL PRIMARY KEY,
  "campaign" TEXT,
  "clients" TEXT,
  "service_type" TEXT,
  "goal" TEXT,
  "remaining" TEXT,
  "desired_daily" TEXT,
  "url" TEXT,
  "start_date" TEXT,
  "status" TEXT,
  "confirm_start_date" TEXT,
  "ask_for_access" TEXT,
  "ask_client_for_yt_ss" TEXT,
  "views_stalled" TEXT,
  "paid_r" TEXT,
  "sale_price" TEXT,
  "invoice" TEXT,
  "comments" TEXT,
  "in_fixer" TEXT,
  "client_notes" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INSTAGRAM CAMPAIGNS TABLE
DROP TABLE IF EXISTS instagram_campaigns CASCADE;

CREATE TABLE instagram_campaigns (
  id SERIAL PRIMARY KEY,
  "campaign" TEXT,
  "clients" TEXT,
  "start_date" TEXT,
  "price" TEXT,
  "spend" TEXT,
  "remaining" TEXT,
  "sound_url" TEXT,
  "status" TEXT,
  "tracker" TEXT,
  "campaign_started" TEXT,
  "send_tracker" TEXT,
  "send_final_report" TEXT,
  "invoice" TEXT,
  "salespeople" TEXT,
  "report_notes" TEXT,
  "client_notes" TEXT,
  "paid_ops" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS on all tables so data is visible in Studio
ALTER TABLE spotify_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE soundcloud_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_campaigns DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_spotify_campaigns_client ON spotify_campaigns(client);
CREATE INDEX idx_spotify_campaigns_status ON spotify_campaigns(status);
CREATE INDEX idx_soundcloud_campaigns_client ON soundcloud_campaigns(client);
CREATE INDEX idx_soundcloud_campaigns_status ON soundcloud_campaigns(status);
CREATE INDEX idx_youtube_campaigns_clients ON youtube_campaigns(clients);
CREATE INDEX idx_youtube_campaigns_status ON youtube_campaigns(status);
CREATE INDEX idx_instagram_campaigns_clients ON instagram_campaigns(clients);
CREATE INDEX idx_instagram_campaigns_status ON instagram_campaigns(status);
