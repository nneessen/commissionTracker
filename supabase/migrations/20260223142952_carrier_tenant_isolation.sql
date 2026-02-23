-- Carrier Contract Tenant Isolation
-- Fix: check_upline_carrier_contract trigger doesn't verify carrier belongs to recruit's IMO.
-- Fix: Staff carrier_contracts RLS WITH CHECK doesn't validate carrier IMO.

-- ============================================================================
-- 2A. Patch check_upline_carrier_contract() trigger — add carrier IMO check
-- ============================================================================

CREATE OR REPLACE FUNCTION check_upline_carrier_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_id UUID;
  v_recruit_imo_id UUID;
BEGIN
  -- Get the recruit's upline and IMO
  SELECT up.upline_id, up.imo_id INTO v_upline_id, v_recruit_imo_id
  FROM user_profiles up
  WHERE up.id = NEW.recruit_id;

  -- Verify carrier belongs to the recruit's IMO
  IF NOT EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = NEW.carrier_id
    AND c.imo_id = v_recruit_imo_id
    AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'Carrier does not belong to your organization'
      USING ERRCODE = 'check_violation';
  END IF;

  -- If recruit has no upline, allow (no upline constraint)
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

COMMENT ON FUNCTION check_upline_carrier_contract IS
  'Trigger function: blocks carrier_contract_requests inserts when (a) carrier is not in recruit''s IMO, or (b) recruit''s upline lacks an approved contract for the carrier. Bypassed when recruit has no upline (for upline check only).';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('check_upline_carrier_contract', '20260223142952')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ============================================================================
-- 2B. Add carrier IMO validation to staff carrier_contracts WITH CHECK
-- ============================================================================

-- Drop and recreate with carrier IMO check in WITH CHECK
DROP POLICY IF EXISTS "Staff can manage contracts in IMO" ON public.carrier_contracts;

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
    AND EXISTS (
      SELECT 1 FROM carriers c
      WHERE c.id = carrier_contracts.carrier_id
      AND c.imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    )
  );
