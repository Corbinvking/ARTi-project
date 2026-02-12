SELECT email, metadata->>'admin_set_password' AS password
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'admin'
LIMIT 1;
