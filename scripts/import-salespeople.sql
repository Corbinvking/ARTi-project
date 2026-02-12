-- ==========================================================
-- Salespeople Import - Generated 2026-02-12T16:50:47.865Z
-- ==========================================================

-- pgcrypto already installed on this database

-- Ensure salespeople table columns exist
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS notes TEXT;

-- --------------------------------------------------------
-- Jared (jared@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jared@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '788bd632-1c5e-446f-9717-144670fdfd28', '00000000-0000-0000-0000-000000000000', 'jared@artistinfluence.com',
      crypt('qK4pJcxuNX9t', gen_salt('bf')),
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z',
      '{"full_name":"Jared","name":"Jared","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '788bd632-1c5e-446f-9717-144670fdfd28', '788bd632-1c5e-446f-9717-144670fdfd28',
      jsonb_build_object('sub', '788bd632-1c5e-446f-9717-144670fdfd28', 'email', 'jared@artistinfluence.com', 'email_verified', true),
      'email', 'jared@artistinfluence.com',
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('788bd632-1c5e-446f-9717-144670fdfd28', 'jared@artistinfluence.com', 'Jared', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('788bd632-1c5e-446f-9717-144670fdfd28', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('788bd632-1c5e-446f-9717-144670fdfd28', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('788bd632-1c5e-446f-9717-144670fdfd28', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('788bd632-1c5e-446f-9717-144670fdfd28', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('788bd632-1c5e-446f-9717-144670fdfd28', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Jared (jared@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Jared (jared@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jared', 'jared@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'jared@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Philippe (philippe@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'philippe@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '84ab8065-5c3f-4462-b28c-33ac39b5607d', '00000000-0000-0000-0000-000000000000', 'philippe@artistinfluence.com',
      crypt('rwBYHfMDndze', gen_salt('bf')),
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z',
      '{"full_name":"Philippe","name":"Philippe","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '84ab8065-5c3f-4462-b28c-33ac39b5607d', '84ab8065-5c3f-4462-b28c-33ac39b5607d',
      jsonb_build_object('sub', '84ab8065-5c3f-4462-b28c-33ac39b5607d', 'email', 'philippe@artistinfluence.com', 'email_verified', true),
      'email', 'philippe@artistinfluence.com',
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('84ab8065-5c3f-4462-b28c-33ac39b5607d', 'philippe@artistinfluence.com', 'Philippe', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('84ab8065-5c3f-4462-b28c-33ac39b5607d', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('84ab8065-5c3f-4462-b28c-33ac39b5607d', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('84ab8065-5c3f-4462-b28c-33ac39b5607d', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('84ab8065-5c3f-4462-b28c-33ac39b5607d', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('84ab8065-5c3f-4462-b28c-33ac39b5607d', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Philippe (philippe@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Philippe (philippe@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Philippe', 'philippe@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'philippe@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Priime (priime@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'priime@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', '00000000-0000-0000-0000-000000000000', 'priime@artistinfluence.com',
      crypt('GemcsJLAc5fQ', gen_salt('bf')),
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z',
      '{"full_name":"Priime","name":"Priime","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', '91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5',
      jsonb_build_object('sub', '91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', 'email', 'priime@artistinfluence.com', 'email_verified', true),
      'email', 'priime@artistinfluence.com',
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', 'priime@artistinfluence.com', 'Priime', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('91cdeb4e-e195-4a4e-b3a9-bc07d7506ba5', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Priime (priime@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Priime (priime@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Priime', 'priime@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'priime@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Joe (joe@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'joe@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', '00000000-0000-0000-0000-000000000000', 'joe@artistinfluence.com',
      crypt('4WT5y8fEjqRv', gen_salt('bf')),
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z',
      '{"full_name":"Joe","name":"Joe","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', '9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b',
      jsonb_build_object('sub', '9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', 'email', 'joe@artistinfluence.com', 'email_verified', true),
      'email', 'joe@artistinfluence.com',
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', 'joe@artistinfluence.com', 'Joe', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9d1fb4c2-aa6d-45f3-ad26-a1056e34b73b', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Joe (joe@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Joe (joe@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Joe', 'joe@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'joe@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Brendan (brendan@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brendan@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '2114ed6a-d67d-492b-869e-9867cada6682', '00000000-0000-0000-0000-000000000000', 'brendan@artistinfluence.com',
      crypt('gTJgtqAX9Hzk', gen_salt('bf')),
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z',
      '{"full_name":"Brendan","name":"Brendan","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '2114ed6a-d67d-492b-869e-9867cada6682', '2114ed6a-d67d-492b-869e-9867cada6682',
      jsonb_build_object('sub', '2114ed6a-d67d-492b-869e-9867cada6682', 'email', 'brendan@artistinfluence.com', 'email_verified', true),
      'email', 'brendan@artistinfluence.com',
      '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z', '2026-02-12T16:50:47.866Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('2114ed6a-d67d-492b-869e-9867cada6682', 'brendan@artistinfluence.com', 'Brendan', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('2114ed6a-d67d-492b-869e-9867cada6682', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('2114ed6a-d67d-492b-869e-9867cada6682', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('2114ed6a-d67d-492b-869e-9867cada6682', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('2114ed6a-d67d-492b-869e-9867cada6682', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('2114ed6a-d67d-492b-869e-9867cada6682', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Brendan (brendan@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Brendan (brendan@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Brendan', 'brendan@artistinfluence.com', 'Inactive', NULL, false,
  (SELECT id FROM auth.users WHERE email = 'brendan@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Jack (jack@sunmachine.ltd)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jack@sunmachine.ltd') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '1d4c7617-5920-4fef-8f7b-c05fe5acb872', '00000000-0000-0000-0000-000000000000', 'jack@sunmachine.ltd',
      crypt('aRVmTMzL4jFR', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Jack","name":"Jack","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '1d4c7617-5920-4fef-8f7b-c05fe5acb872', '1d4c7617-5920-4fef-8f7b-c05fe5acb872',
      jsonb_build_object('sub', '1d4c7617-5920-4fef-8f7b-c05fe5acb872', 'email', 'jack@sunmachine.ltd', 'email_verified', true),
      'email', 'jack@sunmachine.ltd',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('1d4c7617-5920-4fef-8f7b-c05fe5acb872', 'jack@sunmachine.ltd', 'Jack', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1d4c7617-5920-4fef-8f7b-c05fe5acb872', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1d4c7617-5920-4fef-8f7b-c05fe5acb872', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1d4c7617-5920-4fef-8f7b-c05fe5acb872', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1d4c7617-5920-4fef-8f7b-c05fe5acb872', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1d4c7617-5920-4fef-8f7b-c05fe5acb872', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Jack (jack@sunmachine.ltd)';
  ELSE
    RAISE NOTICE 'Skipped existing: Jack (jack@sunmachine.ltd)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jack', 'jack@sunmachine.ltd', 'Inactive', NULL, false,
  (SELECT id FROM auth.users WHERE email = 'jack@sunmachine.ltd'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- Jared/Jack (no email - salespeople record only)
INSERT INTO public.salespeople (org_id, name, status, notes, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jared/Jack', 'Active', NULL, true)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------
-- Alex (alex@glassemainframe.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex@glassemainframe.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', '00000000-0000-0000-0000-000000000000', 'alex@glassemainframe.com',
      crypt('WLtWPLgzvSSk', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Alex","name":"Alex","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', '0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b',
      jsonb_build_object('sub', '0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', 'email', 'alex@glassemainframe.com', 'email_verified', true),
      'email', 'alex@glassemainframe.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', 'alex@glassemainframe.com', 'Alex', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0d0e6e01-a8c1-40cf-8fc1-5c07a0e8c23b', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Alex (alex@glassemainframe.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Alex (alex@glassemainframe.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Alex', 'alex@glassemainframe.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'alex@glassemainframe.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Marissa (marissafox@nolimitgroup.co)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'marissafox@nolimitgroup.co') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '1544228a-1a36-4def-95ea-0ac5dd6a6ee7', '00000000-0000-0000-0000-000000000000', 'marissafox@nolimitgroup.co',
      crypt('yjfPuyzHyjJs', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Marissa","name":"Marissa","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '1544228a-1a36-4def-95ea-0ac5dd6a6ee7', '1544228a-1a36-4def-95ea-0ac5dd6a6ee7',
      jsonb_build_object('sub', '1544228a-1a36-4def-95ea-0ac5dd6a6ee7', 'email', 'marissafox@nolimitgroup.co', 'email_verified', true),
      'email', 'marissafox@nolimitgroup.co',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('1544228a-1a36-4def-95ea-0ac5dd6a6ee7', 'marissafox@nolimitgroup.co', 'Marissa', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1544228a-1a36-4def-95ea-0ac5dd6a6ee7', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1544228a-1a36-4def-95ea-0ac5dd6a6ee7', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1544228a-1a36-4def-95ea-0ac5dd6a6ee7', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1544228a-1a36-4def-95ea-0ac5dd6a6ee7', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1544228a-1a36-4def-95ea-0ac5dd6a6ee7', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Marissa (marissafox@nolimitgroup.co)';
  ELSE
    RAISE NOTICE 'Skipped existing: Marissa (marissafox@nolimitgroup.co)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Marissa', 'marissafox@nolimitgroup.co', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'marissafox@nolimitgroup.co'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Jack D (jack@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jack@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'f466cace-fb39-4278-99c9-9851f0b9c0c7', '00000000-0000-0000-0000-000000000000', 'jack@artistinfluence.com',
      crypt('dhwwxAdYJHwx', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Jack D","name":"Jack D","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'f466cace-fb39-4278-99c9-9851f0b9c0c7', 'f466cace-fb39-4278-99c9-9851f0b9c0c7',
      jsonb_build_object('sub', 'f466cace-fb39-4278-99c9-9851f0b9c0c7', 'email', 'jack@artistinfluence.com', 'email_verified', true),
      'email', 'jack@artistinfluence.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('f466cace-fb39-4278-99c9-9851f0b9c0c7', 'jack@artistinfluence.com', 'Jack D', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f466cace-fb39-4278-99c9-9851f0b9c0c7', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f466cace-fb39-4278-99c9-9851f0b9c0c7', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f466cace-fb39-4278-99c9-9851f0b9c0c7', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f466cace-fb39-4278-99c9-9851f0b9c0c7', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f466cace-fb39-4278-99c9-9851f0b9c0c7', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Jack D (jack@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Jack D (jack@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jack D', 'jack@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'jack@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Katt (katt@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'katt@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '3703ece2-b72a-4e04-9966-e2fac03e2a5e', '00000000-0000-0000-0000-000000000000', 'katt@artistinfluence.com',
      crypt('cAWPR2BHBuMZ', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Katt","name":"Katt","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '3703ece2-b72a-4e04-9966-e2fac03e2a5e', '3703ece2-b72a-4e04-9966-e2fac03e2a5e',
      jsonb_build_object('sub', '3703ece2-b72a-4e04-9966-e2fac03e2a5e', 'email', 'katt@artistinfluence.com', 'email_verified', true),
      'email', 'katt@artistinfluence.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('3703ece2-b72a-4e04-9966-e2fac03e2a5e', 'katt@artistinfluence.com', 'Katt', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('3703ece2-b72a-4e04-9966-e2fac03e2a5e', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('3703ece2-b72a-4e04-9966-e2fac03e2a5e', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('3703ece2-b72a-4e04-9966-e2fac03e2a5e', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('3703ece2-b72a-4e04-9966-e2fac03e2a5e', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('3703ece2-b72a-4e04-9966-e2fac03e2a5e', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Katt (katt@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Katt (katt@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Katt', 'katt@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'katt@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Shaun (livemediaprod@gmail.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'livemediaprod@gmail.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '633a088d-2c89-4ecf-b82d-e0c1dd21f34e', '00000000-0000-0000-0000-000000000000', 'livemediaprod@gmail.com',
      crypt('vRw8Q8XGmf7P', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Shaun","name":"Shaun","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '633a088d-2c89-4ecf-b82d-e0c1dd21f34e', '633a088d-2c89-4ecf-b82d-e0c1dd21f34e',
      jsonb_build_object('sub', '633a088d-2c89-4ecf-b82d-e0c1dd21f34e', 'email', 'livemediaprod@gmail.com', 'email_verified', true),
      'email', 'livemediaprod@gmail.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('633a088d-2c89-4ecf-b82d-e0c1dd21f34e', 'livemediaprod@gmail.com', 'Shaun', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('633a088d-2c89-4ecf-b82d-e0c1dd21f34e', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('633a088d-2c89-4ecf-b82d-e0c1dd21f34e', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('633a088d-2c89-4ecf-b82d-e0c1dd21f34e', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('633a088d-2c89-4ecf-b82d-e0c1dd21f34e', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('633a088d-2c89-4ecf-b82d-e0c1dd21f34e', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Shaun (livemediaprod@gmail.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Shaun (livemediaprod@gmail.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Shaun', 'livemediaprod@gmail.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'livemediaprod@gmail.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Nate (n8landmusic@gmail.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'n8landmusic@gmail.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'f94ea237-877a-438a-8130-275ba0174212', '00000000-0000-0000-0000-000000000000', 'n8landmusic@gmail.com',
      crypt('Are7SqYRt4nH', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Nate","name":"Nate","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'f94ea237-877a-438a-8130-275ba0174212', 'f94ea237-877a-438a-8130-275ba0174212',
      jsonb_build_object('sub', 'f94ea237-877a-438a-8130-275ba0174212', 'email', 'n8landmusic@gmail.com', 'email_verified', true),
      'email', 'n8landmusic@gmail.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('f94ea237-877a-438a-8130-275ba0174212', 'n8landmusic@gmail.com', 'Nate', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f94ea237-877a-438a-8130-275ba0174212', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f94ea237-877a-438a-8130-275ba0174212', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f94ea237-877a-438a-8130-275ba0174212', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f94ea237-877a-438a-8130-275ba0174212', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('f94ea237-877a-438a-8130-275ba0174212', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Nate (n8landmusic@gmail.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Nate (n8landmusic@gmail.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nate', 'n8landmusic@gmail.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'n8landmusic@gmail.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- Carbin (no email - salespeople record only)
INSERT INTO public.salespeople (org_id, name, status, notes, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Carbin', 'Active', NULL, true)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------
-- Eric Garcia (eric@lightcave.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'eric@lightcave.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '247fe968-ba45-4fc9-90dd-a9c4818a306c', '00000000-0000-0000-0000-000000000000', 'eric@lightcave.com',
      crypt('VmpVRvdx5Bau', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Eric Garcia","name":"Eric Garcia","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '247fe968-ba45-4fc9-90dd-a9c4818a306c', '247fe968-ba45-4fc9-90dd-a9c4818a306c',
      jsonb_build_object('sub', '247fe968-ba45-4fc9-90dd-a9c4818a306c', 'email', 'eric@lightcave.com', 'email_verified', true),
      'email', 'eric@lightcave.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('247fe968-ba45-4fc9-90dd-a9c4818a306c', 'eric@lightcave.com', 'Eric Garcia', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('247fe968-ba45-4fc9-90dd-a9c4818a306c', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('247fe968-ba45-4fc9-90dd-a9c4818a306c', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('247fe968-ba45-4fc9-90dd-a9c4818a306c', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('247fe968-ba45-4fc9-90dd-a9c4818a306c', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('247fe968-ba45-4fc9-90dd-a9c4818a306c', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Eric Garcia (eric@lightcave.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Eric Garcia (eric@lightcave.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Eric Garcia', 'eric@lightcave.com', 'Pending', NULL, false,
  (SELECT id FROM auth.users WHERE email = 'eric@lightcave.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Amit (amit@prim8music.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'amit@prim8music.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '328521e8-25f4-4268-8da6-ec8dcbfcc466', '00000000-0000-0000-0000-000000000000', 'amit@prim8music.com',
      crypt('tn7GyL6fajBQ', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Amit","name":"Amit","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '328521e8-25f4-4268-8da6-ec8dcbfcc466', '328521e8-25f4-4268-8da6-ec8dcbfcc466',
      jsonb_build_object('sub', '328521e8-25f4-4268-8da6-ec8dcbfcc466', 'email', 'amit@prim8music.com', 'email_verified', true),
      'email', 'amit@prim8music.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('328521e8-25f4-4268-8da6-ec8dcbfcc466', 'amit@prim8music.com', 'Amit', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('328521e8-25f4-4268-8da6-ec8dcbfcc466', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('328521e8-25f4-4268-8da6-ec8dcbfcc466', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('328521e8-25f4-4268-8da6-ec8dcbfcc466', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('328521e8-25f4-4268-8da6-ec8dcbfcc466', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('328521e8-25f4-4268-8da6-ec8dcbfcc466', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Amit (amit@prim8music.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Amit (amit@prim8music.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Amit', 'amit@prim8music.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'amit@prim8music.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Danielle (danielle@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'danielle@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '9ceef164-d039-41cc-84f7-66d73e7453cc', '00000000-0000-0000-0000-000000000000', 'danielle@artistinfluence.com',
      crypt('sxyjrb6rvzAu', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Danielle","name":"Danielle","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '9ceef164-d039-41cc-84f7-66d73e7453cc', '9ceef164-d039-41cc-84f7-66d73e7453cc',
      jsonb_build_object('sub', '9ceef164-d039-41cc-84f7-66d73e7453cc', 'email', 'danielle@artistinfluence.com', 'email_verified', true),
      'email', 'danielle@artistinfluence.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('9ceef164-d039-41cc-84f7-66d73e7453cc', 'danielle@artistinfluence.com', 'Danielle', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9ceef164-d039-41cc-84f7-66d73e7453cc', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9ceef164-d039-41cc-84f7-66d73e7453cc', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9ceef164-d039-41cc-84f7-66d73e7453cc', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9ceef164-d039-41cc-84f7-66d73e7453cc', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('9ceef164-d039-41cc-84f7-66d73e7453cc', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Danielle (danielle@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Danielle (danielle@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Danielle', 'danielle@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'danielle@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Danny (danny@hitskope.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'danny@hitskope.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', '00000000-0000-0000-0000-000000000000', 'danny@hitskope.com',
      crypt('T3MZzgPzkJhW', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Danny","name":"Danny","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', '1dbfed73-96c9-4a47-8996-6ab0f0b31bfe',
      jsonb_build_object('sub', '1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', 'email', 'danny@hitskope.com', 'email_verified', true),
      'email', 'danny@hitskope.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', 'danny@hitskope.com', 'Danny', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1dbfed73-96c9-4a47-8996-6ab0f0b31bfe', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Danny (danny@hitskope.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Danny (danny@hitskope.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Danny', 'danny@hitskope.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'danny@hitskope.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Issy (issymusic@gmail.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'issymusic@gmail.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'd8122807-4892-4f38-b35a-4d97a6ca5c7c', '00000000-0000-0000-0000-000000000000', 'issymusic@gmail.com',
      crypt('Du4GmqWej47D', gen_salt('bf')),
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z',
      '{"full_name":"Issy","name":"Issy","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'd8122807-4892-4f38-b35a-4d97a6ca5c7c', 'd8122807-4892-4f38-b35a-4d97a6ca5c7c',
      jsonb_build_object('sub', 'd8122807-4892-4f38-b35a-4d97a6ca5c7c', 'email', 'issymusic@gmail.com', 'email_verified', true),
      'email', 'issymusic@gmail.com',
      '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z', '2026-02-12T16:50:47.867Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('d8122807-4892-4f38-b35a-4d97a6ca5c7c', 'issymusic@gmail.com', 'Issy', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('d8122807-4892-4f38-b35a-4d97a6ca5c7c', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('d8122807-4892-4f38-b35a-4d97a6ca5c7c', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('d8122807-4892-4f38-b35a-4d97a6ca5c7c', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('d8122807-4892-4f38-b35a-4d97a6ca5c7c', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('d8122807-4892-4f38-b35a-4d97a6ca5c7c', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Issy (issymusic@gmail.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Issy (issymusic@gmail.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Issy', 'issymusic@gmail.com', 'Pending', NULL, false,
  (SELECT id FROM auth.users WHERE email = 'issymusic@gmail.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Sam Hitlist (sam@hitlist.co)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sam@hitlist.co') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'fa62ab27-c9fc-43b5-97b4-95fa4988bbec', '00000000-0000-0000-0000-000000000000', 'sam@hitlist.co',
      crypt('SaSKyaWNDyEb', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Sam Hitlist","name":"Sam Hitlist","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'fa62ab27-c9fc-43b5-97b4-95fa4988bbec',
      jsonb_build_object('sub', 'fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'email', 'sam@hitlist.co', 'email_verified', true),
      'email', 'sam@hitlist.co',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'sam@hitlist.co', 'Sam Hitlist', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('fa62ab27-c9fc-43b5-97b4-95fa4988bbec', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Sam Hitlist (sam@hitlist.co)';
  ELSE
    RAISE NOTICE 'Skipped existing: Sam Hitlist (sam@hitlist.co)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sam Hitlist', 'sam@hitlist.co', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'sam@hitlist.co'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Perez (christine.perez-wood@tunecore.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'christine.perez-wood@tunecore.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'a3913e80-e273-4771-845d-cf784b360878', '00000000-0000-0000-0000-000000000000', 'christine.perez-wood@tunecore.com',
      crypt('z9wVJLKYcWXg', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Perez","name":"Perez","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'a3913e80-e273-4771-845d-cf784b360878', 'a3913e80-e273-4771-845d-cf784b360878',
      jsonb_build_object('sub', 'a3913e80-e273-4771-845d-cf784b360878', 'email', 'christine.perez-wood@tunecore.com', 'email_verified', true),
      'email', 'christine.perez-wood@tunecore.com',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('a3913e80-e273-4771-845d-cf784b360878', 'christine.perez-wood@tunecore.com', 'Perez', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a3913e80-e273-4771-845d-cf784b360878', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a3913e80-e273-4771-845d-cf784b360878', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a3913e80-e273-4771-845d-cf784b360878', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a3913e80-e273-4771-845d-cf784b360878', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a3913e80-e273-4771-845d-cf784b360878', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Perez (christine.perez-wood@tunecore.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Perez (christine.perez-wood@tunecore.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Perez', 'christine.perez-wood@tunecore.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'christine.perez-wood@tunecore.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Annette (annette@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'annette@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '1ab8b864-a31f-4dd2-895d-0450076047ee', '00000000-0000-0000-0000-000000000000', 'annette@artistinfluence.com',
      crypt('zH5ZRCDRrPTz', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Annette","name":"Annette","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '1ab8b864-a31f-4dd2-895d-0450076047ee', '1ab8b864-a31f-4dd2-895d-0450076047ee',
      jsonb_build_object('sub', '1ab8b864-a31f-4dd2-895d-0450076047ee', 'email', 'annette@artistinfluence.com', 'email_verified', true),
      'email', 'annette@artistinfluence.com',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('1ab8b864-a31f-4dd2-895d-0450076047ee', 'annette@artistinfluence.com', 'Annette', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1ab8b864-a31f-4dd2-895d-0450076047ee', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1ab8b864-a31f-4dd2-895d-0450076047ee', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1ab8b864-a31f-4dd2-895d-0450076047ee', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1ab8b864-a31f-4dd2-895d-0450076047ee', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('1ab8b864-a31f-4dd2-895d-0450076047ee', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Annette (annette@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Annette (annette@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Annette', 'annette@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'annette@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Reza (reza@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'reza@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', '00000000-0000-0000-0000-000000000000', 'reza@artistinfluence.com',
      crypt('k32FAnpuh2sG', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Reza","name":"Reza","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', '7d27af1f-81f6-41bd-9f08-2a2e8f2acadf',
      jsonb_build_object('sub', '7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', 'email', 'reza@artistinfluence.com', 'email_verified', true),
      'email', 'reza@artistinfluence.com',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', 'reza@artistinfluence.com', 'Reza', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('7d27af1f-81f6-41bd-9f08-2a2e8f2acadf', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Reza (reza@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Reza (reza@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Reza', 'reza@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'reza@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Cam (cam@artistinfluence.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cam@artistinfluence.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'aa46af64-ca93-43b4-ad7a-097d927616ab', '00000000-0000-0000-0000-000000000000', 'cam@artistinfluence.com',
      crypt('bK3Tzw7HmxCQ', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Cam","name":"Cam","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'aa46af64-ca93-43b4-ad7a-097d927616ab', 'aa46af64-ca93-43b4-ad7a-097d927616ab',
      jsonb_build_object('sub', 'aa46af64-ca93-43b4-ad7a-097d927616ab', 'email', 'cam@artistinfluence.com', 'email_verified', true),
      'email', 'cam@artistinfluence.com',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('aa46af64-ca93-43b4-ad7a-097d927616ab', 'cam@artistinfluence.com', 'Cam', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('aa46af64-ca93-43b4-ad7a-097d927616ab', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('aa46af64-ca93-43b4-ad7a-097d927616ab', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('aa46af64-ca93-43b4-ad7a-097d927616ab', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('aa46af64-ca93-43b4-ad7a-097d927616ab', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('aa46af64-ca93-43b4-ad7a-097d927616ab', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Cam (cam@artistinfluence.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Cam (cam@artistinfluence.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Cam', 'cam@artistinfluence.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'cam@artistinfluence.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Helene (helenehoward.mgmt@gmail.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'helenehoward.mgmt@gmail.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '692a0253-6897-48d3-a841-5cca2c15798b', '00000000-0000-0000-0000-000000000000', 'helenehoward.mgmt@gmail.com',
      crypt('EYyz3TdL7rAJ', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Helene","name":"Helene","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '692a0253-6897-48d3-a841-5cca2c15798b', '692a0253-6897-48d3-a841-5cca2c15798b',
      jsonb_build_object('sub', '692a0253-6897-48d3-a841-5cca2c15798b', 'email', 'helenehoward.mgmt@gmail.com', 'email_verified', true),
      'email', 'helenehoward.mgmt@gmail.com',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('692a0253-6897-48d3-a841-5cca2c15798b', 'helenehoward.mgmt@gmail.com', 'Helene', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('692a0253-6897-48d3-a841-5cca2c15798b', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('692a0253-6897-48d3-a841-5cca2c15798b', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('692a0253-6897-48d3-a841-5cca2c15798b', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('692a0253-6897-48d3-a841-5cca2c15798b', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('692a0253-6897-48d3-a841-5cca2c15798b', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Helene (helenehoward.mgmt@gmail.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Helene (helenehoward.mgmt@gmail.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Helene', 'helenehoward.mgmt@gmail.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'helenehoward.mgmt@gmail.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Tylie (ttopdjian@gmail.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ttopdjian@gmail.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'e408237b-bfa9-42b0-90e8-1dc47f1c04ef', '00000000-0000-0000-0000-000000000000', 'ttopdjian@gmail.com',
      crypt('nBeHuSPvejQq', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Tylie","name":"Tylie","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'e408237b-bfa9-42b0-90e8-1dc47f1c04ef',
      jsonb_build_object('sub', 'e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'email', 'ttopdjian@gmail.com', 'email_verified', true),
      'email', 'ttopdjian@gmail.com',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'ttopdjian@gmail.com', 'Tylie', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('e408237b-bfa9-42b0-90e8-1dc47f1c04ef', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Tylie (ttopdjian@gmail.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Tylie (ttopdjian@gmail.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tylie', 'ttopdjian@gmail.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'ttopdjian@gmail.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- --------------------------------------------------------
-- Jenni (jenni@rightcallmedia.co)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jenni@rightcallmedia.co') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '0bc04622-542c-4c88-9b90-ad37d34bf728', '00000000-0000-0000-0000-000000000000', 'jenni@rightcallmedia.co',
      crypt('BqxKjWQGnyDk', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Jenni","name":"Jenni","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '0bc04622-542c-4c88-9b90-ad37d34bf728', '0bc04622-542c-4c88-9b90-ad37d34bf728',
      jsonb_build_object('sub', '0bc04622-542c-4c88-9b90-ad37d34bf728', 'email', 'jenni@rightcallmedia.co', 'email_verified', true),
      'email', 'jenni@rightcallmedia.co',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('0bc04622-542c-4c88-9b90-ad37d34bf728', 'jenni@rightcallmedia.co', 'Jenni', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0bc04622-542c-4c88-9b90-ad37d34bf728', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0bc04622-542c-4c88-9b90-ad37d34bf728', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0bc04622-542c-4c88-9b90-ad37d34bf728', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0bc04622-542c-4c88-9b90-ad37d34bf728', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('0bc04622-542c-4c88-9b90-ad37d34bf728', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Jenni (jenni@rightcallmedia.co)';
  ELSE
    RAISE NOTICE 'Skipped existing: Jenni (jenni@rightcallmedia.co)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jenni', 'jenni@rightcallmedia.co', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'jenni@rightcallmedia.co'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- Andrea (no email - salespeople record only)
INSERT INTO public.salespeople (org_id, name, status, notes, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Andrea', 'Active', NULL, true)
ON CONFLICT DO NOTHING;

-- Hitskope (no email - salespeople record only)
INSERT INTO public.salespeople (org_id, name, status, notes, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Hitskope', 'Active', NULL, true)
ON CONFLICT DO NOTHING;

-- Cam/Lance (no email - salespeople record only)
INSERT INTO public.salespeople (org_id, name, status, notes, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Cam/Lance', 'Active', NULL, true)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------
-- Michael (phuturecollective@gmail.com)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'phuturecollective@gmail.com') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      '340d7a63-58b4-47b3-b90d-69be99ef3906', '00000000-0000-0000-0000-000000000000', 'phuturecollective@gmail.com',
      crypt('A2hXBCqGK93P', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Michael","name":"Michael","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      '340d7a63-58b4-47b3-b90d-69be99ef3906', '340d7a63-58b4-47b3-b90d-69be99ef3906',
      jsonb_build_object('sub', '340d7a63-58b4-47b3-b90d-69be99ef3906', 'email', 'phuturecollective@gmail.com', 'email_verified', true),
      'email', 'phuturecollective@gmail.com',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('340d7a63-58b4-47b3-b90d-69be99ef3906', 'phuturecollective@gmail.com', 'Michael', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('340d7a63-58b4-47b3-b90d-69be99ef3906', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('340d7a63-58b4-47b3-b90d-69be99ef3906', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('340d7a63-58b4-47b3-b90d-69be99ef3906', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('340d7a63-58b4-47b3-b90d-69be99ef3906', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('340d7a63-58b4-47b3-b90d-69be99ef3906', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Michael (phuturecollective@gmail.com)';
  ELSE
    RAISE NOTICE 'Skipped existing: Michael (phuturecollective@gmail.com)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Michael', 'phuturecollective@gmail.com', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'phuturecollective@gmail.com'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- Shrey (no email - salespeople record only)
INSERT INTO public.salespeople (org_id, name, status, notes, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Shrey', 'Active', NULL, true)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------
-- Luke (luke@nolimitgroup.co)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'luke@nolimitgroup.co') THEN

    -- Create auth user
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      aud, role, confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      'a2f8daca-f678-4a65-952b-515ecc6c91d3', '00000000-0000-0000-0000-000000000000', 'luke@nolimitgroup.co',
      crypt('tyYAktvtnLdg', gen_salt('bf')),
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z',
      '{"full_name":"Luke","name":"Luke","role":"sales","org_id":"00000000-0000-0000-0000-000000000001","org_name":"ARTi Marketing","email_verified":true}'::jsonb,
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated', 'authenticated', '', '', false
    );

    -- Create auth identity
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      'a2f8daca-f678-4a65-952b-515ecc6c91d3', 'a2f8daca-f678-4a65-952b-515ecc6c91d3',
      jsonb_build_object('sub', 'a2f8daca-f678-4a65-952b-515ecc6c91d3', 'email', 'luke@nolimitgroup.co', 'email_verified', true),
      'email', 'luke@nolimitgroup.co',
      '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z', '2026-02-12T16:50:47.868Z'
    );

    -- Create profile
    INSERT INTO public.profiles (id, email, name, role)
    VALUES ('a2f8daca-f678-4a65-952b-515ecc6c91d3', 'luke@nolimitgroup.co', 'Luke', 'sales')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- Create permissions (all platforms)
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a2f8daca-f678-4a65-952b-515ecc6c91d3', 'dashboard', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a2f8daca-f678-4a65-952b-515ecc6c91d3', 'instagram', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a2f8daca-f678-4a65-952b-515ecc6c91d3', 'spotify', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a2f8daca-f678-4a65-952b-515ecc6c91d3', 'youtube', true, true, false) ON CONFLICT DO NOTHING;
    INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
    VALUES ('a2f8daca-f678-4a65-952b-515ecc6c91d3', 'soundcloud', true, true, false) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created user: Luke (luke@nolimitgroup.co)';
  ELSE
    RAISE NOTICE 'Skipped existing: Luke (luke@nolimitgroup.co)';
  END IF;
END $$;

-- Salespeople record (links to auth user)
INSERT INTO public.salespeople (org_id, name, email, status, notes, is_active, auth_user_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Luke', 'luke@nolimitgroup.co', 'Active', NULL, true,
  (SELECT id FROM auth.users WHERE email = 'luke@nolimitgroup.co'))
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active;

-- Verify results
SELECT name, email, status, is_active, auth_user_id IS NOT NULL as has_login FROM public.salespeople ORDER BY name;

-- Import complete!