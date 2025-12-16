-- supabase/migrations/20251216_003_update_admin_email.sql
-- Update admin email from nick@nickneessen.com to nickneessen@thestandardhq.com

-- First, update the auth.users email
UPDATE auth.users
SET email = 'nickneessen@thestandardhq.com',
    email_confirmed_at = NOW()
WHERE email = 'nick@nickneessen.com';

-- Then update the user_profiles email to match
UPDATE user_profiles
SET email = 'nickneessen@thestandardhq.com',
    updated_at = NOW()
WHERE email = 'nick@nickneessen.com';

-- Verify the update
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'nickneessen@thestandardhq.com';
