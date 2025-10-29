-- Create admin user for local development
-- Password: admin123

-- First, delete any existing user with this email
DELETE FROM auth.users WHERE email = 'admin@artistinfluence.com';

-- Create the user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'authenticated',
  'authenticated',
  'admin@artistinfluence.com',
  '$2a$10$rBqMzKzW7E3qW1jP8L5yqeTHWLN.XDdYLBPg7xZ8YGXLZj4xQhpKG', -- Password: admin123
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"name":"Admin User","role":"admin"}',
  false,
  NOW(),
  NOW()
);

-- Show the created user
SELECT 
  id,
  email,
  role,
  email_confirmed_at as confirmed,
  created_at
FROM auth.users 
WHERE email = 'admin@artistinfluence.com';

\echo 'User created successfully!'
\echo 'Email: admin@artistinfluence.com'
\echo 'Password: admin123'

