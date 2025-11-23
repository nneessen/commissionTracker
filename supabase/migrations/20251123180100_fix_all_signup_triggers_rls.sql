-- Migration: Fix ALL signup triggers to bypass RLS
-- Purpose: Both handle_new_user() AND seed_default_expense_categories() need RLS bypass
-- Created: 2025-11-23
-- Root Cause: BOTH triggers on auth.users were blocked by RLS policies

BEGIN;

-- ============================================
-- FIX TRIGGER 1: handle_new_user
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN 'approved' ELSE 'pending' END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN true ELSE false END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN NOW() ELSE NULL END,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================
-- FIX TRIGGER 2: seed_default_expense_categories
-- ============================================

CREATE OR REPLACE FUNCTION public.seed_default_expense_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;

  INSERT INTO expense_categories (user_id, name, description, sort_order) VALUES
    (NEW.id, 'Marketing & Advertising', 'Lead generation, ads, website costs', 1),
    (NEW.id, 'Office & Administrative', 'Supplies, software subscriptions, CRM', 2),
    (NEW.id, 'Travel & Mileage', 'Client meetings, conferences, gas', 3),
    (NEW.id, 'Professional Services', 'E&O insurance, legal, accounting', 4),
    (NEW.id, 'Technology', 'Laptop, phone, software, tools', 5),
    (NEW.id, 'Meals & Entertainment', 'Client dinners, networking events', 6),
    (NEW.id, 'Licensing & Certifications', 'State licenses, CE credits', 7),
    (NEW.id, 'Phone & Internet', 'Mobile plan, internet service', 8),
    (NEW.id, 'Professional Development', 'Courses, seminars, coaching', 9),
    (NEW.id, 'Other', 'Miscellaneous business expenses', 10)
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Fixed: ALL Signup Triggers';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Updated functions to bypass RLS:';
    RAISE NOTICE '  1. handle_new_user()';
    RAISE NOTICE '  2. seed_default_expense_categories()';
    RAISE NOTICE '';
    RAISE NOTICE 'User signup WILL NOW WORK!';
    RAISE NOTICE '===========================================';
END $$;
