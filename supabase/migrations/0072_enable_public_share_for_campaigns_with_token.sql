-- Enable public share for any Instagram campaign that has a public_token set.
-- This makes share links work when the app uses public_token in the URL.
UPDATE instagram_campaigns
SET public_access_enabled = true
WHERE public_token IS NOT NULL AND trim(public_token) != '';
