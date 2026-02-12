-- Check operator, admin, vendor: do they have admin_set_password in profiles?
SELECT u.email, ur.role,
  (p.metadata->>'admin_set_password') IS NOT NULL AS has_password,
  LEFT(COALESCE(p.metadata->>'admin_set_password', ''), 6) AS pwd_preview
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE ur.role IN ('admin', 'operator', 'vendor')
ORDER BY ur.role, u.email;
