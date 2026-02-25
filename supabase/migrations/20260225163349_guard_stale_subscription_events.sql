-- Migration: Guard against out-of-order Stripe subscription events
--
-- Problem: When a subscription is deleted (customer.subscription.deleted), the
-- deleted handler correctly downgrades the user to the free plan by clearing
-- stripe_subscription_id and setting cancelled_at. However, delayed
-- customer.subscription.created/updated events can arrive AFTER the deleted
-- event and overwrite the free plan back to a paid plan via the UPSERT in
-- process_stripe_subscription_event.
--
-- Fix: Before the UPSERT, check if the user was already downgraded (their
-- current row has stripe_subscription_id = NULL and cancelled_at IS NOT NULL)
-- AND a customer.subscription.deleted event already exists in the audit log.
-- If both conditions are true, skip the UPSERT and log the event as skipped.

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
  v_current_sub RECORD;
  v_has_deleted_event BOOLEAN := FALSE;
BEGIN
  -- Check idempotency - return existing event if already processed
  SELECT id INTO v_event_id
  FROM subscription_events
  WHERE stripe_event_id = p_stripe_event_id;

  IF v_event_id IS NOT NULL THEN
    RETURN v_event_id;
  END IF;

  -- Guard: skip UPSERT if subscription was already deleted (out-of-order event protection)
  -- Only applies to created/updated/resumed events, not deleted events (which are handled separately)
  IF p_event_name IN ('customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.resumed') THEN
    SELECT stripe_subscription_id, cancelled_at
    INTO v_current_sub
    FROM user_subscriptions
    WHERE user_id = p_user_id;

    IF v_current_sub IS NOT NULL
       AND v_current_sub.stripe_subscription_id IS NULL
       AND v_current_sub.cancelled_at IS NOT NULL THEN
      -- Check if a deleted event exists for this user
      SELECT EXISTS(
        SELECT 1 FROM subscription_events
        WHERE user_id = p_user_id
          AND event_name = 'customer.subscription.deleted'
      ) INTO v_has_deleted_event;

      IF v_has_deleted_event THEN
        -- Log the event as skipped but do NOT perform the UPSERT
        INSERT INTO subscription_events (
          user_id, event_type, event_name, stripe_event_id, event_data, processed_at, error_message
        ) VALUES (
          p_user_id, p_event_type, p_event_name, p_stripe_event_id, p_event_data, now(),
          'Skipped: subscription already deleted for this user (out-of-order event protection)'
        )
        RETURNING id INTO v_event_id;

        RETURN v_event_id;
      END IF;
    END IF;
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

-- Ensure execution is locked to service_role only (re-apply from migration 20260221190053)
REVOKE ALL ON FUNCTION process_stripe_subscription_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_stripe_subscription_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM anon;
REVOKE ALL ON FUNCTION process_stripe_subscription_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION process_stripe_subscription_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO service_role;
