-- Check if Luke's auth user exists and verify password
SELECT id, email, encrypted_password IS NOT NULL as has_password, 
  email_confirmed_at IS NOT NULL as email_confirmed,
  raw_user_meta_data->>'full_name' as name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'admin_set_password' as stored_pw,
  aud, role as auth_role,
  created_at
FROM auth.users 
WHERE email = 'luke@nolimitgroup.co';

-- Test the password actually works with crypt
SELECT 
  email,
  encrypted_password = crypt('tyYAktvtnLdg', encrypted_password) as password_valid
FROM auth.users 
WHERE email = 'luke@nolimitgroup.co';

-- Check if identity exists (required for login)
SELECT i.id, i.user_id, i.provider, i.provider_id, i.created_at
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'luke@nolimitgroup.co';
