-- Add is_algorithmic column to track Spotify algorithmic playlists
ALTER TABLE campaign_playlists 
ADD COLUMN IF NOT EXISTS is_algorithmic BOOLEAN DEFAULT FALSE;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_campaign_playlists_is_algorithmic 
ON campaign_playlists(is_algorithmic);

-- Comment
COMMENT ON COLUMN campaign_playlists.is_algorithmic IS 'True for Spotify algorithmic playlists (Discover Weekly, Radio, etc.)';

