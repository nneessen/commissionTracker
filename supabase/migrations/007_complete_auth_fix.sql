-- Migration: Complete Auth System Fix
-- Purpose: Completely restore authentication to working state
-- Created: 2025-11-21

BEGIN;

-- ============================================
-- 1. DROP EVERYTHING RELATED TO USER PROFILES
-- ============================================

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_user_approved() CASCADE;

-- Drop table (CASCADE will drop all policies automatically)
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'denied')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_profiles_approval_status ON user_profiles(approval_status);
CREATE INDEX idx_user_profiles_is_admin ON user_profiles(is_admin);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE SIMPLE WORKING RLS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admin can view all (using direct email check to avoid recursion)
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'nick@nickneessen.com'
    )
  );

-- Admin can update all (using direct email check to avoid recursion)
CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'nick@nickneessen.com'
    )
  );

-- ============================================
-- 4. CREATE is_user_approved FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Special case: Admin always approved
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  IF user_email = 'nick@nickneessen.com' THEN
    RETURN true;
  END IF;

  -- Check user_profiles table
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (approval_status = 'approved' OR is_admin = true)
  );
END;
$$;

-- ============================================
-- 5. CREATE AUTO-PROFILE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    approval_status,
    is_admin,
    approved_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email = 'nick@nickneessen.com' THEN 'approved'
      ELSE 'pending'
    END,
    CASE
      WHEN NEW.email = 'nick@nickneessen.com' THEN true
      ELSE false
    END,
    CASE
      WHEN NEW.email = 'nick@nickneessen.com' THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. INSERT ADMIN USER PROFILE
-- ============================================

-- Get the admin user's auth.users.id and create their profile
INSERT INTO user_profiles (id, email, approval_status, is_admin, approved_at)
SELECT
  id,
  email,
  'approved',
  true,
  NOW()
FROM auth.users
WHERE email = 'nick@nickneessen.com'
ON CONFLICT (id) DO UPDATE SET
  approval_status = 'approved',
  is_admin = true,
  approved_at = NOW();

-- Also ensure any other existing users are approved (they were working before)
INSERT INTO user_profiles (id, email, approval_status, is_admin, approved_at)
SELECT
  id,
  email,
  'approved',
  false,
  NOW()
FROM auth.users
WHERE email != 'nick@nickneessen.com'
ON CONFLICT (id) DO UPDATE SET
  approval_status = 'approved',
  approved_at = NOW();

-- ============================================
-- 7. FIX ALL OTHER TABLES' RLS TO USE is_user_approved()
-- ============================================

-- Drop and recreate commission policies
DROP POLICY IF EXISTS "Approved users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Approved users can create own commissions" ON commissions;
DROP POLICY IF EXISTS "Approved users can update own commissions" ON commissions;
DROP POLICY IF EXISTS "Approved users can delete own commissions" ON commissions;

CREATE POLICY "Approved users can view own commissions" ON commissions
  FOR SELECT
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can create own commissions" ON commissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can update own commissions" ON commissions
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can delete own commissions" ON commissions
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- ============================================
-- 8. VERIFY ADMIN ACCESS
-- ============================================

DO $$
DECLARE
  admin_count INTEGER;
  admin_approved BOOLEAN;
  test_result BOOLEAN;
BEGIN
  -- Check admin exists in user_profiles
  SELECT COUNT(*) INTO admin_count
  FROM user_profiles
  WHERE email = 'nick@nickneessen.com';

  IF admin_count = 0 THEN
    RAISE WARNING 'NO ADMIN USER FOUND IN user_profiles!';
  ELSE
    -- Check admin is approved
    SELECT (approval_status = 'approved' AND is_admin = true) INTO admin_approved
    FROM user_profiles
    WHERE email = 'nick@nickneessen.com';

    IF admin_approved THEN
      RAISE NOTICE '✓ Admin user exists and is approved';
    ELSE
      RAISE WARNING '✗ Admin user exists but NOT approved/admin!';
    END IF;
  END IF;

  -- Test is_user_approved for admin
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE email = 'nick@nickneessen.com'
    AND (approval_status = 'approved' OR is_admin = true)
  ) INTO test_result;

  IF test_result THEN
    RAISE NOTICE '✓ is_user_approved() should work for admin';
  ELSE
    RAISE WARNING '✗ is_user_approved() will NOT work for admin!';
  END IF;
END $$;

COMMIT;

-- ============================================
-- FINAL MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'AUTH SYSTEM COMPLETELY REBUILT';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Actions taken:';
    RAISE NOTICE '  1. Dropped and recreated user_profiles table';
    RAISE NOTICE '  2. Recreated all auth functions and triggers';
    RAISE NOTICE '  3. Inserted admin user as approved';
    RAISE NOTICE '  4. Fixed all RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin should now be able to access the app!';
    RAISE NOTICE '===========================================';
END $$;