-- ============================================================================
-- Add 'complete' value to soundcloud_submission_status enum
-- ============================================================================
-- Date: 2025-12-05
-- ============================================================================

-- Add 'complete' as a valid enum value
ALTER TYPE public.soundcloud_submission_status ADD VALUE IF NOT EXISTS 'complete';

-- ============================================================================
-- Notes
-- ============================================================================
-- Existing values: 'new', 'approved', 'rejected'
-- Added: 'complete'
-- 
-- Status mapping:
--   new      -> Pending (campaign submitted, awaiting approval)
--   approved -> Active (campaign is running)
--   complete -> Complete (campaign finished successfully)
--   rejected -> Cancelled (campaign was rejected/cancelled)
-- ============================================================================

