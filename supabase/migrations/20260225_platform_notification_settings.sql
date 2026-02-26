-- Platform-wide notification settings (one row per platform per org)
CREATE TABLE IF NOT EXISTS public.platform_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  platform TEXT NOT NULL CHECK (platform IN ('soundcloud', 'spotify', 'instagram', 'youtube')),
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook TEXT,
  slack_channel TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id, platform)
);

-- Migrate existing SoundCloud Slack settings
INSERT INTO public.platform_notification_settings (org_id, platform, slack_enabled, slack_webhook, slack_channel)
SELECT
  org_id,
  'soundcloud',
  COALESCE(slack_enabled, false),
  slack_webhook,
  COALESCE(slack_channel, '#soundcloud-groups')
FROM public.soundcloud_settings
WHERE slack_webhook IS NOT NULL OR slack_enabled = true
ON CONFLICT (org_id, platform) DO UPDATE SET
  slack_enabled = EXCLUDED.slack_enabled,
  slack_webhook = EXCLUDED.slack_webhook,
  slack_channel = EXCLUDED.slack_channel;

-- Drop Slack columns from soundcloud_settings
ALTER TABLE public.soundcloud_settings
  DROP COLUMN IF EXISTS slack_enabled,
  DROP COLUMN IF EXISTS slack_webhook,
  DROP COLUMN IF EXISTS slack_channel;

-- RLS policies
ALTER TABLE public.platform_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.platform_notification_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON public.platform_notification_settings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON public.platform_notification_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access" ON public.platform_notification_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
