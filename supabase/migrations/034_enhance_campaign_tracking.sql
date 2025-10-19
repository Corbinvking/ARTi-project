-- Enhance spotify_campaigns table with all CSV data fields
ALTER TABLE spotify_campaigns 
ADD COLUMN IF NOT EXISTS daily_streams INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_streams INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_vendor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS curator_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS update_client_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notify_vendor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ask_for_sfa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_modified_csv TIMESTAMP,
ADD COLUMN IF NOT EXISTS historical_playlists TEXT,
ADD COLUMN IF NOT EXISTS playlist_links TEXT;

-- Enhance clients table with additional contact info
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS email_secondary VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_tertiary VARCHAR(255),
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Enhance campaign_playlists table
ALTER TABLE campaign_playlists 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS added_via_csv BOOLEAN DEFAULT FALSE;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_curator_status ON spotify_campaigns(curator_status);
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_paid_vendor ON spotify_campaigns(paid_vendor);
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_notify_vendor ON spotify_campaigns(notify_vendor) WHERE notify_vendor = TRUE;
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_ask_for_sfa ON spotify_campaigns(ask_for_sfa) WHERE ask_for_sfa = TRUE;
CREATE INDEX IF NOT EXISTS idx_clients_verified ON clients(verified);

-- Add comments
COMMENT ON COLUMN spotify_campaigns.daily_streams IS 'Current daily stream rate from CSV';
COMMENT ON COLUMN spotify_campaigns.weekly_streams IS 'Current weekly stream rate from CSV';
COMMENT ON COLUMN spotify_campaigns.paid_vendor IS 'Whether vendor has been paid for this campaign';
COMMENT ON COLUMN spotify_campaigns.curator_status IS 'Playlist curator response status: Accepted, Rejected, Pending, TBD';
COMMENT ON COLUMN spotify_campaigns.update_client_verified IS 'Client data has been verified (from Update Client column)';
COMMENT ON COLUMN spotify_campaigns.notify_vendor IS 'Action flag: needs to notify vendor';
COMMENT ON COLUMN spotify_campaigns.ask_for_sfa IS 'Action flag: needs to request SFA access';
COMMENT ON COLUMN spotify_campaigns.historical_playlists IS 'Playlists listed in CSV Playlists column';
COMMENT ON COLUMN spotify_campaigns.playlist_links IS 'Additional playlist URLs from SP Playlist Stuff column';
COMMENT ON COLUMN clients.email_secondary IS 'Secondary email from CSV';
COMMENT ON COLUMN clients.email_tertiary IS 'Tertiary email from CSV';
COMMENT ON COLUMN clients.verified IS 'Client data verified in CSV';

