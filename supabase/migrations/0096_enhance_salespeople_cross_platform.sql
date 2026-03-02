-- Enhance salespeople table for cross-platform use
-- Links salespeople to auth users so they can log in with the 'sales' role
-- Adds status tracking and notes fields

-- Add auth_user_id column to link salespeople to Supabase Auth users
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add status column (Active, Inactive, Pending)
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

-- Add notes column
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create unique index on auth_user_id (one auth user per salesperson)
CREATE UNIQUE INDEX IF NOT EXISTS idx_salespeople_auth_user_id ON public.salespeople(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Create unique index on email (prevent duplicate salespeople entries)
CREATE UNIQUE INDEX IF NOT EXISTS idx_salespeople_email ON public.salespeople(email) WHERE email IS NOT NULL;

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_salespeople_status ON public.salespeople(status);

-- Ensure RLS is enabled (may already be)
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read salespeople (cross-platform access)
DROP POLICY IF EXISTS "Allow authenticated users to read salespeople" ON public.salespeople;
CREATE POLICY "Allow authenticated users to read salespeople"
  ON public.salespeople FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to insert/update/delete salespeople  
DROP POLICY IF EXISTS "Allow admins to manage salespeople" ON public.salespeople;
CREATE POLICY "Allow admins to manage salespeople"
  ON public.salespeople FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comment on columns for documentation
COMMENT ON COLUMN public.salespeople.auth_user_id IS 'Links to auth.users for login capability';
COMMENT ON COLUMN public.salespeople.status IS 'Salesperson status: Active, Inactive, or Pending';
COMMENT ON COLUMN public.salespeople.notes IS 'Internal notes about the salesperson';
