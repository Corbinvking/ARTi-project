-- Check if auth.users has admin_set_password in raw_user_meta_data for these emails
SELECT u.email, ur.role,
  (au.raw_user_meta_data->>'admin_set_password') IS NOT NULL AS auth_has_pwd,
  LEFT(COALESCE(au.raw_user_meta_data->>'admin_set_password', ''), 6) AS auth_pwd_preview
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN auth.users au ON au.id = u.id
WHERE ur.role IN ('admin', 'operator', 'vendor')
ORDER BY ur.role, u.email;
