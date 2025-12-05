-- ============================================================================
-- SoundCloud Member-User Authentication Link
-- ============================================================================
-- Links soundcloud_members to auth.users for member portal access
-- Date: 2025-12-05
-- ============================================================================

-- Add user_id column to soundcloud_members for direct linking
ALTER TABLE public.soundcloud_members 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add last_login tracking for IP status
ALTER TABLE public.soundcloud_members 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Create index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_soundcloud_members_user_id 
ON public.soundcloud_members(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- Alternative: Create linking table (like vendor_users in Spotify)
-- This provides flexibility if a user could be linked to multiple members
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.soundcloud_member_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.soundcloud_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(member_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_soundcloud_member_users_user_id 
ON public.soundcloud_member_users(user_id);

CREATE INDEX IF NOT EXISTS idx_soundcloud_member_users_member_id 
ON public.soundcloud_member_users(member_id);

-- ============================================================================
-- RLS Policies for soundcloud_member_users
-- ============================================================================

ALTER TABLE public.soundcloud_member_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "soundcloud_member_users_select_own" ON public.soundcloud_member_users;
DROP POLICY IF EXISTS "soundcloud_member_users_admin_all" ON public.soundcloud_member_users;

-- Members can see their own link
CREATE POLICY "soundcloud_member_users_select_own" 
ON public.soundcloud_member_users
FOR SELECT
USING (user_id = auth.uid());

-- Admins can see all (via service role or admin check)
CREATE POLICY "soundcloud_member_users_admin_all" 
ON public.soundcloud_member_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- ============================================================================
-- Function to get member ID for current user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_soundcloud_member_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT member_id 
  FROM public.soundcloud_member_users 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- Function to check if current user is a SoundCloud member
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_soundcloud_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.soundcloud_member_users 
    WHERE user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Trigger to update last_login and IP status when member logs in
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_soundcloud_member_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_login_at and set status to connected
  UPDATE public.soundcloud_members
  SET 
    last_login_at = now(),
    influence_planner_status = 'connected',
    updated_at = now()
  WHERE user_id = NEW.id
    OR id IN (SELECT member_id FROM public.soundcloud_member_users WHERE user_id = NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on auth.users would need to be created via Supabase dashboard
-- or using a Postgres extension, as auth schema is managed by Supabase

-- ============================================================================
-- RLS Policy Updates for soundcloud_members
-- Allow members to view their own profile
-- ============================================================================

-- Drop existing policy if it conflicts
DROP POLICY IF EXISTS "soundcloud_members_select_own" ON public.soundcloud_members;

-- Members can view their own record
CREATE POLICY "soundcloud_members_select_own" 
ON public.soundcloud_members
FOR SELECT
USING (
  user_id = auth.uid() 
  OR id IN (SELECT member_id FROM public.soundcloud_member_users WHERE user_id = auth.uid())
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- ============================================================================
-- RLS Policy Updates for soundcloud_submissions
-- Allow members to view/create their own submissions
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "soundcloud_submissions_member_select" ON public.soundcloud_submissions;
DROP POLICY IF EXISTS "soundcloud_submissions_member_insert" ON public.soundcloud_submissions;

-- Members can view their own submissions
CREATE POLICY "soundcloud_submissions_member_select"
ON public.soundcloud_submissions
FOR SELECT
USING (
  member_id IN (
    SELECT id FROM public.soundcloud_members WHERE user_id = auth.uid()
    UNION
    SELECT member_id FROM public.soundcloud_member_users WHERE user_id = auth.uid()
  )
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- Members can create submissions for themselves
CREATE POLICY "soundcloud_submissions_member_insert"
ON public.soundcloud_submissions
FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.soundcloud_members WHERE user_id = auth.uid()
    UNION
    SELECT member_id FROM public.soundcloud_member_users WHERE user_id = auth.uid()
  )
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.soundcloud_member_users IS 'Links SoundCloud members to auth users for portal login';
COMMENT ON COLUMN public.soundcloud_members.user_id IS 'Direct link to auth.users for member login';
COMMENT ON COLUMN public.soundcloud_members.last_login_at IS 'Last time member logged into portal';
COMMENT ON FUNCTION public.get_my_soundcloud_member_id() IS 'Returns the member_id for the currently logged-in user';
COMMENT ON FUNCTION public.is_soundcloud_member() IS 'Returns true if current user is a SoundCloud member';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. Added user_id column to soundcloud_members for direct linking
-- 2. Created soundcloud_member_users table for flexibility (like vendor_users)
-- 3. Added RLS policies for member portal access
-- 4. Created helper functions for member lookups
-- 5. Added last_login_at tracking for IP status management
-- ============================================================================

