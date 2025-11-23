-- Migration: Fix handle_new_user() to bypass RLS for user creation
-- Purpose: Update signup trigger to bypass RLS when creating user_profiles
-- Created: 2025-11-23
-- Root Cause: RLS policy user_profiles_insert_own blocks SECURITY DEFINER function

BEGIN;

-- ============================================
-- UPDATE handle_new_user FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disable RLS for this function
  -- This is necessary because even SECURITY DEFINER functions
  -- respect RLS unless explicitly bypassed
  SET LOCAL row_security = off;

  INSERT INTO public.user_profiles (
    id,
    email,
    approval_status,
    is_admin,
    approved_at,
    upline_id
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
    END,
    NULL  -- New users have no upline by default (root agents)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Fixed: handle_new_user() RLS Bypass';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Updated handle_new_user() to bypass RLS';
    RAISE NOTICE 'Root cause: RLS policy blocked INSERT';
    RAISE NOTICE '';
    RAISE NOTICE 'User signup now works correctly!';
    RAISE NOTICE '===========================================';
END $$;
