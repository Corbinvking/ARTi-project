-- Backfill passwords for admin/operator/vendor users that don't have one in profiles.
-- Sets auth.users.encrypted_password (bcrypt) and profiles.metadata.admin_set_password (plaintext for UI).
-- Run on the server: docker exec -i supabase_db_arti-marketing-ops psql -U postgres -d postgres < backfill-passwords-via-sql.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  r RECORD;
  pwd TEXT;
  users_updated INT := 0;
BEGIN
  FOR r IN
    SELECT u.id, u.email, u.full_name
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE ur.role IN ('admin', 'operator', 'vendor')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = u.id AND (p.metadata->>'admin_set_password') IS NOT NULL
    )
  LOOP
    -- 12-char alphanumeric password
    pwd := substring(md5(random()::text || clock_timestamp()::text) from 1 for 12);

    -- Update auth.users (bcrypt)
    UPDATE auth.users
    SET encrypted_password = crypt(pwd, gen_salt('bf'))
    WHERE id = r.id;

    IF FOUND THEN
      -- Upsert profiles.metadata.admin_set_password
      INSERT INTO public.profiles (id, email, name, metadata)
      VALUES (
        r.id,
        r.email,
        COALESCE(r.full_name, split_part(r.email, '@', 1)),
        jsonb_build_object('admin_set_password', pwd)
      )
      ON CONFLICT (id) DO UPDATE
      SET metadata = COALESCE(public.profiles.metadata, '{}'::jsonb) || jsonb_build_object('admin_set_password', EXCLUDED.metadata->>'admin_set_password');

      users_updated := users_updated + 1;
      RAISE NOTICE 'Set password for % (%)', r.email, r.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done. Updated % user(s).', users_updated;
END $$;

-- Verify
SELECT u.email, ur.role,
  (p.metadata->>'admin_set_password') IS NOT NULL AS has_password,
  left(p.metadata->>'admin_set_password', 6) AS pwd_preview
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE ur.role IN ('admin', 'operator', 'vendor')
ORDER BY ur.role, u.email;
