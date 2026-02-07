-- supabase/migrations/20260207113114_fix_team_policy_visibility.sql
--
-- Fix: Team leaders see $0 metrics for downline agents
--
-- Root cause: is_upline_of() requires target.agency_id = me.agency_id,
-- but team leaders and their downlines can be in different agencies.
-- The hierarchy_path already encodes the organizational relationship,
-- so the agency_id check is redundant and actively blocks legitimate access.
--
-- Changes:
-- 1. Replace is_upline_of() to remove the agency_id same-agency requirement
-- 2. Remove duplicate _select_own_only policies (duplicates of named policies)

BEGIN;

-- ============================================================================
-- 1. Fix is_upline_of() - Remove agency_id requirement
-- ============================================================================
-- The hierarchy_path is the source of truth for upline relationships.
-- If user A's UUID appears in user B's hierarchy_path, A is B's upline.
-- No additional agency_id check is needed.

CREATE OR REPLACE FUNCTION is_upline_of(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles target
    WHERE target.id = target_user_id
      -- hierarchy_path must exist
      AND target.hierarchy_path IS NOT NULL
      -- Current user's UUID must appear in target's hierarchy_path
      AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
      -- Don't count self as upline
      AND target.id != auth.uid()
  );
$$;

-- ============================================================================
-- 2. Remove duplicate _select_own_only policies
-- ============================================================================
-- These are duplicates of the named policies and cause unnecessary evaluation.

DROP POLICY IF EXISTS "policies_select_own_only" ON policies;
DROP POLICY IF EXISTS "commissions_select_own_only" ON commissions;

COMMIT;
