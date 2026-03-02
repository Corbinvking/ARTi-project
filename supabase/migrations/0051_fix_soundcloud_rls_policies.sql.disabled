-- ============================================================================
-- Fix SoundCloud RLS Policies for Admin/Manager Access
-- ============================================================================
-- Adds policies that allow authenticated users to manage soundcloud data
-- Date: 2025-12-05
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "soundcloud_submissions_org_isolation" ON public.soundcloud_submissions;
DROP POLICY IF EXISTS "soundcloud_members_org_isolation" ON public.soundcloud_members;

-- ============================================================================
-- soundcloud_submissions - Allow all authenticated users to manage
-- ============================================================================

-- Policy: Authenticated users can SELECT all submissions
CREATE POLICY "soundcloud_submissions_select_authenticated" 
ON public.soundcloud_submissions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can INSERT submissions
CREATE POLICY "soundcloud_submissions_insert_authenticated" 
ON public.soundcloud_submissions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can UPDATE submissions
CREATE POLICY "soundcloud_submissions_update_authenticated" 
ON public.soundcloud_submissions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can DELETE submissions
CREATE POLICY "soundcloud_submissions_delete_authenticated" 
ON public.soundcloud_submissions
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- soundcloud_members - Allow all authenticated users to manage
-- ============================================================================

-- Policy: Authenticated users can SELECT all members
CREATE POLICY "soundcloud_members_select_authenticated" 
ON public.soundcloud_members
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can INSERT members
CREATE POLICY "soundcloud_members_insert_authenticated" 
ON public.soundcloud_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can UPDATE members
CREATE POLICY "soundcloud_members_update_authenticated" 
ON public.soundcloud_members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can DELETE members
CREATE POLICY "soundcloud_members_delete_authenticated" 
ON public.soundcloud_members
FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- Also fix other soundcloud tables
-- ============================================================================

-- soundcloud_member_users
DROP POLICY IF EXISTS "soundcloud_member_users_select_own" ON public.soundcloud_member_users;
DROP POLICY IF EXISTS "soundcloud_member_users_admin_all" ON public.soundcloud_member_users;

CREATE POLICY "soundcloud_member_users_authenticated" 
ON public.soundcloud_member_users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- soundcloud_genre_families
DROP POLICY IF EXISTS "soundcloud_genre_families_org_isolation" ON public.soundcloud_genre_families;

CREATE POLICY "soundcloud_genre_families_authenticated" 
ON public.soundcloud_genre_families
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- soundcloud_subgenres
DROP POLICY IF EXISTS "soundcloud_subgenres_org_isolation" ON public.soundcloud_subgenres;

CREATE POLICY "soundcloud_subgenres_authenticated" 
ON public.soundcloud_subgenres
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- soundcloud_inquiries
DROP POLICY IF EXISTS "soundcloud_inquiries_org_isolation" ON public.soundcloud_inquiries;

CREATE POLICY "soundcloud_inquiries_authenticated" 
ON public.soundcloud_inquiries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- soundcloud_complaints
DROP POLICY IF EXISTS "soundcloud_complaints_org_isolation" ON public.soundcloud_complaints;

CREATE POLICY "soundcloud_complaints_authenticated" 
ON public.soundcloud_complaints
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- soundcloud_settings
DROP POLICY IF EXISTS "soundcloud_settings_org_isolation" ON public.soundcloud_settings;

CREATE POLICY "soundcloud_settings_authenticated" 
ON public.soundcloud_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- soundcloud_mail_events
DROP POLICY IF EXISTS "soundcloud_mail_events_org_isolation" ON public.soundcloud_mail_events;

CREATE POLICY "soundcloud_mail_events_authenticated" 
ON public.soundcloud_mail_events
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "soundcloud_submissions_select_authenticated" ON public.soundcloud_submissions 
IS 'Allow all authenticated users to view submissions';

COMMENT ON POLICY "soundcloud_submissions_update_authenticated" ON public.soundcloud_submissions 
IS 'Allow all authenticated users to update submissions (status changes, etc)';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. Removed org_id-based isolation (was too restrictive)
-- 2. Added simple authenticated-based policies for all SoundCloud tables
-- 3. This allows admins, managers, and members to interact with the data
-- 4. Future: Can add role-based restrictions if needed
-- ============================================================================

