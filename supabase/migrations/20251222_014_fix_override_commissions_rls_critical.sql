-- Phase 7 Code Review Fix: Critical RLS and Trigger Issues
-- Fixes:
--   CRITICAL-1: Remove unused is_agent_in_my_agency function
--   CRITICAL-2: Add imo_id boundary check to agency owner RLS policies
--   CRITICAL-3: Update trigger to also set imo_id from base_agent

-- ============================================================================
-- CRITICAL-1: Remove unused is_agent_in_my_agency function
-- ============================================================================

DROP FUNCTION IF EXISTS is_agent_in_my_agency(uuid);

-- ============================================================================
-- CRITICAL-2: Fix Agency Owner RLS Policies - Add IMO Boundary Check
-- Without imo_id check, agency owners could theoretically access data from
-- agencies in other IMOs if they had the agency_id
-- ============================================================================

-- Drop existing agency owner policies
DROP POLICY IF EXISTS "Agency owners can view override_commissions in own agency" ON override_commissions;
DROP POLICY IF EXISTS "Agency owners can insert override_commissions in own agency" ON override_commissions;
DROP POLICY IF EXISTS "Agency owners can update override_commissions in own agency" ON override_commissions;
DROP POLICY IF EXISTS "Agency owners can delete override_commissions in own agency" ON override_commissions;

-- Recreate with imo_id boundary check
CREATE POLICY "Agency owners can view override_commissions in own agency"
ON override_commissions FOR SELECT
TO authenticated
USING (
  agency_id IS NOT NULL
  AND imo_id = get_my_imo_id()  -- CRITICAL: Enforce IMO boundary
  AND is_agency_owner(agency_id)
);

CREATE POLICY "Agency owners can insert override_commissions in own agency"
ON override_commissions FOR INSERT
TO authenticated
WITH CHECK (
  agency_id IS NOT NULL
  AND imo_id = get_my_imo_id()  -- CRITICAL: Enforce IMO boundary
  AND is_agency_owner(agency_id)
);

CREATE POLICY "Agency owners can update override_commissions in own agency"
ON override_commissions FOR UPDATE
TO authenticated
USING (
  agency_id IS NOT NULL
  AND imo_id = get_my_imo_id()  -- CRITICAL: Enforce IMO boundary
  AND is_agency_owner(agency_id)
);

CREATE POLICY "Agency owners can delete override_commissions in own agency"
ON override_commissions FOR DELETE
TO authenticated
USING (
  agency_id IS NOT NULL
  AND imo_id = get_my_imo_id()  -- CRITICAL: Enforce IMO boundary
  AND is_agency_owner(agency_id)
);

-- ============================================================================
-- CRITICAL-3: Fix Trigger to Also Set imo_id
-- Without this, records could be created with NULL imo_id, becoming orphans
-- that no one can see via RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_override_commission_agency_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get both agency_id and imo_id from base_agent's profile
  -- This ensures records are never orphaned without org context
  SELECT agency_id, imo_id INTO NEW.agency_id, NEW.imo_id
  FROM user_profiles
  WHERE id = NEW.base_agent_id;

  -- If base_agent has no imo_id, raise an error
  -- Override commissions must have org context for RLS to work
  IF NEW.imo_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create override commission: base_agent (%) has no imo_id', NEW.base_agent_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_override_commission_agency_id() IS
  'Auto-populates agency_id and imo_id from base_agent profile. Ensures org context for RLS.';

-- ============================================================================
-- Backfill any existing records that may have NULL imo_id
-- (Should be none based on earlier analysis, but safe to run)
-- ============================================================================

UPDATE override_commissions oc
SET
  agency_id = up.agency_id,
  imo_id = up.imo_id
FROM user_profiles up
WHERE oc.base_agent_id = up.id
  AND (oc.imo_id IS NULL OR oc.agency_id IS NULL);
