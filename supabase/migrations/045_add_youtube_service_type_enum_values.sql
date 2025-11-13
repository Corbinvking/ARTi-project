-- =======================================================
-- Add missing YouTube service type enum values
-- =======================================================

-- Add all missing service types from CSV data
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'ww_display';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'ww_skip';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'us_skip';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'ww_website';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'us_display';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'us_website';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'latam_display';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'eur_display';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'eur_skip';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'aus_display';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'aus_skip';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'cad_display';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'engagements_only';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'ww_website_ads';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'us_website_ads';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'youtube_eng._ad';

DO $$
BEGIN
  RAISE NOTICE '✅ Added missing YouTube service type enum values';
END $$;

