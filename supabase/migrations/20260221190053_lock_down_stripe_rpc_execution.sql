-- supabase/migrations/20260221190053_lock_down_stripe_rpc_execution.sql
-- SECURITY: Restrict Stripe privileged RPCs to service_role only.
-- Revoke broad execute grants, add runtime auth guard, harden search_path.

BEGIN;

-- ============================================================================
-- 1. REVOKE from PUBLIC / anon / authenticated
-- ============================================================================
REVOKE EXECUTE ON FUNCTION get_plan_by_stripe_price(TEXT)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION process_stripe_subscription_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION record_stripe_payment(
  UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 2. GRANT to service_role only
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_plan_by_stripe_price(TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION process_stripe_subscription_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) TO service_role;

GRANT EXECUTE ON FUNCTION record_stripe_payment(
  UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

-- ============================================================================
-- 3. Re-create functions with hardened search_path + runtime auth guard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_by_stripe_price(p_price_id TEXT)
RETURNS subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_plan subscription_plans;
BEGIN
  -- Runtime auth guard (defense-in-depth; privilege REVOKE is primary barrier)
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;

  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE stripe_price_id_monthly = p_price_id
     OR stripe_price_id_annual = p_price_id
  LIMIT 1;

  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION process_stripe_subscription_event(
  p_event_type TEXT,
  p_event_name TEXT,
  p_stripe_event_id TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_checkout_session_id TEXT,
  p_stripe_price_id TEXT,
  p_user_id UUID,
  p_status TEXT,
  p_billing_interval TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_trial_ends_at TIMESTAMPTZ,
  p_cancelled_at TIMESTAMPTZ,
  p_event_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_subscription_id UUID;
  v_plan subscription_plans;
  v_event_id UUID;
BEGIN
  -- Runtime auth guard
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;

  -- Check idempotency - return existing event if already processed
  SELECT id INTO v_event_id
  FROM subscription_events
  WHERE stripe_event_id = p_stripe_event_id;

  IF v_event_id IS NOT NULL THEN
    RETURN v_event_id;
  END IF;

  -- Get the plan from price ID
  IF p_stripe_price_id IS NOT NULL THEN
    SELECT * INTO v_plan
    FROM subscription_plans
    WHERE stripe_price_id_monthly = p_stripe_price_id
       OR stripe_price_id_annual = p_stripe_price_id
    LIMIT 1;
  END IF;

  IF v_plan IS NULL AND p_stripe_price_id IS NOT NULL THEN
    -- Log event with error
    INSERT INTO subscription_events (
      user_id, event_type, event_name, stripe_event_id, event_data, error_message
    ) VALUES (
      p_user_id, p_event_type, p_event_name, p_stripe_event_id, p_event_data,
      'Plan not found for Stripe price: ' || p_stripe_price_id
    )
    RETURNING id INTO v_event_id;
    RETURN v_event_id;
  END IF;

  -- Upsert subscription
  INSERT INTO user_subscriptions (
    user_id, plan_id, status, billing_interval,
    stripe_subscription_id, stripe_customer_id, stripe_checkout_session_id,
    current_period_start, current_period_end, trial_ends_at,
    cancelled_at, cancel_at_period_end
  ) VALUES (
    p_user_id,
    COALESCE(v_plan.id, (SELECT plan_id FROM user_subscriptions WHERE user_id = p_user_id)),
    p_status, p_billing_interval,
    p_stripe_subscription_id, p_stripe_customer_id, p_stripe_checkout_session_id,
    p_current_period_start, p_current_period_end, p_trial_ends_at,
    p_cancelled_at,
    CASE WHEN p_cancelled_at IS NOT NULL THEN true ELSE false END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id                    = COALESCE(EXCLUDED.plan_id, user_subscriptions.plan_id),
    status                     = EXCLUDED.status,
    billing_interval           = EXCLUDED.billing_interval,
    stripe_subscription_id     = EXCLUDED.stripe_subscription_id,
    stripe_customer_id         = EXCLUDED.stripe_customer_id,
    stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, user_subscriptions.stripe_checkout_session_id),
    current_period_start       = EXCLUDED.current_period_start,
    current_period_end         = EXCLUDED.current_period_end,
    trial_ends_at              = EXCLUDED.trial_ends_at,
    cancelled_at               = EXCLUDED.cancelled_at,
    cancel_at_period_end       = EXCLUDED.cancel_at_period_end,
    grandfathered_until        = CASE
      WHEN EXCLUDED.status = 'active' AND EXCLUDED.stripe_subscription_id IS NOT NULL
      THEN NULL
      ELSE user_subscriptions.grandfathered_until
    END,
    updated_at                 = now()
  RETURNING id INTO v_subscription_id;

  -- Log the event
  INSERT INTO subscription_events (
    user_id, subscription_id, event_type, event_name, stripe_event_id, event_data, processed_at
  ) VALUES (
    p_user_id, v_subscription_id, p_event_type, p_event_name,
    p_stripe_event_id, p_event_data, now()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION record_stripe_payment(
  p_user_id UUID,
  p_stripe_invoice_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_stripe_subscription_id TEXT,
  p_amount INTEGER,
  p_tax_amount INTEGER,
  p_discount_amount INTEGER,
  p_currency TEXT,
  p_status TEXT,
  p_billing_reason TEXT,
  p_receipt_url TEXT,
  p_invoice_url TEXT,
  p_card_brand TEXT,
  p_card_last_four TEXT,
  p_paid_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_payment_id UUID;
  v_subscription_id UUID;
BEGIN
  -- Runtime auth guard
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;

  -- Get subscription ID
  SELECT id INTO v_subscription_id
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND (stripe_subscription_id = p_stripe_subscription_id
      OR stripe_checkout_session_id = p_stripe_payment_intent_id);

  -- Upsert payment (idempotent by stripe_invoice_id)
  INSERT INTO subscription_payments (
    user_id, subscription_id, stripe_invoice_id, stripe_payment_intent_id,
    stripe_subscription_id, amount, tax_amount, discount_amount, currency,
    status, billing_reason, receipt_url, invoice_url, card_brand, card_last_four, paid_at
  ) VALUES (
    p_user_id, v_subscription_id, p_stripe_invoice_id, p_stripe_payment_intent_id,
    p_stripe_subscription_id, p_amount, p_tax_amount, p_discount_amount, p_currency,
    p_status, p_billing_reason, p_receipt_url, p_invoice_url,
    p_card_brand, p_card_last_four, p_paid_at
  )
  ON CONFLICT (stripe_invoice_id) DO UPDATE SET
    status      = EXCLUDED.status,
    receipt_url = COALESCE(EXCLUDED.receipt_url, subscription_payments.receipt_url),
    invoice_url = COALESCE(EXCLUDED.invoice_url, subscription_payments.invoice_url),
    paid_at     = COALESCE(EXCLUDED.paid_at, subscription_payments.paid_at),
    updated_at  = now()
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- ============================================================================
-- 4. Track function versions
-- ============================================================================
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES
  ('get_plan_by_stripe_price',          '20260221190053'),
  ('process_stripe_subscription_event', '20260221190053'),
  ('record_stripe_payment',             '20260221190053')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at      = NOW();

COMMIT;
