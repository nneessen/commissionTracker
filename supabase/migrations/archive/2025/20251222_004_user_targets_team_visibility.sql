-- Migration: Add team visibility to user_targets
-- Enables managers to view their downline's targets
-- Enables IMO admins to view all targets in their IMO

-- ============================================================================
-- 1. Add RLS policies for hierarchy visibility
-- ============================================================================

-- Policy: Uplines can view their direct downlines' targets
CREATE POLICY "Uplines can view downline targets" ON user_targets FOR SELECT
USING (
  is_upline_of(user_id)
);

-- Policy: IMO admins can view all targets in their IMO
CREATE POLICY "IMO admins can view all targets in own IMO" ON user_targets FOR SELECT
USING (
  is_imo_admin() AND user_id IN (
    SELECT id FROM user_profiles WHERE imo_id = get_my_imo_id()
  )
);

-- Policy: Super admins can view all targets
CREATE POLICY "Super admins can view all targets" ON user_targets FOR SELECT
USING (is_super_admin());

-- ============================================================================
-- 2. Create function to get downline targets with owner info
-- ============================================================================

CREATE OR REPLACE FUNCTION get_downline_targets()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  owner_name text,
  annual_income_target numeric,
  monthly_income_target numeric,
  quarterly_income_target numeric,
  annual_policies_target integer,
  monthly_policies_target integer,
  avg_premium_target numeric,
  persistency_13_month_target numeric,
  persistency_25_month_target numeric,
  monthly_expense_target numeric,
  expense_ratio_target numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ut.id,
    ut.user_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as owner_name,
    ut.annual_income_target,
    ut.monthly_income_target,
    ut.quarterly_income_target,
    ut.annual_policies_target,
    ut.monthly_policies_target,
    ut.avg_premium_target,
    ut.persistency_13_month_target,
    ut.persistency_25_month_target,
    ut.monthly_expense_target,
    ut.expense_ratio_target,
    ut.created_at,
    ut.updated_at
  FROM user_targets ut
  INNER JOIN user_profiles up ON ut.user_id = up.id
  WHERE
    ut.user_id IS NOT NULL
    AND ut.user_id IN (
      SELECT target.id
      FROM user_profiles target
      INNER JOIN user_profiles me ON me.id = auth.uid()
      WHERE
        me.agency_id IS NOT NULL
        AND target.agency_id IS NOT NULL
        AND target.agency_id = me.agency_id
        AND target.hierarchy_path IS NOT NULL
        AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
        AND target.id != auth.uid()
    )
  ORDER BY owner_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_downline_targets() TO authenticated;

-- ============================================================================
-- 3. Create function to get IMO targets (for IMO admins)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_imo_targets()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  owner_name text,
  agency_name text,
  annual_income_target numeric,
  monthly_income_target numeric,
  quarterly_income_target numeric,
  annual_policies_target integer,
  monthly_policies_target integer,
  avg_premium_target numeric,
  persistency_13_month_target numeric,
  persistency_25_month_target numeric,
  monthly_expense_target numeric,
  expense_ratio_target numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow IMO admins
  IF NOT is_imo_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ut.id,
    ut.user_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as owner_name,
    COALESCE(a.name, 'No Agency') as agency_name,
    ut.annual_income_target,
    ut.monthly_income_target,
    ut.quarterly_income_target,
    ut.annual_policies_target,
    ut.monthly_policies_target,
    ut.avg_premium_target,
    ut.persistency_13_month_target,
    ut.persistency_25_month_target,
    ut.monthly_expense_target,
    ut.expense_ratio_target,
    ut.created_at,
    ut.updated_at
  FROM user_targets ut
  INNER JOIN user_profiles up ON ut.user_id = up.id
  LEFT JOIN agencies a ON up.agency_id = a.id
  WHERE
    ut.user_id IS NOT NULL
    AND up.imo_id = get_my_imo_id()
  ORDER BY agency_name, owner_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_targets() TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_downline_targets() IS
'Returns targets from downline agents with owner names for managers';

COMMENT ON FUNCTION get_imo_targets() IS
'Returns all targets in the IMO with owner and agency info (admin only)';
