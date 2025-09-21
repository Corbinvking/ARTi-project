-- PostgreSQL Database Schema to Mirror Airtable Tables
-- This script creates tables that match the Airtable structure for all accessible tables

-- Create schema for Airtable mirrored data
CREATE SCHEMA IF NOT EXISTS airtable_mirror;

-- Grant usage on schema
GRANT USAGE ON SCHEMA airtable_mirror TO postgres;

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLIPSCALE (Campaign Tracker 2025)
CREATE TABLE IF NOT EXISTS airtable_mirror.campaign_tracker_2025 (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    campaign VARCHAR(500),
    client VARCHAR(500),
    update_client TEXT,
    start_date DATE,
    status VARCHAR(100),
    tracker TEXT,
    master_doc TEXT,
    wkly_va_update_notes TEXT,
    va_tracking_sheet TEXT,
    preferred_visual_editing_style TEXT,
    genres TEXT,
    post_goal INTEGER,
    view_goal INTEGER,
    email_1_from_client TEXT,
    email_2_from_client TEXT,
    email_3_from_client TEXT,
    repository TEXT,
    portal_login TEXT,
    portal_pw TEXT,
    salesperson VARCHAR(255),
    salesprice DECIMAL(10,2),
    client_ig TEXT,
    client_yt TEXT,
    invoice TEXT,
    full_name VARCHAR(255),
    client_tt TEXT,
    client_captions TEXT,
    client_handles TEXT,
    fanpages TEXT,
    warmup BOOLEAN,
    va_notes TEXT,
    extra_assets TEXT,
    video_type_samples TEXT,
    songs_to_push_if_artist TEXT,
    tiktok_shop_enabled BOOLEAN,
    hashtags_or_sound_tags TEXT,
    old_va_updates TEXT,
    clipscale_va_updates_2 TEXT,
    update_from_clipscale_va_updates TEXT,
    moodboards TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. YOUTUBE CAMPAIGNS
CREATE TABLE IF NOT EXISTS airtable_mirror.youtube (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    campaign VARCHAR(500),
    service_type VARCHAR(100),
    goal INTEGER,
    remaining INTEGER,
    url TEXT,
    start_date DATE,
    status VARCHAR(100),
    invoice TEXT,
    sale_price DECIMAL(10,2),
    comments TEXT,
    clients TEXT,
    email TEXT,
    salespeople TEXT,
    paid_r BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SOUNDCLOUD CAMPAIGNS
CREATE TABLE IF NOT EXISTS airtable_mirror.soundcloud (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    track_info TEXT,
    service_type VARCHAR(100),
    goal INTEGER,
    remaining INTEGER,
    url TEXT,
    submit_date DATE,
    start_date DATE,
    confirm_start_date BOOLEAN,
    status VARCHAR(100),
    invoice TEXT,
    receipts TEXT,
    sale_price DECIMAL(10,2),
    client VARCHAR(255),
    email TEXT,
    salesperson VARCHAR(255),
    last_modified TIMESTAMP,
    salesperson_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SPOTIFY PLAYLISTING
CREATE TABLE IF NOT EXISTS airtable_mirror.spotify_playlisting (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    campaign VARCHAR(500),
    start_date DATE,
    url TEXT,
    client VARCHAR(255),
    name_from_clients VARCHAR(255),
    goal INTEGER,
    remaining INTEGER,
    daily INTEGER,
    weekly INTEGER,
    salesperson VARCHAR(255),
    status VARCHAR(100),
    vendor VARCHAR(255),
    sale_price DECIMAL(10,2),
    invoice TEXT,
    paid_vendor BOOLEAN,
    curator_status VARCHAR(100),
    playlists TEXT,
    sfa TEXT,
    update_client TEXT,
    email_from_client TEXT,
    name_from_client VARCHAR(255),
    client_email TEXT,
    vendor_email TEXT,
    notify_vendor BOOLEAN,
    last_modified TIMESTAMP,
    sp_playlist_stuff TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. INSTAGRAM SEEDING
CREATE TABLE IF NOT EXISTS airtable_mirror.instagram_seeding (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    campaign VARCHAR(500),
    spend DECIMAL(10,2),
    status VARCHAR(100),
    clients TEXT,
    email_from_clients TEXT,
    name_from_clients VARCHAR(255),
    remaining INTEGER,
    sound_url TEXT,
    tracker TEXT,
    send_tracker BOOLEAN,
    send_final_report BOOLEAN,
    price DECIMAL(10,2),
    invoice TEXT,
    start_date DATE,
    campaign_started BOOLEAN,
    client_notes TEXT,
    last_modified TIMESTAMP,
    paid_ops BOOLEAN,
    salespeople TEXT,
    clients_2 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TIKTOK UGC
CREATE TABLE IF NOT EXISTS airtable_mirror.tiktok_ugc (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    campaign VARCHAR(500),
    spend DECIMAL(10,2),
    status VARCHAR(100),
    clients TEXT,
    email_from_clients TEXT,
    name_from_clients VARCHAR(255),
    remaining INTEGER,
    sound_url TEXT,
    tracker TEXT,
    send_tracker BOOLEAN,
    send_final_report BOOLEAN,
    video_goal INTEGER,
    price DECIMAL(10,2),
    invoice TEXT,
    start_date DATE,
    view_goal INTEGER,
    campaign_started BOOLEAN,
    salespeople TEXT,
    email_from_salespeople TEXT,
    name_from_salespeople VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. SOUNDCLOUD PLAYLISTING
CREATE TABLE IF NOT EXISTS airtable_mirror.soundcloud_playlisting (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    campaign VARCHAR(500),
    goal INTEGER,
    salesperson VARCHAR(255),
    url TEXT,
    clients TEXT,
    email_from_clients TEXT,
    name_from_clients VARCHAR(255),
    remaining INTEGER,
    start_date DATE,
    status VARCHAR(100),
    invoice TEXT,
    paid_d BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. SALESPEOPLE
CREATE TABLE IF NOT EXISTS airtable_mirror.salespeople (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    status VARCHAR(100),
    spotify_playlisting BOOLEAN,
    soundcloud_repost_campaigns BOOLEAN,
    email TEXT,
    youtube_campaigns TEXT,
    campaign_from_youtube_campaigns TEXT,
    clipscale BOOLEAN,
    creative_strat BOOLEAN,
    invoice_requests TEXT,
    ig_seeding TEXT,
    campaign_from_ig_seeding TEXT,
    ig_seeding_2 TEXT,
    tiktok_ads BOOLEAN,
    tiktok_ugc BOOLEAN,
    pref_payment TEXT,
    clients TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. VENDORS
CREATE TABLE IF NOT EXISTS airtable_mirror.vendors (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    email TEXT,
    first VARCHAR(255),
    status VARCHAR(100),
    spotify_playlisting BOOLEAN,
    cost_per_1k DECIMAL(10,2),
    playlists TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. INVOICE REQUESTS
CREATE TABLE IF NOT EXISTS airtable_mirror.invoice_requests (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    name VARCHAR(500),
    salesperson VARCHAR(255),
    stream_view_url TEXT,
    client_email TEXT,
    company VARCHAR(255),
    campaign_details TEXT,
    total DECIMAL(10,2),
    start_date DATE,
    invoice_sent BOOLEAN,
    created TIMESTAMP,
    salesperson_email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. INVOICES
CREATE TABLE IF NOT EXISTS airtable_mirror.invoices (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    name VARCHAR(500),
    project_description TEXT,
    status VARCHAR(100),
    attachment_summary TEXT,
    date DATE,
    invoice_number VARCHAR(100),
    amount DECIMAL(10,2),
    open_balance DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. SP VENDOR UPDATES
CREATE TABLE IF NOT EXISTS airtable_mirror.sp_vendor_updates (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    playlists TEXT,
    spotify_campaign TEXT,
    campaign_from_spotify_playlisting TEXT,
    created TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. CLIPSCALE VA UPDATES
CREATE TABLE IF NOT EXISTS airtable_mirror.clipscale_va_updates (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(255) UNIQUE,
    upated TIMESTAMP,
    clipscale_campaign TEXT,
    campaign_from_clipscale TEXT,
    created TIMESTAMP,
    update TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_tracker_2025_airtable_id ON airtable_mirror.campaign_tracker_2025(airtable_id);
CREATE INDEX IF NOT EXISTS idx_youtube_airtable_id ON airtable_mirror.youtube(airtable_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_airtable_id ON airtable_mirror.soundcloud(airtable_id);
CREATE INDEX IF NOT EXISTS idx_spotify_playlisting_airtable_id ON airtable_mirror.spotify_playlisting(airtable_id);
CREATE INDEX IF NOT EXISTS idx_instagram_seeding_airtable_id ON airtable_mirror.instagram_seeding(airtable_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_ugc_airtable_id ON airtable_mirror.tiktok_ugc(airtable_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_playlisting_airtable_id ON airtable_mirror.soundcloud_playlisting(airtable_id);
CREATE INDEX IF NOT EXISTS idx_salespeople_airtable_id ON airtable_mirror.salespeople(airtable_id);
CREATE INDEX IF NOT EXISTS idx_vendors_airtable_id ON airtable_mirror.vendors(airtable_id);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_airtable_id ON airtable_mirror.invoice_requests(airtable_id);
CREATE INDEX IF NOT EXISTS idx_invoices_airtable_id ON airtable_mirror.invoices(airtable_id);
CREATE INDEX IF NOT EXISTS idx_sp_vendor_updates_airtable_id ON airtable_mirror.sp_vendor_updates(airtable_id);
CREATE INDEX IF NOT EXISTS idx_clipscale_va_updates_airtable_id ON airtable_mirror.clipscale_va_updates(airtable_id);

-- Create indexes for common search fields
CREATE INDEX IF NOT EXISTS idx_campaign_tracker_2025_status ON airtable_mirror.campaign_tracker_2025(status);
CREATE INDEX IF NOT EXISTS idx_youtube_status ON airtable_mirror.youtube(status);
CREATE INDEX IF NOT EXISTS idx_soundcloud_status ON airtable_mirror.soundcloud(status);
CREATE INDEX IF NOT EXISTS idx_spotify_playlisting_status ON airtable_mirror.spotify_playlisting(status);
CREATE INDEX IF NOT EXISTS idx_instagram_seeding_status ON airtable_mirror.instagram_seeding(status);
CREATE INDEX IF NOT EXISTS idx_tiktok_ugc_status ON airtable_mirror.tiktok_ugc(status);
CREATE INDEX IF NOT EXISTS idx_soundcloud_playlisting_status ON airtable_mirror.soundcloud_playlisting(status);
CREATE INDEX IF NOT EXISTS idx_salespeople_status ON airtable_mirror.salespeople(status);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON airtable_mirror.vendors(status);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_invoice_sent ON airtable_mirror.invoice_requests(invoice_sent);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON airtable_mirror.invoices(status);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables to automatically update updated_at
CREATE TRIGGER update_campaign_tracker_2025_updated_at BEFORE UPDATE ON airtable_mirror.campaign_tracker_2025 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_youtube_updated_at BEFORE UPDATE ON airtable_mirror.youtube FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_soundcloud_updated_at BEFORE UPDATE ON airtable_mirror.soundcloud FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spotify_playlisting_updated_at BEFORE UPDATE ON airtable_mirror.spotify_playlisting FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_seeding_updated_at BEFORE UPDATE ON airtable_mirror.instagram_seeding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tiktok_ugc_updated_at BEFORE UPDATE ON airtable_mirror.tiktok_ugc FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_soundcloud_playlisting_updated_at BEFORE UPDATE ON airtable_mirror.soundcloud_playlisting FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salespeople_updated_at BEFORE UPDATE ON airtable_mirror.salespeople FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON airtable_mirror.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_requests_updated_at BEFORE UPDATE ON airtable_mirror.invoice_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON airtable_mirror.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sp_vendor_updates_updated_at BEFORE UPDATE ON airtable_mirror.sp_vendor_updates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clipscale_va_updates_updated_at BEFORE UPDATE ON airtable_mirror.clipscale_va_updates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view to show sync status
CREATE OR REPLACE VIEW airtable_mirror.sync_status AS
SELECT 
    'campaign_tracker_2025' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.campaign_tracker_2025
UNION ALL
SELECT 
    'youtube' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.youtube
UNION ALL
SELECT 
    'soundcloud' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.soundcloud
UNION ALL
SELECT 
    'spotify_playlisting' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.spotify_playlisting
UNION ALL
SELECT 
    'instagram_seeding' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.instagram_seeding
UNION ALL
SELECT 
    'tiktok_ugc' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.tiktok_ugc
UNION ALL
SELECT 
    'soundcloud_playlisting' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.soundcloud_playlisting
UNION ALL
SELECT 
    'salespeople' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.salespeople
UNION ALL
SELECT 
    'vendors' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.vendors
UNION ALL
SELECT 
    'invoice_requests' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.invoice_requests
UNION ALL
SELECT 
    'invoices' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.invoices
UNION ALL
SELECT 
    'sp_vendor_updates' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.sp_vendor_updates
UNION ALL
SELECT 
    'clipscale_va_updates' as table_name,
    COUNT(*) as record_count,
    MAX(last_synced_at) as last_synced
FROM airtable_mirror.clipscale_va_updates;

-- Grant permissions (adjust as needed)
GRANT USAGE ON SCHEMA airtable_mirror TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA airtable_mirror TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA airtable_mirror TO postgres;

COMMENT ON SCHEMA airtable_mirror IS 'Mirror of Airtable data for local operations and analytics';
COMMENT ON TABLE airtable_mirror.campaign_tracker_2025 IS 'Mirror of Clipscale (2025 Campaign Tracker) table from Airtable';
COMMENT ON TABLE airtable_mirror.youtube IS 'Mirror of YouTube campaigns table from Airtable';
COMMENT ON TABLE airtable_mirror.soundcloud IS 'Mirror of SoundCloud campaigns table from Airtable';
COMMENT ON TABLE airtable_mirror.spotify_playlisting IS 'Mirror of Spotify playlisting table from Airtable';
COMMENT ON TABLE airtable_mirror.instagram_seeding IS 'Mirror of Instagram seeding table from Airtable';
COMMENT ON TABLE airtable_mirror.tiktok_ugc IS 'Mirror of TikTok UGC table from Airtable';
COMMENT ON TABLE airtable_mirror.soundcloud_playlisting IS 'Mirror of SoundCloud playlisting table from Airtable';
COMMENT ON TABLE airtable_mirror.salespeople IS 'Mirror of Salespeople table from Airtable';
COMMENT ON TABLE airtable_mirror.vendors IS 'Mirror of Vendors table from Airtable';
COMMENT ON TABLE airtable_mirror.invoice_requests IS 'Mirror of Invoice Requests table from Airtable';
COMMENT ON TABLE airtable_mirror.invoices IS 'Mirror of Invoices table from Airtable';
COMMENT ON TABLE airtable_mirror.sp_vendor_updates IS 'Mirror of SP Vendor Updates table from Airtable';
COMMENT ON TABLE airtable_mirror.clipscale_va_updates IS 'Mirror of Clipscale VA Updates table from Airtable';
