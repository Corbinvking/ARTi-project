-- Add track_name column to soundcloud_submissions
-- This allows us to store the parsed track name instead of extracting it from URLs

ALTER TABLE soundcloud_submissions 
ADD COLUMN IF NOT EXISTS track_name TEXT;

-- Create an index for better search performance
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_track_name 
ON soundcloud_submissions(track_name);

-- Backfill track names from existing URLs (best effort)
-- This extracts the slug from the URL and cleans it up
UPDATE soundcloud_submissions
SET track_name = (
  SELECT 
    CASE 
      WHEN track_url IS NULL OR track_url = '' THEN 'Unknown Track'
      ELSE 
        -- Extract URL slug, remove query params, decode, replace hyphens with spaces
        INITCAP(
          REPLACE(
            REPLACE(
              REGEXP_REPLACE(
                SPLIT_PART(
                  SPLIT_PART(track_url, '?', 1),  -- Remove query params
                  '/', 
                  ARRAY_LENGTH(STRING_TO_ARRAY(SPLIT_PART(track_url, '?', 1), '/'), 1)  -- Get last segment
                ),
                '%[0-9A-Fa-f]{2}', ' ', 'g'  -- Basic URL decode
              ),
              '-', ' '
            ),
            '_', ' '
          )
        )
    END
)
WHERE track_name IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN soundcloud_submissions.track_name IS 'Track title - parsed from Track Info or extracted from URL';


