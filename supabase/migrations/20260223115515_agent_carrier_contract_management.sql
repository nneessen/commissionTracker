-- Agent Carrier Contract Management
-- Fixes RLS policies on carrier_contracts for IMO isolation + agent self-service
-- Updates get_available_carriers_for_recruit to include upline contract awareness
-- Creates get_agent_carrier_contracts RPC for agent self-service UI

-- ============================================================================
-- 1A. Fix carrier_contracts RLS policies (add IMO isolation)
-- ============================================================================

-- Drop existing policies (no IMO isolation)
DROP POLICY IF EXISTS "Staff can manage contracts" ON public.carrier_contracts;
DROP POLICY IF EXISTS "Agents can view own contracts" ON public.carrier_contracts;

-- Staff: SELECT within same IMO
CREATE POLICY "Staff can view contracts in IMO" ON public.carrier_contracts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles caller
      JOIN user_profiles agent ON agent.id = carrier_contracts.agent_id
      WHERE caller.id = auth.uid()
      AND caller.imo_id = agent.imo_id
      AND (
        caller.roles @> ARRAY['trainer']::text[]
        OR caller.roles @> ARRAY['contracting_manager']::text[]
        OR caller.is_admin = true
      )
    )
  );

-- Staff: INSERT/UPDATE/DELETE within same IMO
CREATE POLICY "Staff can manage contracts in IMO" ON public.carrier_contracts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles caller
      JOIN user_profiles agent ON agent.id = carrier_contracts.agent_id
      WHERE caller.id = auth.uid()
      AND caller.imo_id = agent.imo_id
      AND (
        caller.roles @> ARRAY['trainer']::text[]
        OR caller.roles @> ARRAY['contracting_manager']::text[]
        OR caller.is_admin = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles caller
      JOIN user_profiles agent ON agent.id = carrier_contracts.agent_id
      WHERE caller.id = auth.uid()
      AND caller.imo_id = agent.imo_id
      AND (
        caller.roles @> ARRAY['trainer']::text[]
        OR caller.roles @> ARRAY['contracting_manager']::text[]
        OR caller.is_admin = true
      )
    )
  );

-- Agent: SELECT own contracts
CREATE POLICY "Agents can view own contracts" ON public.carrier_contracts
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- Agent: INSERT own contracts (self-service)
CREATE POLICY "Agents can insert own contracts" ON public.carrier_contracts
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

-- Agent: UPDATE own contracts (self-service toggle)
CREATE POLICY "Agents can update own contracts" ON public.carrier_contracts
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());


-- ============================================================================
-- 1B. Update get_available_carriers_for_recruit with upline contract awareness
-- ============================================================================

DROP FUNCTION IF EXISTS get_available_carriers_for_recruit(UUID);

CREATE OR REPLACE FUNCTION get_available_carriers_for_recruit(p_recruit_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  contracting_metadata JSONB,
  priority INTEGER,
  upline_has_contract BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recruit_imo_id UUID;
  v_upline_id UUID;
BEGIN
  -- Get recruit's IMO and upline
  SELECT up.imo_id, up.upline_id INTO v_recruit_imo_id, v_upline_id
  FROM user_profiles up
  WHERE up.id = p_recruit_id;

  IF v_recruit_imo_id IS NULL THEN
    RAISE EXCEPTION 'Recruit not found or has no IMO';
  END IF;

  -- Verify caller has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles up2
    WHERE up2.id = auth.uid()
    AND (
      up2.id = p_recruit_id
      OR (
        up2.imo_id = v_recruit_imo_id
        AND (up2.roles @> ARRAY['trainer']::text[]
             OR up2.roles @> ARRAY['contracting_manager']::text[]
             OR up2.is_admin = true)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.contracting_metadata,
    COALESCE((c.contracting_metadata->>'priority')::int, 999) AS priority,
    -- If no upline, all carriers available (TRUE). Otherwise check upline's contracts.
    CASE
      WHEN v_upline_id IS NULL THEN TRUE
      ELSE EXISTS (
        SELECT 1 FROM carrier_contracts cc
        WHERE cc.agent_id = v_upline_id
        AND cc.carrier_id = c.id
        AND cc.status = 'approved'
      )
    END AS upline_has_contract
  FROM carriers c
  WHERE c.is_active = true
  AND c.imo_id = v_recruit_imo_id
  AND c.id NOT IN (
    SELECT ccr.carrier_id
    FROM carrier_contract_requests ccr
    WHERE ccr.recruit_id = p_recruit_id
  )
  ORDER BY priority ASC, c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_carriers_for_recruit(UUID) TO authenticated;

COMMENT ON FUNCTION get_available_carriers_for_recruit IS
  'Returns carriers available for contracting, with upline_has_contract flag for constraining assignments.';

-- Update function version tracking
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_available_carriers_for_recruit', '20260223115515')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();


-- ============================================================================
-- 1C. Create get_agent_carrier_contracts RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agent_carrier_contracts(p_agent_id UUID)
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
  -- Get agent's IMO
  SELECT up.imo_id INTO v_agent_imo_id
  FROM user_profiles up
  WHERE up.id = p_agent_id;

  IF v_agent_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agent not found or has no IMO';
  END IF;

  -- Verify caller: must be the agent themselves OR same-IMO staff/admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles caller
    WHERE caller.id = auth.uid()
    AND (
      caller.id = p_agent_id
      OR (
        caller.imo_id = v_agent_imo_id
        AND (caller.roles @> ARRAY['trainer']::text[]
             OR caller.roles @> ARRAY['contracting_manager']::text[]
             OR caller.is_admin = true)
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
  FROM carrier_contracts cc
  JOIN carriers c ON c.id = cc.carrier_id
  WHERE cc.agent_id = p_agent_id
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agent_carrier_contracts(UUID) TO authenticated;

COMMENT ON FUNCTION get_agent_carrier_contracts IS
  'Returns all carrier contracts for an agent. Caller must be the agent or same-IMO staff.';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_agent_carrier_contracts', '20260223115515')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
