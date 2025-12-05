-- ============================================================================
-- SoundCloud IP (Influence Planner) Status Tracking
-- ============================================================================
-- Tracks member login activity and updates influence_planner_status
-- Date: 2025-12-05
-- ============================================================================

-- Ensure influence_planner_status column exists with proper type
DO $$ 
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'soundcloud_members' 
    AND column_name = 'influence_planner_status'
  ) THEN
    ALTER TABLE public.soundcloud_members 
    ADD COLUMN influence_planner_status TEXT DEFAULT 'hasnt_logged_in';
  END IF;
END $$;

-- ============================================================================
-- Function to record member login and update IP status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_soundcloud_member_login(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_member_name TEXT;
  v_old_status TEXT;
  v_new_status TEXT := 'connected';
BEGIN
  -- Find member by user_id in linking table
  SELECT member_id INTO v_member_id
  FROM public.soundcloud_member_users
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If not found in linking table, try direct user_id lookup
  IF v_member_id IS NULL THEN
    SELECT id INTO v_member_id
    FROM public.soundcloud_members
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;
  
  -- If still not found, try by email
  IF v_member_id IS NULL THEN
    SELECT sm.id INTO v_member_id
    FROM public.soundcloud_members sm
    JOIN auth.users au ON au.email = sm.primary_email
    WHERE au.id = p_user_id
    LIMIT 1;
  END IF;
  
  -- If no member found, return early
  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No member found for user'
    );
  END IF;
  
  -- Get current status and name
  SELECT name, influence_planner_status 
  INTO v_member_name, v_old_status
  FROM public.soundcloud_members
  WHERE id = v_member_id;
  
  -- Update member record
  UPDATE public.soundcloud_members
  SET 
    last_login_at = now(),
    influence_planner_status = v_new_status,
    updated_at = now()
  WHERE id = v_member_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'member_name', v_member_name,
    'old_status', v_old_status,
    'new_status', v_new_status
  );
END;
$$;

-- ============================================================================
-- Function to check and update stale members
-- Members who haven't logged in for 30+ days become 'disconnected'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_stale_soundcloud_members()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update members who haven't logged in for 30+ days
  WITH updated AS (
    UPDATE public.soundcloud_members
    SET 
      influence_planner_status = 'disconnected',
      updated_at = now()
    WHERE 
      influence_planner_status = 'connected'
      AND last_login_at IS NOT NULL
      AND last_login_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'checked_at', now()
  );
END;
$$;

-- ============================================================================
-- Function to get IP status summary for dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_soundcloud_ip_status_summary()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total', count(*),
    'connected', count(*) FILTER (WHERE influence_planner_status = 'connected'),
    'disconnected', count(*) FILTER (WHERE influence_planner_status = 'disconnected'),
    'invited', count(*) FILTER (WHERE influence_planner_status = 'invited'),
    'hasnt_logged_in', count(*) FILTER (WHERE influence_planner_status = 'hasnt_logged_in' OR influence_planner_status IS NULL),
    'uninterested', count(*) FILTER (WHERE influence_planner_status = 'uninterested'),
    'active_members', count(*) FILTER (WHERE status = 'active'),
    'with_accounts', count(*) FILTER (WHERE user_id IS NOT NULL)
  )
  FROM public.soundcloud_members
  WHERE status = 'active';
$$;

-- ============================================================================
-- Create index for efficient status queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_soundcloud_members_ip_status 
ON public.soundcloud_members(influence_planner_status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_soundcloud_members_last_login 
ON public.soundcloud_members(last_login_at) 
WHERE last_login_at IS NOT NULL;

-- ============================================================================
-- Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.record_soundcloud_member_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_soundcloud_ip_status_summary() TO authenticated;
-- update_stale_soundcloud_members should only be called by cron/admin

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION public.record_soundcloud_member_login IS 'Records member login and updates IP status to connected';
COMMENT ON FUNCTION public.update_stale_soundcloud_members IS 'Marks members as disconnected if no login for 30+ days';
COMMENT ON FUNCTION public.get_soundcloud_ip_status_summary IS 'Returns summary counts of IP status for active members';

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. Created record_soundcloud_member_login() - call from frontend on login
-- 2. Created update_stale_soundcloud_members() - call via cron job
-- 3. Created get_soundcloud_ip_status_summary() - for admin dashboard
-- 4. Added indexes for efficient status queries
-- ============================================================================

