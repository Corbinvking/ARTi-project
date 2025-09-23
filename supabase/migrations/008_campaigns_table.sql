-- Create unified campaigns table for CSV data

DROP TABLE IF EXISTS campaigns;

CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    platform TEXT,
    campaign_name TEXT,
    client TEXT,
    artist TEXT,
    song TEXT,
    url TEXT,
    status TEXT,
    goal TEXT,
    start_date TEXT,
    salesperson TEXT,
    notes TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_client ON campaigns(client);
CREATE INDEX idx_campaigns_artist ON campaigns(artist);
CREATE INDEX idx_campaigns_status ON campaigns(status);
