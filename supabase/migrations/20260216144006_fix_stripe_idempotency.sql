-- supabase/migrations/20260216144006_fix_stripe_idempotency.sql
-- Fix: Payment idempotency (UNIQUE on stripe_invoice_id) and update record_stripe_payment
-- to use ON CONFLICT (stripe_invoice_id) instead of ON CONFLICT (id) which never fires.

BEGIN;

-- ============================================================================
-- 1. Add UNIQUE constraint on subscription_payments.stripe_invoice_id
-- ============================================================================
-- The existing record_stripe_payment RPC uses ON CONFLICT (id) which never
-- triggers because id is auto-generated. Duplicate invoice.paid webhooks
-- would create duplicate payment records. Fix by adding a unique constraint
-- and updating the RPC to conflict on stripe_invoice_id.
ALTER TABLE subscription_payments
  ADD CONSTRAINT uq_subscription_payments_stripe_invoice_id
  UNIQUE (stripe_invoice_id);

-- ============================================================================
-- 2. Replace record_stripe_payment with fixed ON CONFLICT clause
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
  ON CONFLICT (stripe_invoice_id) DO UPDATE SET
    status = EXCLUDED.status,
    receipt_url = COALESCE(EXCLUDED.receipt_url, subscription_payments.receipt_url),
    invoice_url = COALESCE(EXCLUDED.invoice_url, subscription_payments.invoice_url),
    paid_at = COALESCE(EXCLUDED.paid_at, subscription_payments.paid_at),
    updated_at = now()
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

COMMIT;
