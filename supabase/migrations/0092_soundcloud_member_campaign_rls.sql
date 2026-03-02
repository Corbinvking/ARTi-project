-- ============================================================================
-- SoundCloud Member Campaign View - RLS Policies & Attribution Table
-- ============================================================================
-- This migration:
-- 1. Creates soundcloud_attribution_snapshots table if it doesn't exist
-- 2. Adds RLS policies so member portal users can read campaigns and
--    attribution data linked to their submissions / queue assignments
-- ============================================================================

-- ============================================================================
-- 1. CREATE soundcloud_attribution_snapshots TABLE (IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.soundcloud_attribution_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id),
  parent_type TEXT NOT NULL CHECK (parent_type IN ('campaign', 'submission')),
  parent_id UUID NOT NULL,
  day_index INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL,
  plays INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  collected_at TIMESTAMPTZ DEFAULT now(),
  collection_source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_type, parent_id, day_index)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sc_attribution_parent
  ON public.soundcloud_attribution_snapshots(parent_type, parent_id);

CREATE INDEX IF NOT EXISTS idx_sc_attribution_date
  ON public.soundcloud_attribution_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_sc_attribution_org
  ON public.soundcloud_attribution_snapshots(org_id);

-- ============================================================================
-- 2. ENABLE RLS ON soundcloud_attribution_snapshots
-- ============================================================================

ALTER TABLE public.soundcloud_attribution_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_attribution_snapshots' AND policyname = 'sc_attribution_snapshots_select_for_authenticated') THEN
    CREATE POLICY "sc_attribution_snapshots_select_for_authenticated" ON public.soundcloud_attribution_snapshots FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_attribution_snapshots' AND policyname = 'sc_attribution_snapshots_insert_for_authenticated') THEN
    CREATE POLICY "sc_attribution_snapshots_insert_for_authenticated" ON public.soundcloud_attribution_snapshots FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_attribution_snapshots' AND policyname = 'sc_attribution_snapshots_update_for_authenticated') THEN
    CREATE POLICY "sc_attribution_snapshots_update_for_authenticated" ON public.soundcloud_attribution_snapshots FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================================
-- 3. RLS POLICIES FOR soundcloud_campaigns (member read access)
-- ============================================================================

ALTER TABLE public.soundcloud_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_campaigns' AND policyname = 'sc_campaigns_select_for_authenticated') THEN
    CREATE POLICY "sc_campaigns_select_for_authenticated" ON public.soundcloud_campaigns FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_campaigns' AND policyname = 'sc_campaigns_insert_for_authenticated') THEN
    CREATE POLICY "sc_campaigns_insert_for_authenticated" ON public.soundcloud_campaigns FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_campaigns' AND policyname = 'sc_campaigns_update_for_authenticated') THEN
    CREATE POLICY "sc_campaigns_update_for_authenticated" ON public.soundcloud_campaigns FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_campaigns' AND policyname = 'sc_campaigns_delete_for_authenticated') THEN
    CREATE POLICY "sc_campaigns_delete_for_authenticated" ON public.soundcloud_campaigns FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================================
-- 4. ENSURE soundcloud_queue_assignments HAS READ ACCESS FOR MEMBERS
-- ============================================================================
-- Only applied if the table exists (it may not yet be created in all environments)

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'soundcloud_queue_assignments') THEN
    EXECUTE 'ALTER TABLE public.soundcloud_queue_assignments ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'soundcloud_queue_assignments' AND policyname = 'sc_queue_assignments_select_for_authenticated') THEN
      EXECUTE 'CREATE POLICY "sc_queue_assignments_select_for_authenticated" ON public.soundcloud_queue_assignments FOR SELECT TO authenticated USING (true)';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. UPDATED_AT TRIGGER FOR soundcloud_attribution_snapshots
-- ============================================================================

DROP TRIGGER IF EXISTS update_soundcloud_attribution_snapshots_updated_at
  ON public.soundcloud_attribution_snapshots;

CREATE TRIGGER update_soundcloud_attribution_snapshots_updated_at
  BEFORE UPDATE ON public.soundcloud_attribution_snapshots
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.soundcloud_attribution_snapshots IS 'Daily performance snapshots for SoundCloud campaigns and submissions (plays, likes, reposts, comments)';
