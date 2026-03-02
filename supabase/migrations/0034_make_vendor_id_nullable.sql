-- Make vendor_id nullable in playlists table
-- Some playlists may not have an associated vendor

ALTER TABLE playlists 
ALTER COLUMN vendor_id DROP NOT NULL;

COMMENT ON COLUMN playlists.vendor_id IS 'Vendor who owns this playlist - can be NULL for unassigned playlists';

