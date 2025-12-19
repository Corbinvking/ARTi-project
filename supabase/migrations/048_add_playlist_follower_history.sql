-- Migration: Add playlist follower history tracking
-- This allows tracking follower growth over time for sparkline graphs

-- Create table to store daily follower snapshots
CREATE TABLE IF NOT EXISTS playlist_follower_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    follower_count INTEGER NOT NULL,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One snapshot per playlist per day
    UNIQUE (playlist_id, recorded_at)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_playlist_follower_history_playlist_id 
    ON playlist_follower_history(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_follower_history_recorded_at 
    ON playlist_follower_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_follower_history_lookup 
    ON playlist_follower_history(playlist_id, recorded_at DESC);

-- Add RLS policy
ALTER TABLE playlist_follower_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read follower history
DROP POLICY IF EXISTS "Allow authenticated read of follower history" ON playlist_follower_history;
CREATE POLICY "Allow authenticated read of follower history" 
    ON playlist_follower_history FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to insert/update
DROP POLICY IF EXISTS "Allow service role full access to follower history" ON playlist_follower_history;
CREATE POLICY "Allow service role full access to follower history" 
    ON playlist_follower_history FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to automatically record follower count when playlist is updated
CREATE OR REPLACE FUNCTION record_follower_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if follower_count is being updated and is different
    IF NEW.follower_count IS NOT NULL AND 
       (OLD.follower_count IS NULL OR NEW.follower_count != OLD.follower_count) THEN
        -- Insert or update today's snapshot
        INSERT INTO playlist_follower_history (playlist_id, follower_count, recorded_at)
        VALUES (NEW.id, NEW.follower_count, CURRENT_DATE)
        ON CONFLICT (playlist_id, recorded_at) 
        DO UPDATE SET 
            follower_count = EXCLUDED.follower_count,
            created_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_record_follower_snapshot ON playlists;
CREATE TRIGGER trigger_record_follower_snapshot
    AFTER UPDATE OF follower_count ON playlists
    FOR EACH ROW
    EXECUTE FUNCTION record_follower_snapshot();

-- Also trigger on INSERT to capture initial follower count
DROP TRIGGER IF EXISTS trigger_record_follower_snapshot_insert ON playlists;
CREATE TRIGGER trigger_record_follower_snapshot_insert
    AFTER INSERT ON playlists
    FOR EACH ROW
    WHEN (NEW.follower_count IS NOT NULL AND NEW.follower_count > 0)
    EXECUTE FUNCTION record_follower_snapshot();

-- Backfill existing playlists with current follower count as first snapshot
INSERT INTO playlist_follower_history (playlist_id, follower_count, recorded_at)
SELECT id, follower_count, CURRENT_DATE
FROM playlists
WHERE follower_count IS NOT NULL AND follower_count > 0
ON CONFLICT (playlist_id, recorded_at) DO NOTHING;

COMMENT ON TABLE playlist_follower_history IS 'Daily snapshots of playlist follower counts for trend tracking';
COMMENT ON COLUMN playlist_follower_history.recorded_at IS 'Date of the snapshot (one per playlist per day)';

