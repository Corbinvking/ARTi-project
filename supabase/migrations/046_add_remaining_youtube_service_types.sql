-- =======================================================
-- Add remaining YouTube service type enum values
-- =======================================================

-- Add missing regional website variants
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'latam_website';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'eur_website';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'aus_website';
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'cad_website';

-- Add custom service type
ALTER TYPE youtube_service_type ADD VALUE IF NOT EXISTS 'custom';

DO $$
BEGIN
  RAISE NOTICE '✅ Added remaining YouTube service type enum values';
END $$;

