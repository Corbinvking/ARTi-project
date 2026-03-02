-- SoundCloud Member Portal Red Team: schema additions

-- 1. Rejection reason for member-facing display
ALTER TABLE public.soundcloud_submissions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN public.soundcloud_submissions.rejection_reason
  IS 'Operator-set reason shown to member when a submission is rejected (e.g. Genre mismatch, Audio quality)';

-- 2. Release date on submissions (member-supplied)
ALTER TABLE public.soundcloud_submissions
  ADD COLUMN IF NOT EXISTS release_date DATE;

COMMENT ON COLUMN public.soundcloud_submissions.release_date
  IS 'Artist-provided release date for the track';

-- 3. Tier reach expectations (member-facing reach ranges per tier)
ALTER TABLE public.soundcloud_settings
  ADD COLUMN IF NOT EXISTS tier_reach_expectations JSONB
    DEFAULT '{"T1":"500 - 2K","T2":"2K - 10K","T3":"10K - 50K","T4":"50K+"}';

COMMENT ON COLUMN public.soundcloud_settings.tier_reach_expectations
  IS 'Member-facing estimated reach ranges per size tier';
