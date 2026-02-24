-- Fix: toggle_agent_carrier_contract fails at runtime with
-- "column reference agent_id is ambiguous" because the RETURNS TABLE
-- columns (agent_id, carrier_id) clash with carrier_contracts table columns
-- in the ON CONFLICT clause.
--
-- Solution: Drop and recreate with prefixed return-column names to avoid collision.

DROP FUNCTION IF EXISTS toggle_agent_carrier_contract(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION toggle_agent_carrier_contract(
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
    v_approved_date := CURRENT_DATE;
  ELSE
    v_new_status := 'terminated';
    v_approved_date := NULL;
  END IF;

  -- Upsert using the UNIQUE(agent_id, carrier_id) constraint
  RETURN QUERY
  INSERT INTO carrier_contracts (agent_id, carrier_id, status, approved_date)
  VALUES (v_agent_id, p_carrier_id, v_new_status, v_approved_date)
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

GRANT EXECUTE ON FUNCTION toggle_agent_carrier_contract(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION toggle_agent_carrier_contract IS
  'Self-service RPC: agents toggle their own carrier contracts. Validates carrier is in agent''s IMO. Sets approved_date server-side. Return columns prefixed with out_ to avoid PL/pgSQL ambiguity.';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('toggle_agent_carrier_contract', '20260223195736')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
