-- Migration: Lead Source Attribution
-- Adds lead_purchase_id and lead_source_type to policies table
-- Creates auto-ROI trigger to update lead_purchases when policies are linked

-- ============================================================================
-- 1. Create lead_source_type enum
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source_type') THEN
    CREATE TYPE lead_source_type AS ENUM ('lead_purchase', 'free_lead', 'other');
  END IF;
END
$$;

COMMENT ON TYPE lead_source_type IS 'Type of lead source: lead_purchase (from tracked pack), free_lead (hand-me-down), other';

-- ============================================================================
-- 2. Add columns to policies table
-- ============================================================================

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS lead_purchase_id uuid REFERENCES lead_purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_source_type lead_source_type NULL;

COMMENT ON COLUMN policies.lead_purchase_id IS 'Links to lead_purchases for ROI tracking';
COMMENT ON COLUMN policies.lead_source_type IS 'Type of lead source this policy came from';

-- ============================================================================
-- 3. Create indexes for efficient lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_policies_lead_purchase_id
  ON policies(lead_purchase_id)
  WHERE lead_purchase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_policies_lead_source_type
  ON policies(lead_source_type)
  WHERE lead_source_type IS NOT NULL;

-- ============================================================================
-- 4. Auto-ROI update trigger function
-- Updates lead_purchases.policies_sold and commission_earned automatically
-- when policies are linked/unlinked/deleted
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
      -- Get commission from old policy link
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
  ELSIF TG_OP = 'DELETE' AND OLD.lead_purchase_id IS NOT NULL THEN
    SELECT COALESCE(advance_amount, 0) INTO v_commission_amount
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
    -- Get commission amount for this policy
    SELECT COALESCE(advance_amount, 0) INTO v_commission_amount
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
-- 5. Create trigger on policies table
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_lead_purchase_roi ON policies;
CREATE TRIGGER trigger_update_lead_purchase_roi
  AFTER INSERT OR UPDATE OF lead_purchase_id OR DELETE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_purchase_roi();

COMMENT ON FUNCTION update_lead_purchase_roi() IS
  'Auto-updates lead_purchases ROI fields when policies are linked/unlinked';

-- ============================================================================
-- 6. Helper function to update ROI when commission changes
-- This handles cases where commission is created/updated after policy link
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_purchase_roi_on_commission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_purchase_id uuid;
  v_old_amount numeric;
  v_new_amount numeric;
BEGIN
  -- Get the lead_purchase_id for this policy
  SELECT lead_purchase_id INTO v_lead_purchase_id
  FROM policies WHERE id = COALESCE(NEW.policy_id, OLD.policy_id);

  -- If no lead purchase linked, nothing to do
  IF v_lead_purchase_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate amount changes (using 'amount' column)
  v_old_amount := COALESCE(OLD.amount, 0);
  v_new_amount := COALESCE(NEW.amount, 0);

  IF TG_OP = 'INSERT' THEN
    -- New commission added - add to lead purchase
    UPDATE lead_purchases
    SET commission_earned = commission_earned + v_new_amount
    WHERE id = v_lead_purchase_id;

  ELSIF TG_OP = 'UPDATE' AND v_old_amount != v_new_amount THEN
    -- Commission amount changed - adjust the difference
    UPDATE lead_purchases
    SET commission_earned = GREATEST(0, commission_earned - v_old_amount + v_new_amount)
    WHERE id = v_lead_purchase_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Commission removed - subtract from lead purchase
    UPDATE lead_purchases
    SET commission_earned = GREATEST(0, commission_earned - v_old_amount)
    WHERE id = v_lead_purchase_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on commissions table for commission changes
DROP TRIGGER IF EXISTS trigger_update_lead_purchase_roi_commission ON commissions;
CREATE TRIGGER trigger_update_lead_purchase_roi_commission
  AFTER INSERT OR UPDATE OF amount OR DELETE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_purchase_roi_on_commission_change();

COMMENT ON FUNCTION update_lead_purchase_roi_on_commission_change() IS
  'Auto-updates lead_purchases ROI when linked policy commissions change';
