-- Add client_id to soundcloud_submissions for paid campaign tracking
-- This allows submissions to be linked to either members OR clients

-- Add the client_id column (nullable - not all submissions are from clients)
ALTER TABLE soundcloud_submissions 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES soundcloud_clients(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_client_id 
ON soundcloud_submissions(client_id);

-- Add comment for documentation
COMMENT ON COLUMN soundcloud_submissions.client_id IS 
'Optional reference to client for paid campaigns. If set, this is a client campaign. If null, this is a member submission.';

-- Note: Now soundcloud_submissions can represent both:
-- 1. Member submissions (member_id set, client_id null)
-- 2. Client campaigns (client_id set, member_id can be null)
-- 3. Mixed (both set, if a member is also a client)


