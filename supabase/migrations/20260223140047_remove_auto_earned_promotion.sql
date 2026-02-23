-- Migration: Remove automatic pending→earned commission promotion on lifecycle active
--
-- Problem: When a policy's lifecycle_status changed to 'active', two triggers
-- automatically set commission status from 'pending' to 'earned'. But 'earned'
-- was not a selectable option in the UI dropdown (only pending/paid/charged_back),
-- causing the dropdown to render blank. The user expects commission status to stay
-- at 'pending' until manually changed to 'paid'.
--
-- Fix: Remove the pending→earned promotion from both triggers while preserving
-- the cancel/lapse→chargeback logic which remains correct.

-- ============================================================================
-- 1. Fix update_commission_on_policy_status — remove earned promotion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_commission_on_policy_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_chargeback_result JSONB;
BEGIN
  -- When policy lifecycle is cancelled or lapsed, calculate chargeback automatically
  IF NEW.lifecycle_status IN ('cancelled', 'lapsed') AND (OLD.lifecycle_status IS NULL OR OLD.lifecycle_status NOT IN ('cancelled', 'lapsed')) THEN

    -- Call chargeback calculation function
    v_chargeback_result := calculate_chargeback_on_policy_lapse(
      NEW.id,
      CURRENT_DATE
    );

    -- Log the result
    IF (v_chargeback_result->>'success')::BOOLEAN THEN
      RAISE NOTICE 'Chargeback processed for policy %: %',
        NEW.id,
        v_chargeback_result->>'chargeback_reason';
    ELSE
      RAISE WARNING 'Chargeback calculation failed for policy %: %',
        NEW.id,
        v_chargeback_result->>'error';
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 2. Fix update_override_commissions_on_policy_change — remove earned promotion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_override_commissions_on_policy_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only act if policy lifecycle_status changed
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN

    -- Policy lapsed or cancelled → charge back overrides
    IF NEW.lifecycle_status IN ('lapsed', 'cancelled') THEN
      UPDATE override_commissions
      SET
        status = 'charged_back',
        chargeback_amount = unearned_amount,
        chargeback_date = CURRENT_DATE,
        chargeback_reason = 'Policy ' || NEW.lifecycle_status
      WHERE policy_id = NEW.id
        AND status NOT IN ('charged_back', 'cancelled'); -- don't re-charge already charged back

      RAISE NOTICE 'Charged back % override commissions for policy %',
        (SELECT COUNT(*) FROM override_commissions WHERE policy_id = NEW.id), NEW.id;

    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 3. Targeted cleanup for inconsistent override statuses only
-- ============================================================================
--
-- NOTE:
-- We intentionally do NOT mass-update commissions.status = 'earned' here.
-- 'earned' is still a valid state in some flows (e.g. chargeback reversal /
-- policy reinstatement), and a blanket rewrite to 'pending' can corrupt
-- legitimate historical records.
--
-- The UI now renders 'earned' safely, so removing the auto-promotion trigger
-- fixes the root cause for future records without destructive backfills.
--
-- For override_commissions, only revert 'earned' rows that are inconsistent with
-- the current base commission state. If the base commission is not 'paid', the
-- override should not remain 'earned'.

UPDATE override_commissions AS oc
SET
  status = 'pending',
  updated_at = NOW()
FROM commissions AS c
WHERE oc.status = 'earned'
  AND c.policy_id = oc.policy_id
  AND c.user_id = oc.base_agent_id
  AND c.status IS DISTINCT FROM 'paid';
