-- supabase/migrations/20260127164337_uw_wizard_tiered_usage.sql
-- Add tiered usage tracking for UW Wizard addon

-- ============================================
-- 1. Add tier_config column to subscription_addons
-- ============================================
ALTER TABLE subscription_addons
ADD COLUMN IF NOT EXISTS tier_config JSONB DEFAULT NULL;

COMMENT ON COLUMN subscription_addons.tier_config IS 'Tier configuration for usage-based addons. Structure: { tiers: [{ id, name, runs_per_month, price_monthly, price_annual, lemon_variant_id_monthly, lemon_variant_id_annual }] }';

-- ============================================
-- 2. Add tier_id column to user_subscription_addons
-- ============================================
ALTER TABLE user_subscription_addons
ADD COLUMN IF NOT EXISTS tier_id TEXT DEFAULT 'starter';

COMMENT ON COLUMN user_subscription_addons.tier_id IS 'Selected tier for this addon subscription';

-- ============================================
-- 3. Create uw_wizard_usage table
-- ============================================
CREATE TABLE IF NOT EXISTS uw_wizard_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  runs_used INTEGER NOT NULL DEFAULT 0,
  runs_limit INTEGER NOT NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, billing_period_start)
);

COMMENT ON TABLE uw_wizard_usage IS 'Tracks UW Wizard usage per user per billing period';

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_uw_wizard_usage_user_period
  ON uw_wizard_usage(user_id, billing_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_uw_wizard_usage_imo
  ON uw_wizard_usage(imo_id);

-- ============================================
-- 4. Create uw_wizard_usage_log table (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS uw_wizard_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  session_id UUID,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE uw_wizard_usage_log IS 'Audit log of individual UW Wizard runs for analytics';

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_uw_wizard_usage_log_user
  ON uw_wizard_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uw_wizard_usage_log_imo
  ON uw_wizard_usage_log(imo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uw_wizard_usage_log_created
  ON uw_wizard_usage_log(created_at DESC);

-- ============================================
-- 5. Seed tier configuration for UW Wizard addon
-- ============================================
UPDATE subscription_addons
SET tier_config = '{
  "tiers": [
    {
      "id": "starter",
      "name": "Starter",
      "runs_per_month": 150,
      "price_monthly": 999,
      "price_annual": 9590
    },
    {
      "id": "professional",
      "name": "Professional",
      "runs_per_month": 400,
      "price_monthly": 2499,
      "price_annual": 23990
    },
    {
      "id": "agency",
      "name": "Agency",
      "runs_per_month": 1000,
      "price_monthly": 4999,
      "price_annual": 47990
    }
  ]
}'::JSONB
WHERE name = 'uw_wizard';

-- ============================================
-- 6. Migrate existing users to Professional tier (grandfathered)
-- ============================================
UPDATE user_subscription_addons
SET tier_id = 'professional'
WHERE addon_id IN (SELECT id FROM subscription_addons WHERE name = 'uw_wizard')
  AND status IN ('active', 'manual_grant');

-- ============================================
-- 7. RPC: get_uw_wizard_usage
-- ============================================
CREATE OR REPLACE FUNCTION get_uw_wizard_usage(p_user_id UUID)
RETURNS TABLE (
  runs_used INTEGER,
  runs_limit INTEGER,
  runs_remaining INTEGER,
  usage_percent NUMERIC,
  billing_period_start DATE,
  billing_period_end DATE,
  tier_id TEXT,
  tier_name TEXT
) AS $$
DECLARE
  v_tier_id TEXT;
  v_tier_config JSONB;
  v_tier JSONB;
  v_runs_limit INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_runs_used INTEGER;
BEGIN
  -- Get user's current tier
  SELECT usa.tier_id INTO v_tier_id
  FROM user_subscription_addons usa
  JOIN subscription_addons sa ON sa.id = usa.addon_id
  WHERE usa.user_id = p_user_id
    AND sa.name = 'uw_wizard'
    AND usa.status IN ('active', 'manual_grant')
    AND (usa.current_period_end IS NULL OR usa.current_period_end > now())
  LIMIT 1;

  -- Default to starter if no tier specified
  IF v_tier_id IS NULL THEN
    v_tier_id := 'starter';
  END IF;

  -- Get tier config
  SELECT tier_config INTO v_tier_config
  FROM subscription_addons
  WHERE name = 'uw_wizard';

  -- Find the tier details
  SELECT t INTO v_tier
  FROM jsonb_array_elements(v_tier_config->'tiers') t
  WHERE t->>'id' = v_tier_id;

  -- Get runs limit from tier, default to 150 if not found
  v_runs_limit := COALESCE((v_tier->>'runs_per_month')::INTEGER, 150);

  -- Calculate billing period (current month)
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Get current usage
  SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
  FROM uw_wizard_usage u
  WHERE u.user_id = p_user_id
    AND u.billing_period_start = v_period_start;

  IF v_runs_used IS NULL THEN
    v_runs_used := 0;
  END IF;

  RETURN QUERY SELECT
    v_runs_used as runs_used,
    v_runs_limit as runs_limit,
    GREATEST(0, v_runs_limit - v_runs_used) as runs_remaining,
    CASE
      WHEN v_runs_limit > 0
      THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
      ELSE 0
    END as usage_percent,
    v_period_start as billing_period_start,
    v_period_end as billing_period_end,
    v_tier_id as tier_id,
    COALESCE(v_tier->>'name', 'Starter') as tier_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. RPC: can_run_uw_wizard
-- ============================================
CREATE OR REPLACE FUNCTION can_run_uw_wizard(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  runs_remaining INTEGER,
  tier_id TEXT
) AS $$
DECLARE
  v_usage RECORD;
  v_has_access BOOLEAN;
BEGIN
  -- First check if user has UW Wizard access at all
  SELECT user_has_uw_wizard_access(p_user_id) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN QUERY SELECT
      false::BOOLEAN as allowed,
      'no_subscription'::TEXT as reason,
      0::INTEGER as runs_remaining,
      NULL::TEXT as tier_id;
    RETURN;
  END IF;

  -- Get usage
  SELECT * INTO v_usage FROM get_uw_wizard_usage(p_user_id);

  IF v_usage.runs_remaining <= 0 THEN
    RETURN QUERY SELECT
      false::BOOLEAN as allowed,
      'limit_exceeded'::TEXT as reason,
      0::INTEGER as runs_remaining,
      v_usage.tier_id::TEXT as tier_id;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN as allowed,
    'ok'::TEXT as reason,
    v_usage.runs_remaining::INTEGER as runs_remaining,
    v_usage.tier_id::TEXT as tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. RPC: increment_uw_wizard_usage
-- ============================================
CREATE OR REPLACE FUNCTION increment_uw_wizard_usage(
  p_user_id UUID,
  p_imo_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_runs_used INTEGER,
  runs_remaining INTEGER
) AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_tier_id TEXT;
  v_runs_limit INTEGER;
  v_new_runs INTEGER;
  v_tier_config JSONB;
  v_tier JSONB;
BEGIN
  -- Calculate billing period
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Get user's tier
  SELECT usa.tier_id INTO v_tier_id
  FROM user_subscription_addons usa
  JOIN subscription_addons sa ON sa.id = usa.addon_id
  WHERE usa.user_id = p_user_id
    AND sa.name = 'uw_wizard'
    AND usa.status IN ('active', 'manual_grant')
  LIMIT 1;

  -- Default to starter
  IF v_tier_id IS NULL THEN
    v_tier_id := 'starter';
  END IF;

  -- Get tier config and limit
  SELECT tier_config INTO v_tier_config
  FROM subscription_addons
  WHERE name = 'uw_wizard';

  SELECT t INTO v_tier
  FROM jsonb_array_elements(v_tier_config->'tiers') t
  WHERE t->>'id' = v_tier_id;

  v_runs_limit := COALESCE((v_tier->>'runs_per_month')::INTEGER, 150);

  -- Upsert usage record
  INSERT INTO uw_wizard_usage (
    user_id, imo_id, billing_period_start, billing_period_end,
    runs_used, runs_limit, last_run_at
  )
  VALUES (
    p_user_id, p_imo_id, v_period_start, v_period_end,
    1, v_runs_limit, now()
  )
  ON CONFLICT (user_id, billing_period_start)
  DO UPDATE SET
    runs_used = uw_wizard_usage.runs_used + 1,
    last_run_at = now(),
    updated_at = now()
  RETURNING runs_used INTO v_new_runs;

  -- Log the individual run
  INSERT INTO uw_wizard_usage_log (
    user_id, imo_id, session_id, input_tokens, output_tokens,
    estimated_cost_cents
  )
  VALUES (
    p_user_id, p_imo_id, p_session_id, p_input_tokens, p_output_tokens,
    -- Estimate cost: $3/1M input + $15/1M output, convert to cents
    CASE WHEN p_input_tokens IS NOT NULL AND p_output_tokens IS NOT NULL
      THEN ROUND((p_input_tokens * 0.003 + p_output_tokens * 0.015) / 10)::INTEGER
      ELSE NULL
    END
  );

  RETURN QUERY SELECT
    true as success,
    v_new_runs as new_runs_used,
    GREATEST(0, v_runs_limit - v_new_runs) as runs_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. RLS Policies for uw_wizard_usage
-- ============================================
ALTER TABLE uw_wizard_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON uw_wizard_usage FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all usage
CREATE POLICY "Super admins can view all usage"
  ON uw_wizard_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage usage"
  ON uw_wizard_usage FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 11. RLS Policies for uw_wizard_usage_log
-- ============================================
ALTER TABLE uw_wizard_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own usage logs"
  ON uw_wizard_usage_log FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all logs
CREATE POLICY "Super admins can view all usage logs"
  ON uw_wizard_usage_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert usage logs"
  ON uw_wizard_usage_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 12. Trigger for updated_at on uw_wizard_usage
-- ============================================
CREATE OR REPLACE FUNCTION update_uw_wizard_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_uw_wizard_usage_updated_at ON uw_wizard_usage;
CREATE TRIGGER trigger_uw_wizard_usage_updated_at
  BEFORE UPDATE ON uw_wizard_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_uw_wizard_usage_updated_at();
