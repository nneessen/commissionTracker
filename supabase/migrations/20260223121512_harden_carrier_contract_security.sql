-- Harden Carrier Contract Security
-- Addresses code review findings:
-- Critical #1: Enforce upline contract rule on carrier_contract_requests write path
-- Critical #2: Replace permissive agent self-service with narrow server-side RPC
-- Moderate #3: Add IMO filtering to get_agent_carrier_contracts
-- Moderate #4: Move approved_date stamping to server-side

-- ============================================================================
-- FIX #1: BEFORE INSERT trigger on carrier_contract_requests
-- Enforces: if recruit has an upline, that upline must have an approved
-- carrier_contracts record for the requested carrier.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_upline_carrier_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_id UUID;
BEGIN
  -- Get the recruit's upline
  SELECT up.upline_id INTO v_upline_id
  FROM user_profiles up
  WHERE up.id = NEW.recruit_id;

  -- If recruit has no upline, allow all carriers (no constraint)
  IF v_upline_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verify upline has an approved contract for this carrier
  IF NOT EXISTS (
    SELECT 1 FROM carrier_contracts cc
    WHERE cc.agent_id = v_upline_id
    AND cc.carrier_id = NEW.carrier_id
    AND cc.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Carrier contract request blocked: upline does not have an approved contract for this carrier'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS enforce_upline_carrier_contract ON carrier_contract_requests;

CREATE TRIGGER enforce_upline_carrier_contract
  BEFORE INSERT ON carrier_contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_upline_carrier_contract();

COMMENT ON FUNCTION check_upline_carrier_contract IS
  'Trigger function: blocks carrier_contract_requests inserts when the recruit''s upline lacks an approved contract for the carrier. Bypassed when recruit has no upline.';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('check_upline_carrier_contract', '20260223121512')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();


-- ============================================================================
-- FIX #2: Remove agent direct INSERT/UPDATE RLS policies.
-- Replace with a narrow server-side RPC that validates:
-- - carrier belongs to agent's IMO
-- - only allows 'approved' or 'terminated' status
-- - stamps approved_date server-side
-- ============================================================================

-- Remove permissive agent write policies
DROP POLICY IF EXISTS "Agents can insert own contracts" ON public.carrier_contracts;
DROP POLICY IF EXISTS "Agents can update own contracts" ON public.carrier_contracts;

-- Agent read stays (needed for the self-service UI to see their contracts)
-- "Agents can view own contracts" remains intact

-- Create the narrow self-service RPC
CREATE OR REPLACE FUNCTION toggle_agent_carrier_contract(
  p_carrier_id UUID,
  p_active BOOLEAN
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  carrier_id UUID,
  status TEXT,
  approved_date DATE,
  writing_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID;
  v_agent_imo_id UUID;
  v_carrier_imo_id UUID;
  v_new_status TEXT;
  v_approved_date DATE;
BEGIN
  v_agent_id := auth.uid();

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get agent's IMO
  SELECT up.imo_id INTO v_agent_imo_id
  FROM user_profiles up
  WHERE up.id = v_agent_id;

  IF v_agent_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agent not found or has no IMO';
  END IF;

  -- Validate carrier belongs to agent's IMO
  SELECT c.imo_id INTO v_carrier_imo_id
  FROM carriers c
  WHERE c.id = p_carrier_id AND c.is_active = true;

  IF v_carrier_imo_id IS NULL THEN
    RAISE EXCEPTION 'Carrier not found or inactive';
  END IF;

  IF v_carrier_imo_id != v_agent_imo_id THEN
    RAISE EXCEPTION 'Carrier does not belong to your organization';
  END IF;

  -- Determine status and date (server-side, no client control)
  IF p_active THEN
    v_new_status := 'approved';
    v_approved_date := CURRENT_DATE;  -- Server-side, timezone-safe
  ELSE
    v_new_status := 'terminated';
    v_approved_date := NULL;  -- Clear on deactivation
  END IF;

  -- Upsert using the UNIQUE(agent_id, carrier_id) constraint
  RETURN QUERY
  INSERT INTO carrier_contracts (agent_id, carrier_id, status, approved_date)
  VALUES (v_agent_id, p_carrier_id, v_new_status, v_approved_date)
  ON CONFLICT (agent_id, carrier_id) DO UPDATE SET
    status = v_new_status,
    approved_date = CASE
      -- Preserve existing approved_date when deactivating
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

GRANT EXECUTE ON FUNCTION toggle_agent_carrier_contract(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION toggle_agent_carrier_contract IS
  'Self-service RPC: agents toggle their own carrier contracts. Validates carrier is in agent''s IMO. Sets approved_date server-side. Preserves approved_date on deactivation.';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('toggle_agent_carrier_contract', '20260223121512')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();


-- ============================================================================
-- FIX #3: Harden get_agent_carrier_contracts with IMO carrier filtering
-- ============================================================================

DROP FUNCTION IF EXISTS get_agent_carrier_contracts(UUID);

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
    AND c.imo_id = v_agent_imo_id  -- FIX: enforce carrier belongs to agent's IMO
  WHERE cc.agent_id = p_agent_id
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agent_carrier_contracts(UUID) TO authenticated;

COMMENT ON FUNCTION get_agent_carrier_contracts IS
  'Returns carrier contracts for an agent, filtered to carriers in agent''s IMO. Caller must be the agent or same-IMO staff.';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_agent_carrier_contracts', '20260223121512')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
