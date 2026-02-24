-- Hierarchy-scoped licensing/writing page access improvements
-- - Allow uplines to INSERT/UPDATE downline writing numbers and state licenses
-- - Allow uplines to read agent carrier contracts via RPC
-- - Add RPC for toggling carrier contracts for a visible target agent (self/upline/staff/admin)

-- ============================================================================
-- 1) agent_writing_numbers: allow uplines to insert/update downline records
-- ============================================================================

DROP POLICY IF EXISTS agent_writing_numbers_insert_policy ON public.agent_writing_numbers;
CREATE POLICY agent_writing_numbers_insert_policy ON public.agent_writing_numbers
  FOR INSERT WITH CHECK (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR (
      is_imo_admin() AND (
        imo_id = get_my_imo_id()
        OR (
          imo_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = agent_writing_numbers.agent_id
              AND up.imo_id = get_my_imo_id()
          )
        )
      )
    )
    OR is_super_admin()
  );

DROP POLICY IF EXISTS agent_writing_numbers_update_policy ON public.agent_writing_numbers;
CREATE POLICY agent_writing_numbers_update_policy ON public.agent_writing_numbers
  FOR UPDATE
  USING (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR (is_imo_admin() AND imo_id = get_my_imo_id())
    OR is_super_admin()
  )
  WITH CHECK (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR (is_imo_admin() AND imo_id = get_my_imo_id())
    OR is_super_admin()
  );

-- ============================================================================
-- 2) agent_state_licenses: allow uplines to insert/update downline records
-- ============================================================================

DROP POLICY IF EXISTS agent_state_licenses_insert_policy ON public.agent_state_licenses;
CREATE POLICY agent_state_licenses_insert_policy ON public.agent_state_licenses
  FOR INSERT WITH CHECK (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  );

DROP POLICY IF EXISTS agent_state_licenses_update_policy ON public.agent_state_licenses;
CREATE POLICY agent_state_licenses_update_policy ON public.agent_state_licenses
  FOR UPDATE
  USING (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  )
  WITH CHECK (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  );

DROP POLICY IF EXISTS agent_state_licenses_delete_policy ON public.agent_state_licenses;
CREATE POLICY agent_state_licenses_delete_policy ON public.agent_state_licenses
  FOR DELETE
  USING (
    agent_id = (SELECT auth.uid())
    OR is_upline_of(agent_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND (up.is_super_admin = true OR up.is_admin = true)
    )
  );

-- ============================================================================
-- 3) carrier contracts RPC: allow uplines to read visible agent contracts
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_agent_carrier_contracts(UUID);

CREATE OR REPLACE FUNCTION public.get_agent_carrier_contracts(p_agent_id UUID)
RETURNS TABLE (
  carrier_id UUID,
  carrier_name VARCHAR(255),
  status TEXT,
  writing_number TEXT,
  approved_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_imo_id UUID;
BEGIN
  SELECT up.imo_id
  INTO v_agent_imo_id
  FROM public.user_profiles up
  WHERE up.id = p_agent_id;

  IF v_agent_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agent not found or has no IMO';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles caller
    WHERE caller.id = auth.uid()
      AND (
        caller.id = p_agent_id
        OR is_upline_of(p_agent_id)
        OR caller.is_super_admin = true
        OR (
          caller.imo_id = v_agent_imo_id
          AND (
            caller.roles @> ARRAY['trainer']::text[]
            OR caller.roles @> ARRAY['contracting_manager']::text[]
            OR caller.is_admin = true
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    cc.carrier_id,
    c.name AS carrier_name,
    cc.status,
    cc.writing_number,
    cc.approved_date
  FROM public.carrier_contracts cc
  JOIN public.carriers c
    ON c.id = cc.carrier_id
   AND c.imo_id = v_agent_imo_id
  WHERE cc.agent_id = p_agent_id
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_carrier_contracts(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_agent_carrier_contracts IS
  'Returns carrier contracts for an agent, filtered to carriers in agent''s IMO. Caller must be self, an upline, same-IMO staff/admin, or super admin.';

INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_agent_carrier_contracts', '20260224101500')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ============================================================================
-- 4) carrier contracts RPC: toggle visible agent contract (self/upline/staff/admin)
-- ============================================================================

DROP FUNCTION IF EXISTS public.toggle_visible_agent_carrier_contract(UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.toggle_visible_agent_carrier_contract(
  p_target_agent_id UUID,
  p_carrier_id UUID,
  p_active BOOLEAN
)
RETURNS TABLE (
  out_id UUID,
  out_agent_id UUID,
  out_carrier_id UUID,
  out_status TEXT,
  out_approved_date DATE,
  out_writing_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_imo_id UUID;
  v_caller_roles TEXT[];
  v_caller_is_admin BOOLEAN;
  v_caller_is_super_admin BOOLEAN;
  v_target_imo_id UUID;
  v_carrier_imo_id UUID;
  v_new_status TEXT;
  v_approved_date DATE;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    up.imo_id,
    COALESCE(up.roles, ARRAY[]::TEXT[]),
    COALESCE(up.is_admin, false),
    COALESCE(up.is_super_admin, false)
  INTO
    v_caller_imo_id,
    v_caller_roles,
    v_caller_is_admin,
    v_caller_is_super_admin
  FROM public.user_profiles up
  WHERE up.id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller profile not found';
  END IF;

  SELECT up.imo_id
  INTO v_target_imo_id
  FROM public.user_profiles up
  WHERE up.id = p_target_agent_id;

  IF v_target_imo_id IS NULL THEN
    RAISE EXCEPTION 'Target agent not found or has no IMO';
  END IF;

  IF NOT (
    v_caller_id = p_target_agent_id
    OR is_upline_of(p_target_agent_id)
    OR v_caller_is_super_admin
    OR (
      v_caller_imo_id = v_target_imo_id
      AND (
        v_caller_is_admin
        OR v_caller_roles @> ARRAY['trainer']::text[]
        OR v_caller_roles @> ARRAY['contracting_manager']::text[]
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT c.imo_id
  INTO v_carrier_imo_id
  FROM public.carriers c
  WHERE c.id = p_carrier_id
    AND c.is_active = true;

  IF v_carrier_imo_id IS NULL THEN
    RAISE EXCEPTION 'Carrier not found or inactive';
  END IF;

  IF v_carrier_imo_id != v_target_imo_id THEN
    RAISE EXCEPTION 'Carrier does not belong to target agent organization';
  END IF;

  IF p_active THEN
    v_new_status := 'approved';
    v_approved_date := CURRENT_DATE;
  ELSE
    v_new_status := 'terminated';
    v_approved_date := NULL;
  END IF;

  RETURN QUERY
  INSERT INTO public.carrier_contracts (agent_id, carrier_id, status, approved_date)
  VALUES (p_target_agent_id, p_carrier_id, v_new_status, v_approved_date)
  ON CONFLICT (agent_id, carrier_id) DO UPDATE SET
    status = v_new_status,
    approved_date = CASE
      WHEN v_new_status = 'terminated' THEN carrier_contracts.approved_date
      ELSE v_approved_date
    END,
    updated_at = NOW()
  RETURNING
    carrier_contracts.id,
    carrier_contracts.agent_id,
    carrier_contracts.carrier_id,
    carrier_contracts.status,
    carrier_contracts.approved_date,
    carrier_contracts.writing_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_visible_agent_carrier_contract(UUID, UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.toggle_visible_agent_carrier_contract IS
  'Toggles a carrier contract for a visible target agent. Allowed for self, uplines, same-IMO staff/admin, and super admins. Validates carrier IMO and stamps approved_date server-side.';

INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('toggle_visible_agent_carrier_contract', '20260224101500')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
