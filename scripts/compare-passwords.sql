-- Compare encrypted_password format between working and imported users
SELECT email, 
  substring(encrypted_password from 1 for 7) as hash_prefix,
  length(encrypted_password) as hash_length,
  last_sign_in_at IS NOT NULL as has_logged_in
FROM auth.users
WHERE email IN ('admin@arti-demo.com', 'operator@arti-demo.com', 'vendor1@arti-demo.com', 'test-member@artistinfluence.com', 'luke@nolimitgroup.co', 'jared@artistinfluence.com')
ORDER BY email;

-- Check full hash structure for comparison
SELECT email, encrypted_password
FROM auth.users
WHERE email IN ('admin@arti-demo.com', 'luke@nolimitgroup.co')
ORDER BY email;
