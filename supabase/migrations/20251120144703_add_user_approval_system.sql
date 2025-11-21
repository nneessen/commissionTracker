-- User Approval System Migration
-- Purpose: Add user approval system where admin must approve all new signups
-- Admin email: nick@nickneessen.com
-- Created: 2025-11-20

BEGIN;

-- ============================================
-- 1. CREATE USER_PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
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

-- Create index for faster approval status lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_approval_status ON user_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREATE AUTO-PROFILE TRIGGER
-- ============================================

-- Function to automatically create user profile when auth.users gets new record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_email TEXT := 'nick@nickneessen.com';
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
      WHEN NEW.email = admin_email THEN 'approved'
      ELSE 'pending'
    END,
    CASE
      WHEN NEW.email = admin_email THEN true
      ELSE false
    END,
    CASE
      WHEN NEW.email = admin_email THEN NOW()
      ELSE NULL
    END
  );

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. BACKFILL EXISTING USERS
-- ============================================

-- Create profiles for any existing users
INSERT INTO public.user_profiles (id, email, approval_status, is_admin, approved_at)
SELECT
  id,
  email,
  CASE
    WHEN email = 'nick@nickneessen.com' THEN 'approved'
    ELSE 'approved' -- Approve all existing users (they already have access)
  END,
  CASE
    WHEN email = 'nick@nickneessen.com' THEN true
    ELSE false
  END,
  NOW()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_profiles.id = auth.users.id
);

-- ============================================
-- 4. CREATE RLS POLICIES FOR USER_PROFILES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update all profiles (for approval/denial)
CREATE POLICY "Admins can update profiles" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Prevent non-admins from updating profiles
CREATE POLICY "Users cannot update profiles" ON user_profiles
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- ============================================
-- 5. UPDATE ALL EXISTING RLS POLICIES
-- ============================================

-- Helper function to check if user is approved
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

-- DROP all existing policies that need updating
DROP POLICY IF EXISTS "Authenticated users can manage carriers" ON carriers;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated users can read comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "Authenticated users can manage comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own policies" ON policies;
DROP POLICY IF EXISTS "Users can create own policies" ON policies;
DROP POLICY IF EXISTS "Users can update own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete own policies" ON policies;
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can create own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can delete own commissions" ON commissions;
DROP POLICY IF EXISTS "Authenticated users can manage chargebacks" ON chargebacks;
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can create own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can read constants" ON constants;
DROP POLICY IF EXISTS "Authenticated users can manage constants" ON constants;

-- RECREATE policies with approval check

-- Carriers (shared reference table - approved users only)
CREATE POLICY "Approved users can manage carriers" ON carriers
  FOR ALL
  USING (is_user_approved());

-- Products (shared reference table - approved users only)
CREATE POLICY "Approved users can manage products" ON products
  FOR ALL
  USING (is_user_approved());

-- Comp Guide (shared reference table - approved users only)
CREATE POLICY "Approved users can read comp_guide" ON comp_guide
  FOR SELECT
  USING (is_user_approved());

CREATE POLICY "Approved users can manage comp_guide" ON comp_guide
  FOR ALL
  USING (is_user_approved());

-- Constants (shared reference table - approved users only)
CREATE POLICY "Approved users can read constants" ON constants
  FOR SELECT
  USING (is_user_approved());

CREATE POLICY "Approved users can manage constants" ON constants
  FOR ALL
  USING (is_user_approved());

-- Clients (user-specific - approved users can access their own)
CREATE POLICY "Approved users can view own clients" ON clients
  FOR SELECT
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can create own clients" ON clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can update own clients" ON clients
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can delete own clients" ON clients
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- Policies (user-specific - approved users can access their own)
CREATE POLICY "Approved users can view own policies" ON policies
  FOR SELECT
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can create own policies" ON policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can update own policies" ON policies
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can delete own policies" ON policies
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- Commissions (user-specific - approved users can access their own)
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

-- Chargebacks (user-specific - approved users can access their own through commissions)
CREATE POLICY "Approved users can manage chargebacks" ON chargebacks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM commissions
      WHERE commissions.id = chargebacks.commission_id
      AND commissions.user_id = auth.uid()
    ) AND is_user_approved()
  );

-- Expenses (user-specific - approved users can access their own)
CREATE POLICY "Approved users can view own expenses" ON expenses
  FOR SELECT
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can create own expenses" ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can update own expenses" ON expenses
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can delete own expenses" ON expenses
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- Settings (user-specific - approved users can access their own)
CREATE POLICY "Approved users can view own settings" ON settings
  FOR SELECT
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can create own settings" ON settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can update own settings" ON settings
  FOR UPDATE
  USING (auth.uid() = user_id AND is_user_approved());

CREATE POLICY "Approved users can delete own settings" ON settings
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_approved());

-- ============================================
-- 6. UPDATE POLICIES THAT DON'T HAVE user_id
-- ============================================

-- Check if expense_categories table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
    DROP POLICY IF EXISTS "Authenticated users can manage expense_categories" ON expense_categories;
    CREATE POLICY "Approved users can manage expense_categories" ON expense_categories
      FOR ALL
      USING (is_user_approved());
  END IF;
END $$;

-- Check if user_targets table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_targets') THEN
    DROP POLICY IF EXISTS "Users can view own targets" ON user_targets;
    DROP POLICY IF EXISTS "Users can create own targets" ON user_targets;
    DROP POLICY IF EXISTS "Users can update own targets" ON user_targets;
    DROP POLICY IF EXISTS "Users can delete own targets" ON user_targets;

    CREATE POLICY "Approved users can view own targets" ON user_targets
      FOR SELECT
      USING (auth.uid() = user_id AND is_user_approved());

    CREATE POLICY "Approved users can create own targets" ON user_targets
      FOR INSERT
      WITH CHECK (auth.uid() = user_id AND is_user_approved());

    CREATE POLICY "Approved users can update own targets" ON user_targets
      FOR UPDATE
      USING (auth.uid() = user_id AND is_user_approved());

    CREATE POLICY "Approved users can delete own targets" ON user_targets
      FOR DELETE
      USING (auth.uid() = user_id AND is_user_approved());
  END IF;
END $$;

-- Check if user_commission_rates table exists and update its policies
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_commission_rates') THEN
    DROP POLICY IF EXISTS "Users can view own commission rates" ON user_commission_rates;
    DROP POLICY IF EXISTS "Users can create own commission rates" ON user_commission_rates;
    DROP POLICY IF EXISTS "Users can update own commission rates" ON user_commission_rates;
    DROP POLICY IF EXISTS "Users can delete own commission rates" ON user_commission_rates;

    CREATE POLICY "Approved users can view own commission rates" ON user_commission_rates
      FOR SELECT
      USING (auth.uid() = user_id AND is_user_approved());

    CREATE POLICY "Approved users can create own commission rates" ON user_commission_rates
      FOR INSERT
      WITH CHECK (auth.uid() = user_id AND is_user_approved());

    CREATE POLICY "Approved users can update own commission rates" ON user_commission_rates
      FOR UPDATE
      USING (auth.uid() = user_id AND is_user_approved());

    CREATE POLICY "Approved users can delete own commission rates" ON user_commission_rates
      FOR DELETE
      USING (auth.uid() = user_id AND is_user_approved());
  END IF;
END $$;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'User Approval System Migration Complete!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - user_profiles table';
    RAISE NOTICE '  - Auto-profile trigger for new signups';
    RAISE NOTICE '  - is_user_approved() helper function';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated:';
    RAISE NOTICE '  - All RLS policies now check approval status';
    RAISE NOTICE '  - Admin email: nick@nickneessen.com';
    RAISE NOTICE '';
    RAISE NOTICE 'Security:';
    RAISE NOTICE '  - New users default to pending status';
    RAISE NOTICE '  - Only approved users can access data';
    RAISE NOTICE '  - Admin auto-approved and marked as admin';
    RAISE NOTICE '  - Existing users auto-approved (backward compat)';
    RAISE NOTICE '===========================================';
END $$;
