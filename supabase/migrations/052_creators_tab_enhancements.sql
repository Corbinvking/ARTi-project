-- Migration: Enhance creators table for new Creators Tab
-- Adds auto-computed geo columns, scraping metadata

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS account_territory TEXT DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS account_territory_confidence TEXT DEFAULT 'Low',
  ADD COLUMN IF NOT EXISTS audience_territory TEXT DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS audience_territory_confidence TEXT DEFAULT 'Low',
  ADD COLUMN IF NOT EXISTS followers_last_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement_last_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scrape_status TEXT DEFAULT 'pending';

-- Backfill account_territory from base_country where possible
UPDATE public.creators
SET account_territory = CASE
  WHEN base_country IN ('United States','US','USA') THEN 'US'
  WHEN base_country IN ('United Kingdom','UK','GB') THEN 'UK'
  WHEN base_country IN ('Canada','CA') THEN 'CA'
  WHEN base_country IN ('Brazil','Mexico','Argentina','Colombia','Chile','Peru','Venezuela') THEN 'LATAM'
  WHEN base_country IN ('Germany','France','Spain','Italy','Netherlands','Belgium','Sweden','Norway','Denmark','Poland','Czech Republic','Hungary','Romania') THEN 'EU'
  ELSE 'Global'
END,
account_territory_confidence = 'Med'
WHERE account_territory = 'Unknown' AND base_country IS NOT NULL AND base_country != '';

-- Index for territory-based filtering
CREATE INDEX IF NOT EXISTS idx_creators_account_territory ON public.creators(account_territory);
CREATE INDEX IF NOT EXISTS idx_creators_audience_territory ON public.creators(audience_territory);
CREATE INDEX IF NOT EXISTS idx_creators_scrape_status ON public.creators(scrape_status);
