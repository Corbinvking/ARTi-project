-- Enable RLS on client_credits table if not already enabled
ALTER TABLE client_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view client credits" ON client_credits;
DROP POLICY IF EXISTS "Users can insert client credits" ON client_credits;
DROP POLICY IF EXISTS "Users can update client credits" ON client_credits;
DROP POLICY IF EXISTS "Users can delete client credits" ON client_credits;

-- Allow authenticated users to view client credits
CREATE POLICY "Users can view client credits"
  ON client_credits
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert client credits
CREATE POLICY "Users can insert client credits"
  ON client_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update client credits
CREATE POLICY "Users can update client credits"
  ON client_credits
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete client credits
CREATE POLICY "Users can delete client credits"
  ON client_credits
  FOR DELETE
  TO authenticated
  USING (true);

-- Add an index on client_id for faster queries
CREATE INDEX IF NOT EXISTS idx_client_credits_client_id ON client_credits(client_id);

-- Add an index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_client_credits_created_at ON client_credits(created_at DESC);

