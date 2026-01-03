-- supabase/migrations/20260103_003_fix_leads_visibility.sql
-- Migration: Fix Leads Visibility for Staff Roles
-- Date: 2026-01-03
-- Purpose: Users should only see their own leads, not all leads in their IMO
--
-- Problem: Staff roles (trainer, contracting_manager) were seeing all leads in their IMO
-- due to the "Staff can view IMO leads" and "Staff can update IMO leads" policies.
--
-- Solution: Remove IMO-wide visibility for staff. Each user sees only their own leads.
-- Super admins retain full visibility.

-- ============================================================================
-- 1. Remove staff IMO-wide SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view IMO leads" ON recruiting_leads;

-- ============================================================================
-- 2. Remove staff IMO-wide UPDATE policy
-- ============================================================================

DROP POLICY IF EXISTS "Staff can update IMO leads" ON recruiting_leads;

-- ============================================================================
-- 3. Verification
-- ============================================================================
-- After this migration, the remaining policies are:
-- - "Recruiters can view own leads" (recruiter_id = auth.uid()) - users see own leads
-- - "Super admins can view all leads" - super admins see all
-- - "Recruiters can update own leads" (recruiter_id = auth.uid()) - users update own leads
-- - "Super admins can update all leads" - super admins update all
-- - "Anon users can submit leads" - public lead submission
-- - "Auth users can submit leads" - authenticated lead submission

COMMENT ON TABLE recruiting_leads IS 'Stores public recruiting funnel submissions before they become recruits. Users see only their own leads.';
