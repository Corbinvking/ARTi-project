-- Fix the email_change NULL issue that crashes GoTrue
-- GoTrue expects empty string, not NULL

UPDATE auth.users SET
  email_change = ''
WHERE email_change IS NULL;

UPDATE auth.users SET
  email_change_token_new = ''
WHERE email_change_token_new IS NULL;

UPDATE auth.users SET
  email_change_token_current = ''
WHERE email_change_token_current IS NULL;

UPDATE auth.users SET
  phone_change = ''
WHERE phone_change IS NULL;

UPDATE auth.users SET
  phone_change_token = ''
WHERE phone_change_token IS NULL;

UPDATE auth.users SET
  reauthentication_token = ''
WHERE reauthentication_token IS NULL;

-- Verify email_change is fixed
SELECT email, email_change IS NULL as still_null
FROM auth.users 
WHERE email_change IS NULL;
