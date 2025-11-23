-- Migration: Fix Admin User Data
-- Purpose: Ensure admin user has correct approval_status and is_admin flags
-- Created: 2025-11-21

BEGIN;

-- Update admin user to be approved and marked as admin
UPDATE user_profiles
SET
  approval_status = 'approved',
  is_admin = true,
  approved_at = NOW()
WHERE email = 'nick@nickneessen.com';

-- Verify the update
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  SELECT * INTO admin_record
  FROM user_profiles
  WHERE email = 'nick@nickneessen.com';

  IF admin_record.approval_status = 'approved' AND admin_record.is_admin = true THEN
    RAISE NOTICE 'Admin user fixed: approval_status=%, is_admin=%', admin_record.approval_status, admin_record.is_admin;
  ELSE
    RAISE WARNING 'Admin user data not correct: approval_status=%, is_admin=%', admin_record.approval_status, admin_record.is_admin;
  END IF;
END $$;

COMMIT;
