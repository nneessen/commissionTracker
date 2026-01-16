-- Migration: Fix Lead Purchase ROI Trigger
-- Fixes issues with ROI not updating on policy delete:
-- 1. Uses correct column name 'amount' instead of 'advance_amount'
-- 2. Uses BEFORE DELETE to capture commission before cascade delete

-- ============================================================================
-- 1. Replace the ROI update function with fixed version
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_purchase_roi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_amount numeric;
  v_lead_purchase_id uuid;
BEGIN
  -- Handle INSERT: new policy linked to lead_purchase
  IF TG_OP = 'INSERT' AND NEW.lead_purchase_id IS NOT NULL THEN
    v_lead_purchase_id := NEW.lead_purchase_id;

  -- Handle UPDATE: lead_purchase_id changed
  ELSIF TG_OP = 'UPDATE' THEN
    -- If lead_purchase_id was removed or changed, decrement old lead purchase
    IF OLD.lead_purchase_id IS NOT NULL
       AND (NEW.lead_purchase_id IS NULL OR NEW.lead_purchase_id != OLD.lead_purchase_id) THEN
      -- Get commission from old policy link (use 'amount' column)
      SELECT COALESCE(amount, 0) INTO v_commission_amount
      FROM commissions WHERE policy_id = OLD.id
      LIMIT 1;

      UPDATE lead_purchases
      SET policies_sold = GREATEST(0, policies_sold - 1),
          commission_earned = GREATEST(0, commission_earned - COALESCE(v_commission_amount, 0))
      WHERE id = OLD.lead_purchase_id;
    END IF;

    -- If new lead_purchase_id assigned, increment it
    IF NEW.lead_purchase_id IS NOT NULL
       AND (OLD.lead_purchase_id IS NULL OR NEW.lead_purchase_id != OLD.lead_purchase_id) THEN
      v_lead_purchase_id := NEW.lead_purchase_id;
    ELSE
      RETURN NEW;
    END IF;

  -- Handle DELETE: decrement lead purchase if linked
  -- Note: This runs BEFORE DELETE so commissions still exist
  ELSIF TG_OP = 'DELETE' AND OLD.lead_purchase_id IS NOT NULL THEN
    -- Get commission amount (use 'amount' column - fixed from 'advance_amount')
    SELECT COALESCE(amount, 0) INTO v_commission_amount
    FROM commissions WHERE policy_id = OLD.id
    LIMIT 1;

    UPDATE lead_purchases
    SET policies_sold = GREATEST(0, policies_sold - 1),
        commission_earned = GREATEST(0, commission_earned - COALESCE(v_commission_amount, 0))
    WHERE id = OLD.lead_purchase_id;

    RETURN OLD;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Increment the lead purchase for INSERT or UPDATE with new assignment
  IF v_lead_purchase_id IS NOT NULL THEN
    -- Get commission amount for this policy (use 'amount' column - fixed from 'advance_amount')
    SELECT COALESCE(amount, 0) INTO v_commission_amount
    FROM commissions WHERE policy_id = NEW.id
    LIMIT 1;

    UPDATE lead_purchases
    SET policies_sold = policies_sold + 1,
        commission_earned = commission_earned + COALESCE(v_commission_amount, 0)
    WHERE id = v_lead_purchase_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Recreate trigger as BEFORE DELETE (to capture commission before cascade)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_lead_purchase_roi ON policies;

-- Create BEFORE trigger for DELETE (to capture commission before cascade delete)
-- and AFTER trigger for INSERT/UPDATE (standard behavior)
CREATE TRIGGER trigger_update_lead_purchase_roi_before_delete
  BEFORE DELETE ON policies
  FOR EACH ROW
  WHEN (OLD.lead_purchase_id IS NOT NULL)
  EXECUTE FUNCTION update_lead_purchase_roi();

CREATE TRIGGER trigger_update_lead_purchase_roi_after_insert_update
  AFTER INSERT OR UPDATE OF lead_purchase_id ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_purchase_roi();

-- ============================================================================
-- 3. Add function to recalculate ROI for a lead purchase (utility)
-- Can be called manually to fix inconsistencies
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_lead_purchase_roi(p_lead_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policies_sold integer;
  v_commission_earned numeric;
BEGIN
  -- Count policies and sum commissions for this lead purchase
  SELECT
    COUNT(p.id),
    COALESCE(SUM(c.amount), 0)
  INTO v_policies_sold, v_commission_earned
  FROM policies p
  LEFT JOIN commissions c ON c.policy_id = p.id
  WHERE p.lead_purchase_id = p_lead_purchase_id;

  -- Update the lead purchase
  UPDATE lead_purchases
  SET
    policies_sold = COALESCE(v_policies_sold, 0),
    commission_earned = COALESCE(v_commission_earned, 0)
  WHERE id = p_lead_purchase_id;
END;
$$;

COMMENT ON FUNCTION recalculate_lead_purchase_roi(uuid) IS
  'Recalculates ROI fields for a lead purchase from linked policies. Use to fix inconsistencies.';
