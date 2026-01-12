-- supabase/migrations/20251231_001_sync_override_status_with_commission.sql
-- Sync override_commissions status with base commission status
--
-- PROBLEM: Overrides are created with 'pending' status when policy is inserted,
-- but uplines shouldn't see override earnings until the base agent's commission is paid.
--
-- SOLUTION: Create a trigger that updates override_commissions status when the
-- corresponding base commission status changes.
--
-- Status mapping:
--   Commission 'paid'        -> Override 'earned' (upline can now count this income)
--   Commission 'charged_back' -> Override 'chargedback'
--   Commission 'cancelled'   -> Override 'cancelled'
--   Commission 'clawback'    -> Override 'chargedback'
--   Commission 'pending'     -> Override 'pending' (back to pending if commission unpaid)
--   Commission 'earned'      -> Override 'pending' (not paid yet, still pending for upline)

-- ============================================================================
-- PART 1: Create the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_override_commission_status()
RETURNS TRIGGER AS $$
DECLARE
  v_new_override_status TEXT;
  v_updated_count INTEGER;
BEGIN
  -- Only process if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Skip if no policy_id (standalone commission)
  IF NEW.policy_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map commission status to override status
  CASE NEW.status
    WHEN 'paid' THEN
      v_new_override_status := 'earned';
    WHEN 'charged_back' THEN
      v_new_override_status := 'chargedback';
    WHEN 'cancelled' THEN
      v_new_override_status := 'cancelled';
    WHEN 'clawback' THEN
      v_new_override_status := 'chargedback';
    WHEN 'pending' THEN
      v_new_override_status := 'pending';
    WHEN 'earned' THEN
      -- Commission is earned but not paid yet - override stays pending
      v_new_override_status := 'pending';
    ELSE
      -- Unknown status, don't update overrides
      RETURN NEW;
  END CASE;

  -- Update all override_commissions for this policy where base_agent matches
  UPDATE override_commissions
  SET
    status = v_new_override_status,
    updated_at = NOW()
  WHERE policy_id = NEW.policy_id
    AND base_agent_id = NEW.user_id
    AND status != v_new_override_status;  -- Only update if status is different

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 THEN
    RAISE NOTICE 'Updated % override_commissions for policy % to status %',
      v_updated_count, NEW.policy_id, v_new_override_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_override_commission_status() IS
'Syncs override_commissions status when base commission status changes.
Maps commission status to override status:
- paid -> earned (upline can count this income)
- charged_back/clawback -> chargedback
- cancelled -> cancelled
- pending/earned -> pending (not yet countable for upline)';

-- ============================================================================
-- PART 2: Create the trigger on commissions table
-- ============================================================================

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS trigger_sync_override_status ON commissions;

-- Create the trigger
CREATE TRIGGER trigger_sync_override_status
  AFTER UPDATE OF status ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION sync_override_commission_status();

COMMENT ON TRIGGER trigger_sync_override_status ON commissions IS
'Syncs override_commissions status when a commission status changes.
Ensures uplines only see override earnings when base commission is paid.';

-- ============================================================================
-- PART 3: Backfill existing override_commissions based on current commission status
-- ============================================================================

-- Update existing override_commissions to match their base commission status
WITH commission_status_map AS (
  SELECT
    c.policy_id,
    c.user_id,
    c.status AS commission_status,
    CASE c.status
      WHEN 'paid' THEN 'earned'
      WHEN 'charged_back' THEN 'chargedback'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'clawback' THEN 'chargedback'
      ELSE 'pending'
    END AS target_override_status
  FROM commissions c
  WHERE c.policy_id IS NOT NULL
)
UPDATE override_commissions oc
SET
  status = csm.target_override_status,
  updated_at = NOW()
FROM commission_status_map csm
WHERE oc.policy_id = csm.policy_id
  AND oc.base_agent_id = csm.user_id
  AND oc.status != csm.target_override_status;

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % override_commissions with synced status', updated_count;
END $$;
