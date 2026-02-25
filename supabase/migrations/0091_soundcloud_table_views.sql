-- Create views to alias soundcloud-prefixed tables to the names
-- used by the SoundCloud app code (submissions, members).
-- This avoids having to rename tables in 24+ source files.

-- View: submissions → soundcloud_submissions
CREATE OR REPLACE VIEW submissions AS
SELECT * FROM soundcloud_submissions;

-- View: members → soundcloud_members
-- Includes soundcloud_followers alias for the followers column
CREATE OR REPLACE VIEW members AS
SELECT *, followers AS soundcloud_followers FROM soundcloud_members;

-- Grant permissions on the views
GRANT SELECT, INSERT, UPDATE, DELETE ON submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON members TO anon;

-- RLS on the underlying tables is already enabled.
-- Views inherit RLS from their base tables automatically.
