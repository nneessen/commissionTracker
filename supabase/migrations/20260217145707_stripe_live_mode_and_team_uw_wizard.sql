-- supabase/migrations/20260217145707_stripe_live_mode_and_team_uw_wizard.sql
-- Stripe Live Mode + Team Plan UW Wizard Redesign
--
-- Changes:
-- 1. Update subscription_plans with live Stripe product/price IDs and new pricing
-- 2. Update subscription_addons UW Wizard tier_config (drop Agency, update run limits, live price IDs)
-- 3. Create team_uw_wizard_seats table
-- 4. Create team_seat_packs table
-- 5. New RPC: get_team_seat_limit
-- 6. New RPC: manage_team_uw_seat
-- 7. Modify user_has_uw_wizard_access to include team checks
-- 8. Modify get_uw_wizard_usage to include team source
-- 9. Modify can_run_uw_wizard to pass through source
-- 10. Modify increment_uw_wizard_usage for team resolution

BEGIN;

-- ============================================================
-- 1. Update subscription_plans with live Stripe IDs + new pricing
-- ============================================================

-- Pro: $25/mo, $275/yr (was $50/mo, $500/yr)
UPDATE subscription_plans SET
  price_monthly = 2500,
  price_annual = 27500,
  stripe_product_id = 'prod_TztGiwxwxDIG7R',
  stripe_price_id_monthly = 'price_1T1tToRYi2kelWQkF48YJFma',
  stripe_price_id_annual = 'price_1T1tTqRYi2kelWQkSwu6inXX',
  updated_at = now()
WHERE name = 'pro';

-- Team: $250/mo, $2,750/yr (was $150/mo, $1,800/yr)
UPDATE subscription_plans SET
  price_monthly = 25000,
  price_annual = 275000,
  stripe_product_id = 'prod_TztGVfejX0GCct',
  stripe_price_id_monthly = 'price_1T1tTsRYi2kelWQklhoqa29x',
  stripe_price_id_annual = 'price_1T1tTuRYi2kelWQkQg6KEJ2B',
  updated_at = now()
WHERE name = 'team';

-- Deactivate old Starter plan (already inactive but ensure)
UPDATE subscription_plans SET
  is_active = false,
  updated_at = now()
WHERE name = 'starter';

-- ============================================================
-- 2. Update UW Wizard addon tier_config
--    - Drop Agency tier
--    - Starter: 150 -> 100 runs, live Stripe price IDs
--    - Professional: 400 -> 500 runs, live Stripe price IDs
-- ============================================================

UPDATE subscription_addons SET
  tier_config = jsonb_build_object(
    'tiers', jsonb_build_array(
      jsonb_build_object(
        'id', 'starter',
        'name', 'Starter',
        'runs_per_month', 100,
        'price_monthly', 999,
        'price_annual', 9590,
        'stripe_price_id_monthly', 'price_1T1tTxRYi2kelWQkxFzyCamT',
        'stripe_price_id_annual', 'price_1T1tTyRYi2kelWQkhcBAuoju'
      ),
      jsonb_build_object(
        'id', 'professional',
        'name', 'Professional',
        'runs_per_month', 500,
        'price_monthly', 2499,
        'price_annual', 23990,
        'stripe_price_id_monthly', 'price_1T1tU0RYi2kelWQkokzSnKng',
        'stripe_price_id_annual', 'price_1T1tU2RYi2kelWQkHQtZ74VU'
      )
    )
  ),
  updated_at = now()
WHERE name = 'uw_wizard';

-- ============================================================
-- 3. Create team_uw_wizard_seats table
-- ============================================================

CREATE TABLE IF NOT EXISTS team_uw_wizard_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  runs_limit INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_owner_id, agent_id),
  UNIQUE(agent_id) -- An agent can only be seated by one owner
);

-- RLS
ALTER TABLE team_uw_wizard_seats ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own seats
CREATE POLICY "team_uw_wizard_seats_owner_select"
  ON team_uw_wizard_seats FOR SELECT
  USING (team_owner_id = auth.uid());

CREATE POLICY "team_uw_wizard_seats_owner_insert"
  ON team_uw_wizard_seats FOR INSERT
  WITH CHECK (team_owner_id = auth.uid());

CREATE POLICY "team_uw_wizard_seats_owner_delete"
  ON team_uw_wizard_seats FOR DELETE
  USING (team_owner_id = auth.uid());

-- Agents can view their own seat
CREATE POLICY "team_uw_wizard_seats_agent_select"
  ON team_uw_wizard_seats FOR SELECT
  USING (agent_id = auth.uid());

-- Super admins have full access
CREATE POLICY "team_uw_wizard_seats_super_admin"
  ON team_uw_wizard_seats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_uw_wizard_seats_owner
  ON team_uw_wizard_seats(team_owner_id);
CREATE INDEX IF NOT EXISTS idx_team_uw_wizard_seats_agent
  ON team_uw_wizard_seats(agent_id);

-- ============================================================
-- 4. Create team_seat_packs table
-- ============================================================

CREATE TABLE IF NOT EXISTS team_seat_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE team_seat_packs ENABLE ROW LEVEL SECURITY;

-- Owners can view their own packs
CREATE POLICY "team_seat_packs_owner_select"
  ON team_seat_packs FOR SELECT
  USING (owner_id = auth.uid());

-- Super admins have full access
CREATE POLICY "team_seat_packs_super_admin"
  ON team_seat_packs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_team_seat_packs_owner
  ON team_seat_packs(owner_id);

-- ============================================================
-- 5. RPC: get_team_seat_limit
--    Returns base 5 + (SUM of active pack quantities * 5)
-- ============================================================

CREATE OR REPLACE FUNCTION get_team_seat_limit(p_owner_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_pack_seats INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO v_pack_seats
  FROM team_seat_packs
  WHERE owner_id = p_owner_id AND status = 'active';

  RETURN 5 + (v_pack_seats * 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 6. RPC: manage_team_uw_seat
--    Actions: 'grant' or 'revoke'
-- ============================================================

CREATE OR REPLACE FUNCTION manage_team_uw_seat(
  p_owner_id UUID,
  p_agent_id UUID,
  p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_seat_count INTEGER;
  v_seat_limit INTEGER;
  v_has_team_plan BOOLEAN;
  v_is_downline BOOLEAN;
BEGIN
  -- Validate action
  IF p_action NOT IN ('grant', 'revoke') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Use grant or revoke.');
  END IF;

  IF p_action = 'grant' THEN
    -- 1. Verify owner has active Team plan
    SELECT EXISTS (
      SELECT 1 FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.user_id = p_owner_id
        AND sp.name = 'team'
        AND us.status IN ('active', 'trialing')
    ) INTO v_has_team_plan;

    IF NOT v_has_team_plan THEN
      RETURN jsonb_build_object('success', false, 'error', 'Active Team plan required.');
    END IF;

    -- 2. Verify agent is in owner's downline via hierarchy_path
    SELECT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = p_agent_id
        AND hierarchy_path LIKE '%' || p_owner_id::TEXT || '%'
        AND id != p_owner_id
    ) INTO v_is_downline;

    IF NOT v_is_downline THEN
      RETURN jsonb_build_object('success', false, 'error', 'Agent is not in your downline.');
    END IF;

    -- 3. Check seat limit
    SELECT COUNT(*) INTO v_seat_count
    FROM team_uw_wizard_seats
    WHERE team_owner_id = p_owner_id;

    SELECT get_team_seat_limit(p_owner_id) INTO v_seat_limit;

    IF v_seat_count >= v_seat_limit THEN
      RETURN jsonb_build_object('success', false, 'error', 'Seat limit reached. Purchase more seat packs to add agents.');
    END IF;

    -- 4. Check if agent is already seated by someone else
    IF EXISTS (
      SELECT 1 FROM team_uw_wizard_seats
      WHERE agent_id = p_agent_id AND team_owner_id != p_owner_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Agent is already assigned a seat by another team owner.');
    END IF;

    -- 5. Insert seat (upsert in case of re-grant)
    INSERT INTO team_uw_wizard_seats (team_owner_id, agent_id, runs_limit)
    VALUES (p_owner_id, p_agent_id, 100)
    ON CONFLICT (team_owner_id, agent_id) DO UPDATE SET
      runs_limit = 100,
      updated_at = now();

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'revoke' THEN
    DELETE FROM team_uw_wizard_seats
    WHERE team_owner_id = p_owner_id AND agent_id = p_agent_id;

    RETURN jsonb_build_object('success', true);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Unknown error.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 7. Modify user_has_uw_wizard_access
--    Add team owner + team seat checks before existing logic
-- ============================================================

CREATE OR REPLACE FUNCTION user_has_uw_wizard_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Team owner: user has active Team plan -> automatic UW Wizard access
  IF EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    RETURN true;
  END IF;

  -- 2. Team seat: user is assigned a seat by a team owner with active Team plan
  IF EXISTS (
    SELECT 1 FROM team_uw_wizard_seats tws
    JOIN user_subscriptions us ON us.user_id = tws.team_owner_id
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE tws.agent_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    RETURN true;
  END IF;

  -- 3. Check user profile flag (existing behavior for backward compatibility)
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id AND uw_wizard_enabled = true
  ) THEN
    RETURN true;
  END IF;

  -- 4. Check purchased or manually granted add-on
  IF EXISTS (
    SELECT 1 FROM user_subscription_addons usa
    JOIN subscription_addons sa ON sa.id = usa.addon_id
    WHERE usa.user_id = p_user_id
      AND sa.name = 'uw_wizard'
      AND usa.status IN ('active', 'manual_grant')
      AND (usa.current_period_end IS NULL OR usa.current_period_end > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 8. Modify get_uw_wizard_usage
--    Add source column and team resolution order
-- ============================================================

CREATE OR REPLACE FUNCTION get_uw_wizard_usage(p_user_id UUID)
RETURNS TABLE (
  runs_used INTEGER,
  runs_limit INTEGER,
  runs_remaining INTEGER,
  usage_percent NUMERIC,
  billing_period_start DATE,
  billing_period_end DATE,
  tier_id TEXT,
  tier_name TEXT,
  source TEXT
) AS $$
DECLARE
  v_tier_id TEXT;
  v_tier_config JSONB;
  v_tier JSONB;
  v_runs_limit INTEGER;
  v_period_start DATE;
  v_period_end DATE;
  v_runs_used INTEGER;
  v_source TEXT;
  v_tier_name TEXT;
  v_seat_limit INTEGER;
BEGIN
  -- Calculate billing period (current month)
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Resolution order:
  -- 1. Team owner (has active Team sub) -> runs_limit=500, source='team_owner'
  IF EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    v_runs_limit := 500;
    v_source := 'team_owner';
    v_tier_id := 'team_owner';
    v_tier_name := 'Team Owner';

    -- Get current usage
    SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
    FROM uw_wizard_usage u
    WHERE u.user_id = p_user_id
      AND u.billing_period_start = v_period_start;

    IF v_runs_used IS NULL THEN v_runs_used := 0; END IF;

    RETURN QUERY SELECT
      v_runs_used as runs_used,
      v_runs_limit as runs_limit,
      GREATEST(0, v_runs_limit - v_runs_used) as runs_remaining,
      CASE WHEN v_runs_limit > 0
        THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
        ELSE 0
      END as usage_percent,
      v_period_start as billing_period_start,
      v_period_end as billing_period_end,
      v_tier_id as tier_id,
      v_tier_name as tier_name,
      v_source as source;
    RETURN;
  END IF;

  -- 2. Team seat (in team_uw_wizard_seats) -> runs_limit from seat, source='team_seat'
  SELECT tws.runs_limit INTO v_seat_limit
  FROM team_uw_wizard_seats tws
  JOIN user_subscriptions us ON us.user_id = tws.team_owner_id
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE tws.agent_id = p_user_id
    AND sp.name = 'team'
    AND us.status IN ('active', 'trialing')
  LIMIT 1;

  IF v_seat_limit IS NOT NULL THEN
    v_runs_limit := v_seat_limit;
    v_source := 'team_seat';
    v_tier_id := 'team_seat';
    v_tier_name := 'Team Seat';

    -- Get current usage
    SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
    FROM uw_wizard_usage u
    WHERE u.user_id = p_user_id
      AND u.billing_period_start = v_period_start;

    IF v_runs_used IS NULL THEN v_runs_used := 0; END IF;

    RETURN QUERY SELECT
      v_runs_used as runs_used,
      v_runs_limit as runs_limit,
      GREATEST(0, v_runs_limit - v_runs_used) as runs_remaining,
      CASE WHEN v_runs_limit > 0
        THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
        ELSE 0
      END as usage_percent,
      v_period_start as billing_period_start,
      v_period_end as billing_period_end,
      v_tier_id as tier_id,
      v_tier_name as tier_name,
      v_source as source;
    RETURN;
  END IF;

  -- 3. Standalone addon -> existing logic, source='addon'
  v_source := 'addon';

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
  SELECT sa.tier_config INTO v_tier_config
  FROM subscription_addons sa
  WHERE sa.name = 'uw_wizard';

  -- Find the tier details
  SELECT t INTO v_tier
  FROM jsonb_array_elements(v_tier_config->'tiers') t
  WHERE t->>'id' = v_tier_id;

  -- Get runs limit from tier, default to 100 if not found
  v_runs_limit := COALESCE((v_tier->>'runs_per_month')::INTEGER, 100);
  v_tier_name := COALESCE(v_tier->>'name', 'Starter');

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
    v_tier_name as tier_name,
    v_source as source;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 9. Modify can_run_uw_wizard
--    Pass through source field from get_uw_wizard_usage
-- ============================================================

CREATE OR REPLACE FUNCTION can_run_uw_wizard(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  runs_remaining INTEGER,
  tier_id TEXT,
  source TEXT
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
      NULL::TEXT as tier_id,
      NULL::TEXT as source;
    RETURN;
  END IF;

  -- Get usage (now includes source)
  SELECT * INTO v_usage FROM get_uw_wizard_usage(p_user_id);

  IF v_usage.runs_remaining <= 0 THEN
    RETURN QUERY SELECT
      false::BOOLEAN as allowed,
      'limit_exceeded'::TEXT as reason,
      0::INTEGER as runs_remaining,
      v_usage.tier_id::TEXT as tier_id,
      v_usage.source::TEXT as source;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN as allowed,
    'ok'::TEXT as reason,
    v_usage.runs_remaining::INTEGER as runs_remaining,
    v_usage.tier_id::TEXT as tier_id,
    v_usage.source::TEXT as source;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 10. Modify increment_uw_wizard_usage
--     Team resolution for determining runs_limit
-- ============================================================

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
  v_seat_limit INTEGER;
BEGIN
  -- Calculate billing period
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Resolution order:
  -- 1. Team owner -> 500 runs
  IF EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    v_runs_limit := 500;
    v_tier_id := 'team_owner';
  ELSE
    -- 2. Team seat -> runs_limit from seat
    SELECT tws.runs_limit INTO v_seat_limit
    FROM team_uw_wizard_seats tws
    JOIN user_subscriptions us ON us.user_id = tws.team_owner_id
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE tws.agent_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
    LIMIT 1;

    IF v_seat_limit IS NOT NULL THEN
      v_runs_limit := v_seat_limit;
      v_tier_id := 'team_seat';
    ELSE
      -- 3. Standalone addon -> existing logic
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
      SELECT sa.tier_config INTO v_tier_config
      FROM subscription_addons sa
      WHERE sa.name = 'uw_wizard';

      SELECT t INTO v_tier
      FROM jsonb_array_elements(v_tier_config->'tiers') t
      WHERE t->>'id' = v_tier_id;

      v_runs_limit := COALESCE((v_tier->>'runs_per_month')::INTEGER, 100);
    END IF;
  END IF;

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
  RETURNING uw_wizard_usage.runs_used INTO v_new_runs;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMIT;
