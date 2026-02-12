-- Compare instance_id between working users and imported users
SELECT email, instance_id, 
  raw_user_meta_data->>'role' as role,
  last_sign_in_at IS NOT NULL as has_logged_in
FROM auth.users
ORDER BY instance_id, email;

-- Check GoTrue settings
SELECT * FROM auth.schema_migrations ORDER BY version DESC LIMIT 5;
