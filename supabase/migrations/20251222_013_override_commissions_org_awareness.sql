-- Phase 7: Override Commissions Org Awareness
-- Adds agency_id column, helper functions, and RLS policies for full org visibility

-- ============================================================================
-- 1. Add agency_id column to override_commissions
-- ============================================================================

ALTER TABLE override_commissions
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL;

-- Add index for efficient agency-level queries
CREATE INDEX IF NOT EXISTS idx_override_commissions_agency_id
ON override_commissions(agency_id) WHERE agency_id IS NOT NULL;

COMMENT ON COLUMN override_commissions.agency_id IS
  'Agency where the base policy was written (inherited from base_agent)';

-- ============================================================================
-- 2. Helper function: Check if user is in the same agency as target user
-- ============================================================================

CREATE OR REPLACE FUNCTION is_agent_in_my_agency(target_agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles target
    JOIN user_profiles me ON me.id = auth.uid()
    JOIN agencies a ON a.id = target.agency_id
    WHERE target.id = target_agent_id
      AND target.agency_id IS NOT NULL
      AND me.agency_id IS NOT NULL
      AND a.owner_id = auth.uid()  -- Current user owns the agency
  );
$$;

COMMENT ON FUNCTION is_agent_in_my_agency(uuid) IS
  'Returns true if the target agent is in an agency owned by the current user';

-- ============================================================================
-- 3. Trigger function: Auto-populate agency_id from base_agent
-- ============================================================================

CREATE OR REPLACE FUNCTION set_override_commission_agency_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get agency_id from base_agent's profile
  SELECT agency_id INTO NEW.agency_id
  FROM user_profiles
  WHERE id = NEW.base_agent_id;

  RETURN NEW;
END;
$$;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trigger_set_override_agency_id ON override_commissions;

CREATE TRIGGER trigger_set_override_agency_id
  BEFORE INSERT ON override_commissions
  FOR EACH ROW
  EXECUTE FUNCTION set_override_commission_agency_id();

-- ============================================================================
-- 4. Backfill existing data (should be empty but safe to run)
-- ============================================================================

UPDATE override_commissions oc
SET agency_id = up.agency_id
FROM user_profiles up
WHERE oc.base_agent_id = up.id
  AND oc.agency_id IS NULL;

-- ============================================================================
-- 5. RLS Policies for Agency Owners
-- ============================================================================

-- Agency owners can view override commissions for agents in their agency
CREATE POLICY "Agency owners can view override_commissions in own agency"
ON override_commissions FOR SELECT
TO authenticated
USING (
  agency_id IS NOT NULL
  AND is_agency_owner(agency_id)
);

-- Agency owners can insert override commissions for agents in their agency
CREATE POLICY "Agency owners can insert override_commissions in own agency"
ON override_commissions FOR INSERT
TO authenticated
WITH CHECK (
  agency_id IS NOT NULL
  AND is_agency_owner(agency_id)
);

-- Agency owners can update override commissions in their agency
CREATE POLICY "Agency owners can update override_commissions in own agency"
ON override_commissions FOR UPDATE
TO authenticated
USING (
  agency_id IS NOT NULL
  AND is_agency_owner(agency_id)
);

-- Agency owners can delete override commissions in their agency
CREATE POLICY "Agency owners can delete override_commissions in own agency"
ON override_commissions FOR DELETE
TO authenticated
USING (
  agency_id IS NOT NULL
  AND is_agency_owner(agency_id)
);

-- ============================================================================
-- 6. Upgrade IMO Admin Policies (add INSERT/UPDATE/DELETE)
-- ============================================================================

-- IMO admins can insert override commissions in their IMO
CREATE POLICY "IMO admins can insert override_commissions in own IMO"
ON override_commissions FOR INSERT
TO authenticated
WITH CHECK (
  imo_id = get_my_imo_id()
  AND is_imo_admin()
);

-- IMO admins can update override commissions in their IMO
CREATE POLICY "IMO admins can update override_commissions in own IMO"
ON override_commissions FOR UPDATE
TO authenticated
USING (
  imo_id = get_my_imo_id()
  AND is_imo_admin()
);

-- IMO admins can delete override commissions in their IMO
CREATE POLICY "IMO admins can delete override_commissions in own IMO"
ON override_commissions FOR DELETE
TO authenticated
USING (
  imo_id = get_my_imo_id()
  AND is_imo_admin()
);

-- ============================================================================
-- 7. RPC Function: Get IMO Override Commission Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_imo_override_summary()
RETURNS TABLE (
  imo_id uuid,
  imo_name text,
  total_override_count bigint,
  total_override_amount numeric,
  pending_amount numeric,
  earned_amount numeric,
  paid_amount numeric,
  chargeback_amount numeric,
  unique_uplines bigint,
  unique_downlines bigint,
  avg_override_per_policy numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_is_imo_admin boolean;
BEGIN
  -- Get user's IMO and verify access
  SELECT up.imo_id INTO v_imo_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not assigned to an IMO'
      USING ERRCODE = 'P0001';
  END IF;

  -- Check if user is IMO admin
  SELECT is_imo_admin() INTO v_is_imo_admin;

  IF NOT v_is_imo_admin THEN
    RAISE EXCEPTION 'Access denied: IMO admin role required'
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  SELECT
    i.id AS imo_id,
    i.name AS imo_name,
    COUNT(oc.id) AS total_override_count,
    COALESCE(SUM(oc.override_commission_amount), 0) AS total_override_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'pending' THEN oc.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'earned' THEN oc.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'paid' THEN oc.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(oc.chargeback_amount), 0) AS chargeback_amount,
    COUNT(DISTINCT oc.override_agent_id) AS unique_uplines,
    COUNT(DISTINCT oc.base_agent_id) AS unique_downlines,
    CASE
      WHEN COUNT(DISTINCT oc.policy_id) > 0
      THEN ROUND(SUM(oc.override_commission_amount) / COUNT(DISTINCT oc.policy_id), 2)
      ELSE 0
    END AS avg_override_per_policy
  FROM imos i
  LEFT JOIN override_commissions oc ON oc.imo_id = i.id
  WHERE i.id = v_imo_id
  GROUP BY i.id, i.name;
END;
$$;

COMMENT ON FUNCTION get_imo_override_summary() IS
  'Returns override commission summary for IMO admins';

-- ============================================================================
-- 8. RPC Function: Get Agency Override Commission Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agency_override_summary(p_agency_id uuid DEFAULT NULL)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  total_override_count bigint,
  total_override_amount numeric,
  pending_amount numeric,
  earned_amount numeric,
  paid_amount numeric,
  chargeback_amount numeric,
  unique_uplines bigint,
  unique_downlines bigint,
  avg_override_per_policy numeric,
  top_earner_id uuid,
  top_earner_name text,
  top_earner_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_user_agency_id uuid;
  v_is_owner boolean;
  v_is_imo_admin boolean;
BEGIN
  -- Get user's agency
  SELECT up.agency_id INTO v_user_agency_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  -- Determine target agency
  v_agency_id := COALESCE(p_agency_id, v_user_agency_id);

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not assigned to an agency'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verify access: must be agency owner or IMO admin
  SELECT is_agency_owner(v_agency_id) INTO v_is_owner;
  SELECT is_imo_admin() INTO v_is_imo_admin;

  IF NOT v_is_owner AND NOT v_is_imo_admin THEN
    RAISE EXCEPTION 'Access denied: Agency owner or IMO admin role required'
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  WITH override_stats AS (
    SELECT
      oc.override_agent_id,
      SUM(oc.override_commission_amount) AS agent_total
    FROM override_commissions oc
    WHERE oc.agency_id = v_agency_id
    GROUP BY oc.override_agent_id
    ORDER BY agent_total DESC
    LIMIT 1
  ),
  top_earner AS (
    SELECT
      os.override_agent_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) AS name,
      os.agent_total
    FROM override_stats os
    LEFT JOIN user_profiles up ON up.id = os.override_agent_id
  )
  SELECT
    a.id AS agency_id,
    a.name AS agency_name,
    COUNT(oc.id) AS total_override_count,
    COALESCE(SUM(oc.override_commission_amount), 0) AS total_override_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'pending' THEN oc.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'earned' THEN oc.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'paid' THEN oc.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(oc.chargeback_amount), 0) AS chargeback_amount,
    COUNT(DISTINCT oc.override_agent_id) AS unique_uplines,
    COUNT(DISTINCT oc.base_agent_id) AS unique_downlines,
    CASE
      WHEN COUNT(DISTINCT oc.policy_id) > 0
      THEN ROUND(SUM(oc.override_commission_amount) / COUNT(DISTINCT oc.policy_id), 2)
      ELSE 0
    END AS avg_override_per_policy,
    te.override_agent_id AS top_earner_id,
    te.name AS top_earner_name,
    COALESCE(te.agent_total, 0) AS top_earner_amount
  FROM agencies a
  LEFT JOIN override_commissions oc ON oc.agency_id = a.id
  LEFT JOIN top_earner te ON true
  WHERE a.id = v_agency_id
  GROUP BY a.id, a.name, te.override_agent_id, te.name, te.agent_total;
END;
$$;

COMMENT ON FUNCTION get_agency_override_summary(uuid) IS
  'Returns override commission summary for agency owners/IMO admins';

-- ============================================================================
-- 9. RPC Function: Get Override Commissions by Agency (for IMO view)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_overrides_by_agency()
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  agency_code text,
  override_count bigint,
  total_amount numeric,
  pending_amount numeric,
  earned_amount numeric,
  paid_amount numeric,
  pct_of_imo_overrides numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_is_imo_admin boolean;
  v_total_imo_overrides numeric;
BEGIN
  -- Get user's IMO and verify access
  SELECT up.imo_id INTO v_imo_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not assigned to an IMO'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT is_imo_admin() INTO v_is_imo_admin;

  IF NOT v_is_imo_admin THEN
    RAISE EXCEPTION 'Access denied: IMO admin role required'
      USING ERRCODE = 'P0003';
  END IF;

  -- Calculate total IMO overrides for percentage
  SELECT COALESCE(SUM(override_commission_amount), 0) INTO v_total_imo_overrides
  FROM override_commissions
  WHERE imo_id = v_imo_id;

  RETURN QUERY
  SELECT
    a.id AS agency_id,
    a.name AS agency_name,
    a.code AS agency_code,
    COUNT(oc.id) AS override_count,
    COALESCE(SUM(oc.override_commission_amount), 0) AS total_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'pending' THEN oc.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'earned' THEN oc.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'paid' THEN oc.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    CASE
      WHEN v_total_imo_overrides > 0
      THEN ROUND((COALESCE(SUM(oc.override_commission_amount), 0) / v_total_imo_overrides) * 100, 1)
      ELSE 0
    END AS pct_of_imo_overrides
  FROM agencies a
  LEFT JOIN override_commissions oc ON oc.agency_id = a.id
  WHERE a.imo_id = v_imo_id
    AND a.is_active = true
  GROUP BY a.id, a.name, a.code
  ORDER BY total_amount DESC;
END;
$$;

COMMENT ON FUNCTION get_overrides_by_agency() IS
  'Returns override commission breakdown by agency for IMO admins';

-- ============================================================================
-- 10. RPC Function: Get Override Commissions by Agent (for Agency view)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_overrides_by_agent(p_agency_id uuid DEFAULT NULL)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  override_count bigint,
  total_amount numeric,
  pending_amount numeric,
  earned_amount numeric,
  paid_amount numeric,
  avg_per_override numeric,
  pct_of_agency_overrides numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_user_agency_id uuid;
  v_is_owner boolean;
  v_is_imo_admin boolean;
  v_total_agency_overrides numeric;
BEGIN
  -- Get user's agency
  SELECT up.agency_id INTO v_user_agency_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  v_agency_id := COALESCE(p_agency_id, v_user_agency_id);

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not assigned to an agency'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verify access
  SELECT is_agency_owner(v_agency_id) INTO v_is_owner;
  SELECT is_imo_admin() INTO v_is_imo_admin;

  IF NOT v_is_owner AND NOT v_is_imo_admin THEN
    RAISE EXCEPTION 'Access denied: Agency owner or IMO admin role required'
      USING ERRCODE = 'P0003';
  END IF;

  -- Calculate total agency overrides for percentage
  SELECT COALESCE(SUM(override_commission_amount), 0) INTO v_total_agency_overrides
  FROM override_commissions
  WHERE agency_id = v_agency_id;

  RETURN QUERY
  SELECT
    up.id AS agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) AS agent_name,
    up.email AS agent_email,
    COUNT(oc.id) AS override_count,
    COALESCE(SUM(oc.override_commission_amount), 0) AS total_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'pending' THEN oc.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'earned' THEN oc.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'paid' THEN oc.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    CASE
      WHEN COUNT(oc.id) > 0
      THEN ROUND(SUM(oc.override_commission_amount) / COUNT(oc.id), 2)
      ELSE 0
    END AS avg_per_override,
    CASE
      WHEN v_total_agency_overrides > 0
      THEN ROUND((COALESCE(SUM(oc.override_commission_amount), 0) / v_total_agency_overrides) * 100, 1)
      ELSE 0
    END AS pct_of_agency_overrides
  FROM user_profiles up
  JOIN override_commissions oc ON oc.override_agent_id = up.id AND oc.agency_id = v_agency_id
  WHERE up.agency_id = v_agency_id
    AND up.approval_status = 'approved'
  GROUP BY up.id, up.first_name, up.last_name, up.email
  ORDER BY total_amount DESC;
END;
$$;

COMMENT ON FUNCTION get_overrides_by_agent(uuid) IS
  'Returns override commission breakdown by agent for agency owners';
