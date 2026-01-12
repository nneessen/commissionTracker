-- supabase/migrations/20251218_003_check_hidden_user.sql
-- Check the state of the hidden user

SELECT
  id,
  email,
  created_at,
  deleted_at,
  banned_until,
  is_sso_user,
  is_anonymous,
  role,
  aud,
  confirmation_sent_at,
  confirmed_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE id = 'd0d3edea-af6d-4990-80b8-1765ba829896';
