-- supabase/migrations/20251218_005_subscription_tiering_system.sql
-- Subscription Tiering System - Phase 1: Database Foundation
-- Creates subscription_plans, user_subscriptions, usage_tracking tables
-- and adds subscription_tier column to user_profiles

-- ============================================================================
-- 1. CREATE SUBSCRIPTION PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'free', 'starter', 'pro', 'team'
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0, -- cents (0 for free)
  price_annual INTEGER NOT NULL DEFAULT 0, -- cents
  email_limit INTEGER NOT NULL DEFAULT 0, -- monthly email limit (0 = none)
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  features JSONB NOT NULL DEFAULT '{}',
  analytics_sections TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on name for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. CREATE USER SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
  lemon_subscription_id TEXT, -- LemonSqueezy subscription ID (for future integration)
  lemon_customer_id TEXT, -- LemonSqueezy customer ID (for future integration)
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  grandfathered_until TIMESTAMPTZ, -- For existing users who get free Pro access
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemon_id ON user_subscriptions(lemon_subscription_id) WHERE lemon_subscription_id IS NOT NULL;

-- ============================================================================
-- 3. CREATE USAGE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('emails_sent', 'sms_sent')),
  count INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  overage_charged BOOLEAN NOT NULL DEFAULT false,
  overage_amount INTEGER NOT NULL DEFAULT 0, -- cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, metric, period_start)
);

-- Create indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_metric ON usage_tracking(user_id, metric);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start);

-- ============================================================================
-- 4. ADD SUBSCRIPTION_TIER TO USER_PROFILES
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free';
  END IF;
END $$;

-- Create index for tier lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);

-- ============================================================================
-- 5. SEED SUBSCRIPTION PLANS
-- ============================================================================
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_annual, email_limit, sms_enabled, analytics_sections, features, sort_order) VALUES
(
  'free',
  'Free',
  'Get Started - Track your business, connect to your upline',
  0,
  0,
  0, -- No email included
  false,
  ARRAY['pace_metrics', 'policy_status_breakdown'],
  '{
    "dashboard": true,
    "policies": true,
    "comp_guide": true,
    "settings": true,
    "connect_upline": true,
    "expenses": false,
    "targets_basic": false,
    "targets_full": false,
    "reports_view": false,
    "reports_export": false,
    "email": false,
    "sms": false,
    "hierarchy": false,
    "recruiting": false,
    "overrides": false,
    "downline_reports": false
  }'::jsonb,
  0
),
(
  'starter',
  'Starter',
  'Financial Intelligence - Understand your business',
  1000, -- $10
  10000, -- $100 (save $20)
  0, -- No email included
  false,
  ARRAY['pace_metrics', 'policy_status_breakdown', 'product_matrix', 'carriers_products', 'client_segmentation'],
  '{
    "dashboard": true,
    "policies": true,
    "comp_guide": true,
    "settings": true,
    "connect_upline": true,
    "expenses": true,
    "targets_basic": true,
    "targets_full": false,
    "reports_view": true,
    "reports_export": false,
    "email": false,
    "sms": false,
    "hierarchy": false,
    "recruiting": false,
    "overrides": false,
    "downline_reports": false
  }'::jsonb,
  1
),
(
  'pro',
  'Pro',
  'Growth Tools - Communicate and grow',
  2500, -- $25
  25000, -- $250 (save $50)
  200, -- 200 emails/month included
  false,
  ARRAY['pace_metrics', 'policy_status_breakdown', 'product_matrix', 'carriers_products', 'client_segmentation', 'geographic', 'game_plan', 'commission_pipeline', 'future_section'],
  '{
    "dashboard": true,
    "policies": true,
    "comp_guide": true,
    "settings": true,
    "connect_upline": true,
    "expenses": true,
    "targets_basic": true,
    "targets_full": true,
    "reports_view": true,
    "reports_export": true,
    "email": true,
    "sms": false,
    "hierarchy": false,
    "recruiting": false,
    "overrides": false,
    "downline_reports": false
  }'::jsonb,
  2
),
(
  'team',
  'Team',
  'Agency Builder - See and manage your downlines',
  5000, -- $50
  50000, -- $500 (save $100)
  500, -- 500 emails/month included
  true, -- SMS enabled (usage-based at $0.05/ea)
  ARRAY['pace_metrics', 'policy_status_breakdown', 'product_matrix', 'carriers_products', 'client_segmentation', 'geographic', 'game_plan', 'commission_pipeline', 'future_section'],
  '{
    "dashboard": true,
    "policies": true,
    "comp_guide": true,
    "settings": true,
    "connect_upline": true,
    "expenses": true,
    "targets_basic": true,
    "targets_full": true,
    "reports_view": true,
    "reports_export": true,
    "email": true,
    "sms": true,
    "hierarchy": true,
    "recruiting": true,
    "overrides": true,
    "downline_reports": true
  }'::jsonb,
  3
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  email_limit = EXCLUDED.email_limit,
  sms_enabled = EXCLUDED.sms_enabled,
  features = EXCLUDED.features,
  analytics_sections = EXCLUDED.analytics_sections,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================================
-- 6. CREATE UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscription_plans
DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Trigger for user_subscriptions
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Trigger for usage_tracking
DROP TRIGGER IF EXISTS usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- ============================================================================
-- 7. CREATE RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUBSCRIPTION_PLANS RLS
-- Everyone can read active plans (for pricing page)
-- ============================================================================
DROP POLICY IF EXISTS "subscription_plans_select_active" ON subscription_plans;
CREATE POLICY "subscription_plans_select_active" ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all plans
DROP POLICY IF EXISTS "subscription_plans_admin_all" ON subscription_plans;
CREATE POLICY "subscription_plans_admin_all" ON subscription_plans
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
-- USER_SUBSCRIPTIONS RLS
-- Users can read their own subscription
-- ============================================================================
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own subscription (for initial setup)
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_insert_own" ON user_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own subscription (for cancellation, etc.)
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_update_own" ON user_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all subscriptions
DROP POLICY IF EXISTS "user_subscriptions_admin_all" ON user_subscriptions;
CREATE POLICY "user_subscriptions_admin_all" ON user_subscriptions
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
-- USAGE_TRACKING RLS
-- Users can read and update their own usage
-- ============================================================================
DROP POLICY IF EXISTS "usage_tracking_select_own" ON usage_tracking;
CREATE POLICY "usage_tracking_select_own" ON usage_tracking
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "usage_tracking_insert_own" ON usage_tracking;
CREATE POLICY "usage_tracking_insert_own" ON usage_tracking
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "usage_tracking_update_own" ON usage_tracking;
CREATE POLICY "usage_tracking_update_own" ON usage_tracking
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all usage records
DROP POLICY IF EXISTS "usage_tracking_admin_all" ON usage_tracking;
CREATE POLICY "usage_tracking_admin_all" ON usage_tracking
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
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's current subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  -- First check user_subscriptions for active subscription
  SELECT sp.name INTO v_tier
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
    AND (us.current_period_end IS NULL OR us.current_period_end > now());

  -- If no active subscription, check user_profiles.subscription_tier
  IF v_tier IS NULL THEN
    SELECT subscription_tier INTO v_tier
    FROM user_profiles
    WHERE id = p_user_id;
  END IF;

  -- Default to 'free' if nothing found
  RETURN COALESCE(v_tier, 'free');
END;
$$;

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_feature BOOLEAN;
  v_tier TEXT;
BEGIN
  -- Get user's tier
  v_tier := get_user_subscription_tier(p_user_id);

  -- Check if the feature is enabled for this tier
  SELECT (sp.features->>p_feature)::boolean INTO v_has_feature
  FROM subscription_plans sp
  WHERE sp.name = v_tier;

  RETURN COALESCE(v_has_feature, false);
END;
$$;

-- Function to check if user has access to an analytics section
CREATE OR REPLACE FUNCTION user_has_analytics_section(p_user_id UUID, p_section TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_section BOOLEAN;
  v_tier TEXT;
BEGIN
  -- Get user's tier
  v_tier := get_user_subscription_tier(p_user_id);

  -- Check if the section is in the array for this tier
  SELECT p_section = ANY(sp.analytics_sections) INTO v_has_section
  FROM subscription_plans sp
  WHERE sp.name = v_tier;

  RETURN COALESCE(v_has_section, false);
END;
$$;

-- Function to get or create usage tracking for current period
CREATE OR REPLACE FUNCTION get_or_create_usage_tracking(
  p_user_id UUID,
  p_metric TEXT
)
RETURNS usage_tracking
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_usage usage_tracking;
BEGIN
  -- Calculate current month period
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Try to get existing record
  SELECT * INTO v_usage
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND metric = p_metric
    AND period_start = v_period_start;

  -- If not found, create one
  IF v_usage IS NULL THEN
    INSERT INTO usage_tracking (user_id, metric, count, period_start, period_end)
    VALUES (p_user_id, p_metric, 0, v_period_start, v_period_end)
    RETURNING * INTO v_usage;
  END IF;

  RETURN v_usage;
END;
$$;

-- Function to increment usage and return updated count
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
BEGIN
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
-- 9. SYNC TRIGGER: Keep user_profiles.subscription_tier in sync
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles.subscription_tier when subscription changes
  UPDATE user_profiles
  SET subscription_tier = (
    SELECT sp.name
    FROM subscription_plans sp
    WHERE sp.id = NEW.plan_id
  ),
  updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_subscription_tier_on_change ON user_subscriptions;
CREATE TRIGGER sync_subscription_tier_on_change
  AFTER INSERT OR UPDATE OF plan_id ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

-- ============================================================================
-- 10. INITIALIZE EXISTING USERS (Grandfather to Pro for 6 months)
-- ============================================================================
-- Create subscriptions for existing users with Pro tier (grandfathered)
-- This gives existing users Pro access until grandfathered_until expires
DO $$
DECLARE
  v_pro_plan_id UUID;
  v_user RECORD;
  v_grandfather_end TIMESTAMPTZ;
BEGIN
  -- Get the Pro plan ID
  SELECT id INTO v_pro_plan_id FROM subscription_plans WHERE name = 'pro';

  -- Set grandfather period to 6 months from now
  v_grandfather_end := now() + INTERVAL '6 months';

  -- For each existing user without a subscription, create a grandfathered Pro subscription
  FOR v_user IN
    SELECT id FROM user_profiles
    WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
      AND approval_status = 'approved'
  LOOP
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_interval,
      current_period_start,
      current_period_end,
      grandfathered_until
    ) VALUES (
      v_user.id,
      v_pro_plan_id,
      'active',
      'monthly',
      now(),
      v_grandfather_end,
      v_grandfather_end
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Update user_profiles.subscription_tier
    UPDATE user_profiles SET subscription_tier = 'pro' WHERE id = v_user.id;
  END LOOP;
END $$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_analytics_section(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_usage_tracking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, INTEGER) TO authenticated;
