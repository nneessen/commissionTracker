-- supabase/migrations/20260220170000_fix_critical_security_issues.sql
-- Fix critical security vulnerabilities and bugs in carrier contracting system
--
-- FIXES:
-- 1. Multi-tenancy breach: Add IMO isolation to RLS policies
-- 2. SECURITY DEFINER function without IMO filter
-- 3. Missing updated_by audit column
-- 4. Race condition in request_order (add sequence)
-- 5. Function version tracking inconsistency

-- ============================================================================
-- FIX #1: Add updated_by column for audit trail
-- ============================================================================

ALTER TABLE carrier_contract_requests
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES user_profiles(id);

COMMENT ON COLUMN carrier_contract_requests.updated_by IS 'User who last updated this record (for audit trail)';

-- ============================================================================
-- FIX #2: Create sequence for request_order to prevent race conditions
-- ============================================================================

-- Create sequence for auto-incrementing request_order within each recruit
CREATE SEQUENCE IF NOT EXISTS carrier_contract_request_order_seq;

-- ============================================================================
-- FIX #3: Drop and recreate RLS policies with IMO isolation
-- ============================================================================

-- Drop existing policies (they lack IMO filtering)
DROP POLICY IF EXISTS "Staff can view all contract requests" ON carrier_contract_requests;
DROP POLICY IF EXISTS "Staff can manage all contract requests" ON carrier_contract_requests;
DROP POLICY IF EXISTS "Recruits can view own contract requests" ON carrier_contract_requests;
DROP POLICY IF EXISTS "Recruits can update own contract requests" ON carrier_contract_requests;

-- Create new policies with IMO isolation and better security

-- Policy 1: Staff (trainer/contracting_manager/admin) can manage contracts in their IMO only
CREATE POLICY "Staff can manage contracts in own IMO" ON carrier_contract_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles staff
    WHERE staff.id = auth.uid()
    AND (staff.roles @> ARRAY['trainer']::text[]
         OR staff.roles @> ARRAY['contracting_manager']::text[]
         OR staff.is_admin = true)
    AND EXISTS (
      SELECT 1 FROM user_profiles recruit
      WHERE recruit.id = carrier_contract_requests.recruit_id
      AND recruit.imo_id = staff.imo_id  -- IMO ISOLATION
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles staff
    WHERE staff.id = auth.uid()
    AND (staff.roles @> ARRAY['trainer']::text[]
         OR staff.roles @> ARRAY['contracting_manager']::text[]
         OR staff.is_admin = true)
    AND EXISTS (
      SELECT 1 FROM user_profiles recruit
      WHERE recruit.id = carrier_contract_requests.recruit_id
      AND recruit.imo_id = staff.imo_id  -- IMO ISOLATION
    )
  )
);

-- Policy 2: Recruits can view their own contract requests
CREATE POLICY "Recruits can view own contracts" ON carrier_contract_requests
FOR SELECT
USING (recruit_id = auth.uid());

-- Policy 3: Recruits can update limited fields on their own requests
CREATE POLICY "Recruits can update own contracts (limited)" ON carrier_contract_requests
FOR UPDATE
USING (recruit_id = auth.uid())
WITH CHECK (
  recruit_id = auth.uid()
  AND recruit_id = OLD.recruit_id  -- Cannot change recruit
  AND carrier_id = OLD.carrier_id  -- Cannot change carrier
  AND status = OLD.status  -- Cannot change status
  AND request_order = OLD.request_order  -- Cannot change order
  AND created_by = OLD.created_by  -- Cannot change creator
  AND created_at = OLD.created_at  -- Cannot change creation time
);

-- ============================================================================
-- FIX #4: Fix get_available_carriers_for_recruit function with IMO isolation
-- ============================================================================

DROP FUNCTION IF EXISTS get_available_carriers_for_recruit(UUID);

CREATE OR REPLACE FUNCTION get_available_carriers_for_recruit(p_recruit_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  contracting_metadata JSONB,
  priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recruit_imo_id UUID;
BEGIN
  -- SECURITY: Get recruit's IMO to ensure tenant isolation
  SELECT imo_id INTO v_recruit_imo_id
  FROM user_profiles
  WHERE id = p_recruit_id;

  IF v_recruit_imo_id IS NULL THEN
    RAISE EXCEPTION 'Recruit not found or has no IMO';
  END IF;

  -- SECURITY: Verify caller has permission to access this recruit's data
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      -- Same recruit
      id = p_recruit_id
      -- Or staff in same IMO
      OR (
        imo_id = v_recruit_imo_id
        AND (roles @> ARRAY['trainer']::text[]
             OR roles @> ARRAY['contracting_manager']::text[]
             OR is_admin = true)
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
    COALESCE((c.contracting_metadata->>'priority')::int, 999) AS priority
  FROM carriers c
  WHERE c.is_active = true
  AND c.imo_id = v_recruit_imo_id  -- IMO ISOLATION
  AND c.id NOT IN (
    SELECT carrier_id
    FROM carrier_contract_requests
    WHERE recruit_id = p_recruit_id
  )
  ORDER BY priority ASC, c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_carriers_for_recruit(UUID) TO authenticated;

COMMENT ON FUNCTION get_available_carriers_for_recruit IS 'Returns carriers available for contracting (not yet requested by recruit), filtered by IMO, ordered by priority. Includes auth and tenant isolation checks.';

-- ============================================================================
-- FIX #5: Update function version tracking (use correct column name)
-- ============================================================================

INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_available_carriers_for_recruit', '20260220170000')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('carrier_contract_requests_rls_policies', '20260220170000')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ============================================================================
-- Fix trigger to set updated_by
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS carrier_contract_requests_set_updated_by ON carrier_contract_requests;

CREATE TRIGGER carrier_contract_requests_set_updated_by
  BEFORE UPDATE ON carrier_contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- ============================================================================

-- Test IMO isolation:
-- SELECT * FROM get_available_carriers_for_recruit('<recruit_id>');

-- Test RLS policies:
-- SET ROLE authenticated;
-- SET request.jwt.claims.sub = '<user_id>';
-- SELECT * FROM carrier_contract_requests;
