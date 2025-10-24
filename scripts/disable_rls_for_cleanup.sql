-- Temporarily disable RLS on spotify_campaigns for cleanup
-- This allows the service role to delete all records

-- Disable RLS
ALTER TABLE public.spotify_campaigns DISABLE ROW LEVEL SECURITY;

-- You can re-enable it after cleanup with:
-- ALTER TABLE public.spotify_campaigns ENABLE ROW LEVEL SECURITY;

