-- Migration: Verify and lock super admin to single user
-- Only nickneessen@thestandardhq.com should be super admin

BEGIN;

-- Ensure ONLY the designated super admin has the flag
UPDATE user_profiles
SET is_super_admin = false, updated_at = NOW()
WHERE email != 'nickneessen@thestandardhq.com'
  AND is_super_admin = true;

-- Ensure the super admin has the flag set
UPDATE user_profiles
SET is_super_admin = true, updated_at = NOW()
WHERE email = 'nickneessen@thestandardhq.com'
  AND (is_super_admin IS NULL OR is_super_admin = false);

-- Add constraint comment
COMMENT ON COLUMN user_profiles.is_super_admin IS 'Super admin flag - only one user (nickneessen@thestandardhq.com) should have this set to true';

COMMIT;
