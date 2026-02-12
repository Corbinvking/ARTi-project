-- Sync admin_set_password from auth.users metadata into profiles.metadata
-- so the frontend can read it via direct Supabase queries (anon key)

-- Ensure metadata column exists on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update profiles.metadata with admin_set_password from auth.users
UPDATE public.profiles p
SET metadata = COALESCE(p.metadata, '{}'::jsonb) || jsonb_build_object('admin_set_password', u.raw_user_meta_data->>'admin_set_password')
FROM auth.users u
WHERE p.id = u.id
AND u.raw_user_meta_data->>'admin_set_password' IS NOT NULL;

-- Verify
SELECT p.id, p.email, p.name, p.metadata->>'admin_set_password' as password
FROM public.profiles p
WHERE p.metadata->>'admin_set_password' IS NOT NULL
ORDER BY p.email;
