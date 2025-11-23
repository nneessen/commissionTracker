-- Migration: Fix is_user_approved Function
-- Purpose: Ensure is_user_approved() function works correctly
-- Created: 2025-11-21

BEGIN;

-- Recreate the is_user_approved function to ensure it works
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (approval_status = 'approved' OR is_admin = true)
  );
END;
$$;

-- Test the function for admin user
DO $$
DECLARE
  result BOOLEAN;
  admin_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id FROM user_profiles WHERE email = 'nick@nickneessen.com';

  -- Check if function works
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = admin_id
    AND (approval_status = 'approved' OR is_admin = true)
  ) INTO result;

  IF result THEN
    RAISE NOTICE 'is_user_approved function test: PASS - Admin user should be approved';
  ELSE
    RAISE WARNING 'is_user_approved function test: FAIL - Admin user NOT approved!';
  END IF;
END $$;

COMMIT;
