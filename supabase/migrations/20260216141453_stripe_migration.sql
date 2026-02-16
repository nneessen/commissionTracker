-- supabase/migrations/20260216141453_stripe_migration.sql
-- Migration: Replace LemonSqueezy with Stripe
-- Renames all lemon_* columns to stripe_* equivalents, drops old RPC functions,
-- creates new Stripe RPC functions. No active subscribers exist so this is safe.

BEGIN;

-- ============================================================================
-- 1. RENAME COLUMNS: subscription_plans
-- ============================================================================
ALTER TABLE subscription_plans RENAME COLUMN lemon_product_id TO stripe_product_id;
ALTER TABLE subscription_plans RENAME COLUMN lemon_variant_id_monthly TO stripe_price_id_monthly;
ALTER TABLE subscription_plans RENAME COLUMN lemon_variant_id_annual TO stripe_price_id_annual;

-- ============================================================================
-- 2. RENAME COLUMNS: user_subscriptions
-- ============================================================================
ALTER TABLE user_subscriptions RENAME COLUMN lemon_subscription_id TO stripe_subscription_id;
ALTER TABLE user_subscriptions RENAME COLUMN lemon_customer_id TO stripe_customer_id;
ALTER TABLE user_subscriptions RENAME COLUMN lemon_order_id TO stripe_checkout_session_id;

-- ============================================================================
-- 3. RENAME COLUMNS: subscription_payments
-- ============================================================================
ALTER TABLE subscription_payments RENAME COLUMN lemon_invoice_id TO stripe_invoice_id;
ALTER TABLE subscription_payments RENAME COLUMN lemon_order_id TO stripe_payment_intent_id;
ALTER TABLE subscription_payments RENAME COLUMN lemon_subscription_id TO stripe_subscription_id;

-- ============================================================================
-- 4. RENAME COLUMNS: subscription_events
-- ============================================================================
ALTER TABLE subscription_events RENAME COLUMN lemon_event_id TO stripe_event_id;
ALTER TABLE subscription_events RENAME COLUMN lemon_webhook_id TO stripe_webhook_id;

-- ============================================================================
-- 5. RENAME COLUMNS: subscription_addons
-- ============================================================================
ALTER TABLE subscription_addons RENAME COLUMN lemon_variant_id_monthly TO stripe_price_id_monthly;
ALTER TABLE subscription_addons RENAME COLUMN lemon_variant_id_annual TO stripe_price_id_annual;

-- ============================================================================
-- 6. RENAME COLUMNS: user_subscription_addons
-- ============================================================================
ALTER TABLE user_subscription_addons RENAME COLUMN lemon_subscription_id TO stripe_subscription_id;
ALTER TABLE user_subscription_addons RENAME COLUMN lemon_order_id TO stripe_checkout_session_id;

-- ============================================================================
-- 7. DROP OLD INDEXES (if they exist) AND CREATE NEW ONES
-- ============================================================================
DROP INDEX IF EXISTS idx_subscription_plans_lemon_variant_monthly;
DROP INDEX IF EXISTS idx_subscription_plans_lemon_variant_annual;
DROP INDEX IF EXISTS idx_user_subscriptions_lemon_subscription_id;
DROP INDEX IF EXISTS idx_user_subscriptions_lemon_customer_id;
DROP INDEX IF EXISTS idx_user_subscriptions_lemon_order_id;
DROP INDEX IF EXISTS idx_subscription_payments_lemon_invoice_id;
DROP INDEX IF EXISTS idx_subscription_payments_lemon_subscription_id;
DROP INDEX IF EXISTS idx_subscription_events_lemon_event_id;
DROP INDEX IF EXISTS idx_user_subscription_addons_lemon_subscription_id;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_monthly
  ON subscription_plans (stripe_price_id_monthly) WHERE stripe_price_id_monthly IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price_annual
  ON subscription_plans (stripe_price_id_annual) WHERE stripe_price_id_annual IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id
  ON user_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id
  ON user_subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_invoice_id
  ON subscription_payments (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_payments_stripe_subscription_id
  ON subscription_payments (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id
  ON subscription_events (stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- ============================================================================
-- 8. DROP OLD RPC FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS get_plan_by_lemon_variant(TEXT);
DROP FUNCTION IF EXISTS process_lemon_subscription_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB);
DROP FUNCTION IF EXISTS record_lemon_payment(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

-- ============================================================================
-- 9. CREATE NEW RPC: get_plan_by_stripe_price
-- ============================================================================
CREATE OR REPLACE FUNCTION get_plan_by_stripe_price(p_price_id TEXT)
RETURNS subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan subscription_plans;
BEGIN
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE stripe_price_id_monthly = p_price_id
     OR stripe_price_id_annual = p_price_id
  LIMIT 1;

  RETURN v_plan;
END;
$$;

-- ============================================================================
-- 10. CREATE NEW RPC: process_stripe_subscription_event
-- ============================================================================
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
SET search_path = public
AS $$
DECLARE
  v_subscription_id UUID;
  v_plan subscription_plans;
  v_event_id UUID;
BEGIN
  -- Check idempotency - return existing event if already processed
  SELECT id INTO v_event_id
  FROM subscription_events
  WHERE stripe_event_id = p_stripe_event_id;

  IF v_event_id IS NOT NULL THEN
    RETURN v_event_id;
  END IF;

  -- Get the plan from price ID
  IF p_stripe_price_id IS NOT NULL THEN
    v_plan := get_plan_by_stripe_price(p_stripe_price_id);
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
    user_id,
    plan_id,
    status,
    billing_interval,
    stripe_subscription_id,
    stripe_customer_id,
    stripe_checkout_session_id,
    current_period_start,
    current_period_end,
    trial_ends_at,
    cancelled_at,
    cancel_at_period_end
  ) VALUES (
    p_user_id,
    COALESCE(v_plan.id, (SELECT plan_id FROM user_subscriptions WHERE user_id = p_user_id)),
    p_status,
    p_billing_interval,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_stripe_checkout_session_id,
    p_current_period_start,
    p_current_period_end,
    p_trial_ends_at,
    p_cancelled_at,
    CASE WHEN p_cancelled_at IS NOT NULL THEN true ELSE false END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = COALESCE(EXCLUDED.plan_id, user_subscriptions.plan_id),
    status = EXCLUDED.status,
    billing_interval = EXCLUDED.billing_interval,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, user_subscriptions.stripe_checkout_session_id),
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_ends_at = EXCLUDED.trial_ends_at,
    cancelled_at = EXCLUDED.cancelled_at,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    -- Clear grandfathered status when real subscription starts
    grandfathered_until = CASE
      WHEN EXCLUDED.status = 'active' AND EXCLUDED.stripe_subscription_id IS NOT NULL
      THEN NULL
      ELSE user_subscriptions.grandfathered_until
    END,
    updated_at = now()
  RETURNING id INTO v_subscription_id;

  -- Log the event
  INSERT INTO subscription_events (
    user_id, subscription_id, event_type, event_name, stripe_event_id, event_data, processed_at
  ) VALUES (
    p_user_id, v_subscription_id, p_event_type, p_event_name, p_stripe_event_id, p_event_data, now()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- ============================================================================
-- 11. CREATE NEW RPC: record_stripe_payment
-- ============================================================================
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
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_subscription_id UUID;
BEGIN
  -- Get subscription ID
  SELECT id INTO v_subscription_id
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND (stripe_subscription_id = p_stripe_subscription_id
      OR stripe_checkout_session_id = p_stripe_payment_intent_id);

  -- Upsert payment (idempotent by stripe_invoice_id)
  INSERT INTO subscription_payments (
    user_id,
    subscription_id,
    stripe_invoice_id,
    stripe_payment_intent_id,
    stripe_subscription_id,
    amount,
    tax_amount,
    discount_amount,
    currency,
    status,
    billing_reason,
    receipt_url,
    invoice_url,
    card_brand,
    card_last_four,
    paid_at
  ) VALUES (
    p_user_id,
    v_subscription_id,
    p_stripe_invoice_id,
    p_stripe_payment_intent_id,
    p_stripe_subscription_id,
    p_amount,
    p_tax_amount,
    p_discount_amount,
    p_currency,
    p_status,
    p_billing_reason,
    p_receipt_url,
    p_invoice_url,
    p_card_brand,
    p_card_last_four,
    p_paid_at
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    receipt_url = COALESCE(EXCLUDED.receipt_url, subscription_payments.receipt_url),
    invoice_url = COALESCE(EXCLUDED.invoice_url, subscription_payments.invoice_url),
    paid_at = COALESCE(EXCLUDED.paid_at, subscription_payments.paid_at),
    updated_at = now()
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- ============================================================================
-- 12. GRANT EXECUTE PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_plan_by_stripe_price(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_stripe_subscription_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION record_stripe_payment(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

COMMIT;
