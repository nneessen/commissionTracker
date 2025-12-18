-- supabase/migrations/20251218_006_lemon_squeezy_integration.sql
-- Lemon Squeezy Payment Integration - Phase 1
-- Adds payment provider columns, payment history, event audit, fixes security issues

-- ============================================================================
-- 1. ADD LEMON SQUEEZY COLUMNS TO SUBSCRIPTION_PLANS
-- ============================================================================
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS lemon_product_id TEXT,
ADD COLUMN IF NOT EXISTS lemon_variant_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS lemon_variant_id_annual TEXT;

-- Index for looking up plans by Lemon variant
CREATE INDEX IF NOT EXISTS idx_subscription_plans_lemon_variant_monthly
  ON subscription_plans(lemon_variant_id_monthly) WHERE lemon_variant_id_monthly IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_lemon_variant_annual
  ON subscription_plans(lemon_variant_id_annual) WHERE lemon_variant_id_annual IS NOT NULL;

-- ============================================================================
-- 2. ADD LEMON_ORDER_ID TO USER_SUBSCRIPTIONS
-- ============================================================================
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS lemon_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemon_order
  ON user_subscriptions(lemon_order_id) WHERE lemon_order_id IS NOT NULL;

-- ============================================================================
-- 3. CREATE SUBSCRIPTION_PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  lemon_invoice_id TEXT,
  lemon_order_id TEXT,
  lemon_subscription_id TEXT,
  amount INTEGER NOT NULL, -- cents
  tax_amount INTEGER NOT NULL DEFAULT 0, -- cents
  discount_amount INTEGER NOT NULL DEFAULT 0, -- cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  billing_reason TEXT CHECK (billing_reason IN ('initial', 'renewal', 'upgrade', 'downgrade', 'overage')),
  receipt_url TEXT,
  invoice_url TEXT,
  card_brand TEXT,
  card_last_four TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount INTEGER, -- cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_lemon_invoice ON subscription_payments(lemon_invoice_id) WHERE lemon_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created ON subscription_payments(created_at DESC);

-- ============================================================================
-- 4. CREATE SUBSCRIPTION_EVENTS AUDIT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_name TEXT, -- Lemon Squeezy event name (e.g., 'subscription_created')
  lemon_event_id TEXT UNIQUE, -- For idempotency
  lemon_webhook_id TEXT,
  event_data JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_lemon_event ON subscription_events(lemon_event_id) WHERE lemon_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);

-- ============================================================================
-- 5. FIX RLS SECURITY - SUBSCRIPTION_PAYMENTS
-- ============================================================================
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "subscription_payments_select_own" ON subscription_payments
  FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can insert/update payments (via webhook)
-- Admins can also manage payments
CREATE POLICY "subscription_payments_admin_all" ON subscription_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- ============================================================================
-- 6. FIX RLS SECURITY - SUBSCRIPTION_EVENTS
-- ============================================================================
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own events
CREATE POLICY "subscription_events_select_own" ON subscription_events
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage all events
CREATE POLICY "subscription_events_admin_all" ON subscription_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- ============================================================================
-- 7. FIX RLS SECURITY - USER_SUBSCRIPTIONS INSERT POLICY
-- Remove dangerous user self-insert capability
-- ============================================================================
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;

-- Only admins can insert subscriptions (webhooks use service role)
CREATE POLICY "user_subscriptions_insert_admin" ON user_subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- ============================================================================
-- 8. FIX SYNC TRIGGER - Handle ALL status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tier based on subscription status
  IF NEW.status IN ('active', 'trialing') THEN
    -- Active subscription - use the plan's tier
    UPDATE user_profiles
    SET subscription_tier = (
      SELECT sp.name FROM subscription_plans sp WHERE sp.id = NEW.plan_id
    ),
    updated_at = now()
    WHERE id = NEW.user_id;
  ELSIF NEW.status IN ('cancelled', 'past_due', 'paused') THEN
    -- Check if grandfathered period still valid
    IF NEW.grandfathered_until IS NOT NULL AND NEW.grandfathered_until > now() THEN
      -- Keep current tier during grandfather period
      NULL;
    ELSE
      -- Inactive subscription = free tier
      UPDATE user_profiles
      SET subscription_tier = 'free',
          updated_at = now()
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update trigger to fire on status changes too
DROP TRIGGER IF EXISTS sync_subscription_tier_on_change ON user_subscriptions;
CREATE TRIGGER sync_subscription_tier_on_change
  AFTER INSERT OR UPDATE OF plan_id, status, grandfathered_until ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

-- ============================================================================
-- 9. FIX INCREMENT_USAGE FUNCTION - Add authorization check
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_metric TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage usage_tracking;
  v_new_count INTEGER;
  v_caller_id UUID;
BEGIN
  -- Get the calling user's ID
  v_caller_id := auth.uid();

  -- Only allow incrementing own usage OR if caller is admin
  IF v_caller_id IS NOT NULL AND p_user_id != v_caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles WHERE id = v_caller_id AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Unauthorized: cannot increment usage for other users';
    END IF;
  END IF;

  -- Get or create the usage record
  v_usage := get_or_create_usage_tracking(p_user_id, p_metric);

  -- Increment the count
  UPDATE usage_tracking
  SET count = count + p_increment,
      updated_at = now()
  WHERE id = v_usage.id
  RETURNING count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- ============================================================================
-- 10. CREATE UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================
DROP TRIGGER IF EXISTS subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- ============================================================================
-- 11. HELPER FUNCTION: Get plan by Lemon variant ID
-- ============================================================================
CREATE OR REPLACE FUNCTION get_plan_by_lemon_variant(p_variant_id TEXT)
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
  WHERE lemon_variant_id_monthly = p_variant_id
     OR lemon_variant_id_annual = p_variant_id
  LIMIT 1;

  RETURN v_plan;
END;
$$;

-- ============================================================================
-- 12. HELPER FUNCTION: Process Lemon Squeezy subscription event
-- ============================================================================
CREATE OR REPLACE FUNCTION process_lemon_subscription_event(
  p_event_type TEXT,
  p_event_name TEXT,
  p_lemon_event_id TEXT,
  p_lemon_subscription_id TEXT,
  p_lemon_customer_id TEXT,
  p_lemon_order_id TEXT,
  p_lemon_variant_id TEXT,
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
  WHERE lemon_event_id = p_lemon_event_id;

  IF v_event_id IS NOT NULL THEN
    RETURN v_event_id;
  END IF;

  -- Get the plan from variant ID
  v_plan := get_plan_by_lemon_variant(p_lemon_variant_id);

  IF v_plan IS NULL THEN
    -- Log event with error
    INSERT INTO subscription_events (
      user_id, event_type, event_name, lemon_event_id, event_data, error_message
    ) VALUES (
      p_user_id, p_event_type, p_event_name, p_lemon_event_id, p_event_data,
      'Plan not found for variant: ' || p_lemon_variant_id
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
    lemon_subscription_id,
    lemon_customer_id,
    lemon_order_id,
    current_period_start,
    current_period_end,
    trial_ends_at,
    cancelled_at,
    cancel_at_period_end
  ) VALUES (
    p_user_id,
    v_plan.id,
    p_status,
    p_billing_interval,
    p_lemon_subscription_id,
    p_lemon_customer_id,
    p_lemon_order_id,
    p_current_period_start,
    p_current_period_end,
    p_trial_ends_at,
    p_cancelled_at,
    CASE WHEN p_cancelled_at IS NOT NULL THEN true ELSE false END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    billing_interval = EXCLUDED.billing_interval,
    lemon_subscription_id = EXCLUDED.lemon_subscription_id,
    lemon_customer_id = EXCLUDED.lemon_customer_id,
    lemon_order_id = COALESCE(EXCLUDED.lemon_order_id, user_subscriptions.lemon_order_id),
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_ends_at = EXCLUDED.trial_ends_at,
    cancelled_at = EXCLUDED.cancelled_at,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    -- Clear grandfathered status when real subscription starts
    grandfathered_until = CASE
      WHEN EXCLUDED.status = 'active' AND EXCLUDED.lemon_subscription_id IS NOT NULL
      THEN NULL
      ELSE user_subscriptions.grandfathered_until
    END,
    updated_at = now()
  RETURNING id INTO v_subscription_id;

  -- Log the event
  INSERT INTO subscription_events (
    user_id, subscription_id, event_type, event_name, lemon_event_id, event_data, processed_at
  ) VALUES (
    p_user_id, v_subscription_id, p_event_type, p_event_name, p_lemon_event_id, p_event_data, now()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- ============================================================================
-- 13. HELPER FUNCTION: Record payment from Lemon Squeezy
-- ============================================================================
CREATE OR REPLACE FUNCTION record_lemon_payment(
  p_user_id UUID,
  p_lemon_invoice_id TEXT,
  p_lemon_order_id TEXT,
  p_lemon_subscription_id TEXT,
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
    AND (lemon_subscription_id = p_lemon_subscription_id OR lemon_order_id = p_lemon_order_id);

  -- Upsert payment (idempotent by lemon_invoice_id)
  INSERT INTO subscription_payments (
    user_id,
    subscription_id,
    lemon_invoice_id,
    lemon_order_id,
    lemon_subscription_id,
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
    p_lemon_invoice_id,
    p_lemon_order_id,
    p_lemon_subscription_id,
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
-- 14. GRANT EXECUTE PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_plan_by_lemon_variant(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_lemon_subscription_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION record_lemon_payment(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- 15. SEED BILLING EMAIL TEMPLATES
-- ============================================================================
INSERT INTO email_templates (name, subject, body_html, body_text, category, is_global, is_active, variables) VALUES
(
  'subscription_welcome',
  'Welcome to {{plan_name}} - Your Subscription is Active',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Welcome to {{plan_name}}!</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Thank you for subscribing to {{plan_name}}. Your subscription is now active and you have access to all the features included in your plan.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">Subscription Details</h2>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Plan:</strong> {{plan_name}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Amount:</strong> {{amount}}/{{billing_interval}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Next Billing Date:</strong> {{next_billing_date}}</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">You can manage your subscription anytime from your account settings.</p>
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">If you have any questions, please reply to this email.</p>
  </div>',
  'Welcome to {{plan_name}}!

Hi {{first_name}},

Thank you for subscribing to {{plan_name}}. Your subscription is now active.

Subscription Details:
- Plan: {{plan_name}}
- Amount: {{amount}}/{{billing_interval}}
- Next Billing Date: {{next_billing_date}}

You can manage your subscription anytime from your account settings.

If you have any questions, please reply to this email.',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'amount', 'billing_interval', 'next_billing_date']
),
(
  'payment_receipt',
  'Payment Receipt - {{amount}} for {{plan_name}}',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Payment Receipt</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">We received your payment of <strong>{{amount}}</strong> for {{plan_name}}.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px 0;">Receipt Details</h2>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Amount:</strong> {{amount}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Date:</strong> {{payment_date}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Payment Method:</strong> {{card_brand}} ending in {{card_last_four}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Invoice #:</strong> {{invoice_id}}</p>
    </div>
    {{#if receipt_url}}
    <p style="margin: 20px 0;"><a href="{{receipt_url}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Full Receipt</a></p>
    {{/if}}
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">Thank you for your business!</p>
  </div>',
  'Payment Receipt

Hi {{first_name}},

We received your payment of {{amount}} for {{plan_name}}.

Receipt Details:
- Amount: {{amount}}
- Date: {{payment_date}}
- Payment Method: {{card_brand}} ending in {{card_last_four}}
- Invoice #: {{invoice_id}}

{{#if receipt_url}}View full receipt: {{receipt_url}}{{/if}}

Thank you for your business!',
  'billing',
  true,
  true,
  ARRAY['first_name', 'amount', 'plan_name', 'payment_date', 'card_brand', 'card_last_four', 'invoice_id', 'receipt_url']
),
(
  'payment_failed',
  'Action Required: Payment Failed for {{plan_name}}',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">Payment Failed</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">We were unable to process your payment of <strong>{{amount}}</strong> for your {{plan_name}} subscription.</p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #991b1b; margin: 0;"><strong>What to do:</strong> Please update your payment method to avoid interruption to your service.</p>
    </div>
    <p style="margin: 20px 0;"><a href="{{update_payment_url}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Update Payment Method</a></p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">We will retry the payment in a few days. If payment continues to fail, your subscription will be paused.</p>
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">Need help? Reply to this email and we''ll assist you.</p>
  </div>',
  'Payment Failed

Hi {{first_name}},

We were unable to process your payment of {{amount}} for your {{plan_name}} subscription.

Please update your payment method to avoid interruption to your service: {{update_payment_url}}

We will retry the payment in a few days. If payment continues to fail, your subscription will be paused.

Need help? Reply to this email.',
  'billing',
  true,
  true,
  ARRAY['first_name', 'amount', 'plan_name', 'update_payment_url']
),
(
  'subscription_cancelled',
  'Your {{plan_name}} Subscription Has Been Cancelled',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Subscription Cancelled</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Your {{plan_name}} subscription has been cancelled as requested.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #3f3f46; margin: 0;"><strong>You still have access until:</strong> {{access_until_date}}</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">After this date, you''ll be moved to the Free plan. Your data will be preserved, but some features will no longer be available.</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Changed your mind? You can resubscribe anytime from your account settings.</p>
    <p style="color: #71717a; font-size: 14px; margin-top: 30px;">We''d love to hear your feedback. Reply to this email to let us know how we can improve.</p>
  </div>',
  'Subscription Cancelled

Hi {{first_name}},

Your {{plan_name}} subscription has been cancelled as requested.

You still have access until: {{access_until_date}}

After this date, you''ll be moved to the Free plan. Your data will be preserved, but some features will no longer be available.

Changed your mind? You can resubscribe anytime from your account settings.

We''d love to hear your feedback.',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'access_until_date']
),
(
  'subscription_renewed',
  'Your {{plan_name}} Subscription Has Been Renewed',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #18181b; font-size: 24px; margin-bottom: 20px;">Subscription Renewed</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Your {{plan_name}} subscription has been successfully renewed.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Amount Charged:</strong> {{amount}}</p>
      <p style="color: #3f3f46; margin: 8px 0;"><strong>Next Renewal:</strong> {{next_billing_date}}</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Thank you for continuing to use our service!</p>
  </div>',
  'Subscription Renewed

Hi {{first_name}},

Your {{plan_name}} subscription has been successfully renewed.

Amount Charged: {{amount}}
Next Renewal: {{next_billing_date}}

Thank you for continuing to use our service!',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'amount', 'next_billing_date']
),
(
  'grandfather_expiring',
  'Your Free {{plan_name}} Access Expires in {{days_remaining}} Days',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 20px;">Your Free Access is Expiring Soon</h1>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Your complimentary {{plan_name}} access will expire in <strong>{{days_remaining}} days</strong>.</p>
    <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #92400e; margin: 0;">After expiration, you''ll move to the Free plan and lose access to features like {{lost_features}}.</p>
    </div>
    <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">Subscribe now to keep all your {{plan_name}} features at just <strong>{{price}}/month</strong>.</p>
    <p style="margin: 20px 0;"><a href="{{subscribe_url}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Subscribe Now</a></p>
  </div>',
  'Your Free Access is Expiring Soon

Hi {{first_name}},

Your complimentary {{plan_name}} access will expire in {{days_remaining}} days.

After expiration, you''ll move to the Free plan and lose access to features like {{lost_features}}.

Subscribe now to keep all your {{plan_name}} features at just {{price}}/month.

Subscribe here: {{subscribe_url}}',
  'billing',
  true,
  true,
  ARRAY['first_name', 'plan_name', 'days_remaining', 'lost_features', 'price', 'subscribe_url']
)
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  category = EXCLUDED.category,
  variables = EXCLUDED.variables,
  updated_at = now();
