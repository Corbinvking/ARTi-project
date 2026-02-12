-- ==========================================================
-- CLEAN IMPORT: Auth users + Salespeople + Permissions
-- ==========================================================

-- 1. Fix salespeople table: add unique constraint on email
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop partial index and add proper unique constraint
DROP INDEX IF EXISTS idx_salespeople_email;
ALTER TABLE public.salespeople DROP CONSTRAINT IF EXISTS salespeople_email_key;
ALTER TABLE public.salespeople ADD CONSTRAINT salespeople_email_key UNIQUE (email);

-- Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;

-- 2. Create all auth users (each in its own DO block so failures are isolated)

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jared@artistinfluence.com') THEN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'jared@artistinfluence.com', crypt('qK4pJcxuNX9t', gen_salt('bf')), now(), now(), now(), '{"full_name":"Jared","name":"Jared","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false);
  RAISE NOTICE 'Created: Jared';
ELSE RAISE NOTICE 'Exists: Jared'; END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'philippe@artistinfluence.com') THEN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'philippe@artistinfluence.com', crypt('rwBYHfMDndze', gen_salt('bf')), now(), now(), now(), '{"full_name":"Philippe","name":"Philippe","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false);
  RAISE NOTICE 'Created: Philippe';
ELSE RAISE NOTICE 'Exists: Philippe'; END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'priime@artistinfluence.com') THEN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'priime@artistinfluence.com', crypt('GemcsJLAc5fQ', gen_salt('bf')), now(), now(), now(), '{"full_name":"Priime","name":"Priime","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false);
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'joe@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'joe@artistinfluence.com', crypt('4WT5y8fEjqRv', gen_salt('bf')), now(), now(), now(), '{"full_name":"Joe","name":"Joe","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brendan@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'brendan@artistinfluence.com', crypt('gTJgtqAX9Hzk', gen_salt('bf')), now(), now(), now(), '{"full_name":"Brendan","name":"Brendan","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jack@sunmachine.ltd') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'jack@sunmachine.ltd', crypt('aRVmTMzL4jFR', gen_salt('bf')), now(), now(), now(), '{"full_name":"Jack","name":"Jack","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex@glassemainframe.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'alex@glassemainframe.com', crypt('WLtWPLgzvSSk', gen_salt('bf')), now(), now(), now(), '{"full_name":"Alex","name":"Alex","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'marissafox@nolimitgroup.co') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'marissafox@nolimitgroup.co', crypt('yjfPuyzHyjJs', gen_salt('bf')), now(), now(), now(), '{"full_name":"Marissa","name":"Marissa","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jack@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'jack@artistinfluence.com', crypt('dhwwxAdYJHwx', gen_salt('bf')), now(), now(), now(), '{"full_name":"Jack D","name":"Jack D","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'katt@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'katt@artistinfluence.com', crypt('cAWPR2BHBuMZ', gen_salt('bf')), now(), now(), now(), '{"full_name":"Katt","name":"Katt","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'livemediaprod@gmail.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'livemediaprod@gmail.com', crypt('vRw8Q8XGmf7P', gen_salt('bf')), now(), now(), now(), '{"full_name":"Shaun","name":"Shaun","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'n8landmusic@gmail.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'n8landmusic@gmail.com', crypt('Are7SqYRt4nH', gen_salt('bf')), now(), now(), now(), '{"full_name":"Nate","name":"Nate","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'eric@lightcave.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'eric@lightcave.com', crypt('VmpVRvdx5Bau', gen_salt('bf')), now(), now(), now(), '{"full_name":"Eric Garcia","name":"Eric Garcia","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'amit@prim8music.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'amit@prim8music.com', crypt('tn7GyL6fajBQ', gen_salt('bf')), now(), now(), now(), '{"full_name":"Amit","name":"Amit","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'danielle@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'danielle@artistinfluence.com', crypt('sxyjrb6rvzAu', gen_salt('bf')), now(), now(), now(), '{"full_name":"Danielle","name":"Danielle","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'danny@hitskope.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'danny@hitskope.com', crypt('T3MZzgPzkJhW', gen_salt('bf')), now(), now(), now(), '{"full_name":"Danny","name":"Danny","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'issymusic@gmail.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'issymusic@gmail.com', crypt('Du4GmqWej47D', gen_salt('bf')), now(), now(), now(), '{"full_name":"Issy","name":"Issy","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sam@hitlist.co') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'sam@hitlist.co', crypt('SaSKyaWNDyEb', gen_salt('bf')), now(), now(), now(), '{"full_name":"Sam Hitlist","name":"Sam Hitlist","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'christine.perez-wood@tunecore.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'christine.perez-wood@tunecore.com', crypt('z9wVJLKYcWXg', gen_salt('bf')), now(), now(), now(), '{"full_name":"Perez","name":"Perez","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'annette@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'annette@artistinfluence.com', crypt('zH5ZRCDRrPTz', gen_salt('bf')), now(), now(), now(), '{"full_name":"Annette","name":"Annette","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'reza@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'reza@artistinfluence.com', crypt('k32FAnpuh2sG', gen_salt('bf')), now(), now(), now(), '{"full_name":"Reza","name":"Reza","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cam@artistinfluence.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'cam@artistinfluence.com', crypt('bK3Tzw7HmxCQ', gen_salt('bf')), now(), now(), now(), '{"full_name":"Cam","name":"Cam","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'helenehoward.mgmt@gmail.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'helenehoward.mgmt@gmail.com', crypt('EYyz3TdL7rAJ', gen_salt('bf')), now(), now(), now(), '{"full_name":"Helene","name":"Helene","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ttopdjian@gmail.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ttopdjian@gmail.com', crypt('nBeHuSPvejQq', gen_salt('bf')), now(), now(), now(), '{"full_name":"Tylie","name":"Tylie","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jenni@rightcallmedia.co') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'jenni@rightcallmedia.co', crypt('BqxKjWQGnyDk', gen_salt('bf')), now(), now(), now(), '{"full_name":"Jenni","name":"Jenni","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'phuturecollective@gmail.com') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'phuturecollective@gmail.com', crypt('A2hXBCqGK93P', gen_salt('bf')), now(), now(), now(), '{"full_name":"Michael","name":"Michael","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'luke@nolimitgroup.co') THEN INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data, aud, role, confirmation_token, recovery_token, is_super_admin) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'luke@nolimitgroup.co', crypt('tyYAktvtnLdg', gen_salt('bf')), now(), now(), now(), '{"full_name":"Luke","name":"Luke","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, 'authenticated', 'authenticated', '', '', false); END IF; END $$;

-- 3. Create auth identities for all new users
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
SELECT u.id, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', u.email, now(), now(), now()
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'sales'
AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);

-- 4. Create profiles for all new users
INSERT INTO public.profiles (id, email, name, role)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', 'sales'
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'sales'
ON CONFLICT (id) DO UPDATE SET role = 'sales', name = EXCLUDED.name;

-- 5. Create permissions for all sales users
INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
SELECT u.id, p.platform, true, true, false
FROM auth.users u
CROSS JOIN (VALUES ('dashboard'),('instagram'),('spotify'),('youtube'),('soundcloud')) AS p(platform)
WHERE u.raw_user_meta_data->>'role' = 'sales'
ON CONFLICT DO NOTHING;

-- 6. Insert salespeople records (link to auth users)
INSERT INTO public.salespeople (org_id, name, email, status, is_active, auth_user_id)
SELECT '00000000-0000-0000-0000-000000000001', u.raw_user_meta_data->>'full_name', u.email,
  CASE WHEN u.email IN ('brendan@artistinfluence.com','jack@sunmachine.ltd') THEN 'Inactive'
       WHEN u.email IN ('eric@lightcave.com','issymusic@gmail.com') THEN 'Pending'
       ELSE 'Active' END,
  CASE WHEN u.email IN ('brendan@artistinfluence.com','jack@sunmachine.ltd') THEN false ELSE true END,
  u.id
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'sales'
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  name = EXCLUDED.name;

-- 7. VERIFY
SELECT '=== AUTH USERS (sales) ===' as info;
SELECT email, raw_user_meta_data->>'full_name' as name FROM auth.users WHERE raw_user_meta_data->>'role' = 'sales' ORDER BY email;

SELECT '=== SALESPEOPLE ===' as info;
SELECT name, email, status, is_active, auth_user_id IS NOT NULL as has_login FROM public.salespeople ORDER BY name;

SELECT '=== TOTALS ===' as info;
SELECT
  (SELECT count(*) FROM auth.users WHERE raw_user_meta_data->>'role' = 'sales') as auth_users,
  (SELECT count(*) FROM public.salespeople) as salespeople,
  (SELECT count(*) FROM public.salespeople WHERE auth_user_id IS NOT NULL) as with_login,
  (SELECT count(*) FROM auth.identities i JOIN auth.users u ON i.user_id = u.id WHERE u.raw_user_meta_data->>'role' = 'sales') as identities,
  (SELECT count(*) FROM public.user_permissions up JOIN auth.users u ON up.user_id = u.id WHERE u.raw_user_meta_data->>'role' = 'sales') as permissions;
