-- Create local user for development
-- Run this with: supabase db execute -f scripts/create-local-user.sql

-- Insert user into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@artistinfluence.com',
  crypt('admin123', gen_salt('bf')), -- Password: admin123
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"name":"Admin User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('admin123', gen_salt('bf')),
  updated_at = NOW();

-- Get the user ID
DO $$
DECLARE
  v_user_id UUID;
  v_membership_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@artistinfluence.com';
  
  -- Create membership if it doesn't exist
  INSERT INTO public.memberships (
    id,
    user_id,
    team_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    (SELECT id FROM public.teams LIMIT 1), -- Use first team or create one
    'admin',
    NOW(),
    NOW()
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'User created/updated: admin@artistinfluence.com';
  RAISE NOTICE 'Password: admin123';
  RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- Show the user
SELECT 
  id,
  email,
  role,
  email_confirmed_at,
  raw_app_meta_data->>'role' as app_role
FROM auth.users 
WHERE email = 'admin@artistinfluence.com';

