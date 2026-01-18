-- supabase/migrations/20260117_004_fix_override_status_sync.sql
-- Fix override status synchronization with commission status
--
-- PROBLEM: Override commissions show $0 in team table even when commissions are paid
-- ROOT CAUSE: The sync trigger only fires on UPDATE, not on initial commission INSERT
--
-- SOLUTION:
-- 1. Backfill existing override_commissions to match their base commission status
-- 2. Ensure the sync trigger handles all status transitions correctly

-- ============================================================================
-- PART 1: Backfill existing override_commissions based on current commission status
-- ============================================================================

-- Update existing override_commissions to match their base commission status
DO $$
DECLARE
  v_updated_count INTEGER := 0;
  v_mismatch_count INTEGER := 0;
BEGIN
  -- First, let's count how many are out of sync
  SELECT COUNT(*) INTO v_mismatch_count
  FROM override_commissions oc
  JOIN commissions c ON c.policy_id = oc.policy_id AND c.user_id = oc.base_agent_id
  WHERE (
    (c.status = 'paid' AND oc.status != 'earned')
    OR (c.status = 'earned' AND oc.status != 'pending')
    OR (c.status IN ('charged_back', 'clawback') AND oc.status != 'chargedback')
    OR (c.status = 'cancelled' AND oc.status != 'cancelled')
    OR (c.status = 'pending' AND oc.status NOT IN ('pending'))
  );

  RAISE NOTICE 'Found % override_commissions out of sync with their base commission status', v_mismatch_count;

  -- Perform the update
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
        ELSE 'pending'  -- pending, earned, advance -> pending for overrides
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

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % override_commissions to sync with commission status', v_updated_count;
END $$;


-- ============================================================================
-- PART 2: Update the sync_override_commission_status function to also handle
-- INSERT cases (in case commission is created with status='paid' directly)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_override_commission_status()
RETURNS TRIGGER AS $$
DECLARE
  v_new_override_status TEXT;
  v_updated_count INTEGER;
BEGIN
  -- For INSERT, check if the new commission has a status that should sync
  -- For UPDATE, check if the status actually changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;
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
    WHEN 'advance' THEN
      -- Advance commissions - override stays pending until paid
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
    RAISE NOTICE 'Synced % override_commissions for policy % to status % (commission % -> %)',
      v_updated_count, NEW.policy_id, v_new_override_status,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE 'N/A (INSERT)' END,
      NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_override_commission_status() IS
'Syncs override_commissions status when base commission status changes.
Now handles both INSERT and UPDATE operations.
Maps commission status to override status:
- paid -> earned (upline can count this income)
- charged_back/clawback -> chargedback
- cancelled -> cancelled
- pending/earned/advance -> pending (not yet countable for upline)';


-- ============================================================================
-- PART 3: Recreate the trigger to handle both INSERT and UPDATE
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_sync_override_status ON commissions;

-- Create combined trigger for INSERT and UPDATE
CREATE TRIGGER trigger_sync_override_status
  AFTER INSERT OR UPDATE OF status ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION sync_override_commission_status();

COMMENT ON TRIGGER trigger_sync_override_status ON commissions IS
'Syncs override_commissions status when a commission is created or status changes.
Now fires on:
1. INSERT - handles commissions created with non-pending status
2. UPDATE OF status - handles commission status changes
Ensures uplines only see override earnings when base commission is paid.';


-- ============================================================================
-- PART 4: Log summary
-- ============================================================================

DO $$
DECLARE
  v_pending_count INTEGER;
  v_earned_count INTEGER;
  v_paid_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'earned'),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*)
  INTO v_pending_count, v_earned_count, v_paid_count, v_total_count
  FROM override_commissions;

  RAISE NOTICE '=== Override Commissions Status Summary ===';
  RAISE NOTICE 'Total: %', v_total_count;
  RAISE NOTICE 'Pending: %', v_pending_count;
  RAISE NOTICE 'Earned: %', v_earned_count;
  RAISE NOTICE 'Paid: %', v_paid_count;
  RAISE NOTICE '==========================================';
END $$;
