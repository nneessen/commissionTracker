-- supabase/migrations/20260217145520_stripe_live_mode_and_team_uw_wizard.sql
-- Stripe live mode pricing + Team UW Wizard seat management
--
-- Changes:
-- 1. Update subscription_plans with live Stripe IDs and new pricing
-- 2. Update UW Wizard tier_config: drop Agency, update run limits
-- 3. Create team_uw_wizard_seats table
-- 4. Create team_seat_packs table
-- 5. New RPCs: get_team_seat_limit, manage_team_uw_seat
-- 6. Modified RPCs: user_has_uw_wizard_access, get_uw_wizard_usage,
--    can_run_uw_wizard, increment_uw_wizard_usage

-- Drop functions with changed return types before recreating
DROP FUNCTION IF EXISTS get_uw_wizard_usage(UUID);
DROP FUNCTION IF EXISTS can_run_uw_wizard(UUID);

-- ============================================================
-- 1. Update subscription_plans with live Stripe IDs + pricing
-- ============================================================

-- Pro: $25/mo, $275/yr
UPDATE subscription_plans SET
  price_monthly = 2500,
  price_annual = 27500,
  stripe_product_id = 'prod_TztGiwxwxDIG7R',
  stripe_price_id_monthly = 'price_1T1tToRYi2kelWQkF48YJFma',
  stripe_price_id_annual = 'price_1T1tTqRYi2kelWQkSwu6inXX'
WHERE name = 'pro';

-- Team: $250/mo, $2,750/yr
UPDATE subscription_plans SET
  price_monthly = 25000,
  price_annual = 275000,
  stripe_product_id = 'prod_TztGVfejX0GCct',
  stripe_price_id_monthly = 'price_1T1tTsRYi2kelWQklhoqa29x',
  stripe_price_id_annual = 'price_1T1tTuRYi2kelWQkQg6KEJ2B'
WHERE name = 'team';

-- Deactivate old Starter plan
UPDATE subscription_plans SET is_active = false WHERE name = 'starter';

-- ============================================================
-- 2. Update UW Wizard addon: drop Agency, update run limits
-- ============================================================

UPDATE subscription_addons SET
  tier_config = jsonb_build_object('tiers', jsonb_build_array(
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
  ))
WHERE name = 'uw_wizard';

-- ============================================================
-- 3. Create team_uw_wizard_seats table
-- ============================================================

CREATE TABLE IF NOT EXISTS team_uw_wizard_seats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  runs_limit INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_owner_id, agent_id),
  UNIQUE(agent_id) -- an agent can only be seated by one team owner
);

CREATE INDEX IF NOT EXISTS idx_team_uw_seats_owner ON team_uw_wizard_seats(team_owner_id);
CREATE INDEX IF NOT EXISTS idx_team_uw_seats_agent ON team_uw_wizard_seats(agent_id);

ALTER TABLE team_uw_wizard_seats ENABLE ROW LEVEL SECURITY;

-- Team owners can manage their own seats
CREATE POLICY "owners_manage_own_seats" ON team_uw_wizard_seats
  FOR ALL USING (team_owner_id = auth.uid());

-- Agents can view their own seat
CREATE POLICY "agents_view_own_seat" ON team_uw_wizard_seats
  FOR SELECT USING (agent_id = auth.uid());

-- Super admins can manage all
CREATE POLICY "super_admin_manage_all_seats" ON team_uw_wizard_seats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================
-- 4. Create team_seat_packs table
-- ============================================================

CREATE TABLE IF NOT EXISTS team_seat_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'past_due')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_seat_packs_owner ON team_seat_packs(owner_id);

ALTER TABLE team_seat_packs ENABLE ROW LEVEL SECURITY;

-- Owners can view their own packs
CREATE POLICY "owners_view_own_packs" ON team_seat_packs
  FOR SELECT USING (owner_id = auth.uid());

-- Super admins can manage all
CREATE POLICY "super_admin_manage_all_packs" ON team_seat_packs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ============================================================
-- 5. New RPC: get_team_seat_limit
-- ============================================================

CREATE OR REPLACE FUNCTION get_team_seat_limit(p_owner_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_base_seats INTEGER := 5;
  v_extra_seats INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) * 5 INTO v_extra_seats
  FROM team_seat_packs
  WHERE owner_id = p_owner_id AND status = 'active';

  RETURN v_base_seats + v_extra_seats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. New RPC: manage_team_uw_seat
-- ============================================================

CREATE OR REPLACE FUNCTION manage_team_uw_seat(
  p_owner_id UUID,
  p_agent_id UUID,
  p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_owner_plan TEXT;
  v_owner_sub_status TEXT;
  v_seat_limit INTEGER;
  v_current_seats INTEGER;
  v_agent_upline UUID;
  v_agent_hierarchy TEXT;
BEGIN
  -- Validate action
  IF p_action NOT IN ('grant', 'revoke') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Must be grant or revoke.');
  END IF;

  IF p_action = 'revoke' THEN
    DELETE FROM team_uw_wizard_seats
    WHERE team_owner_id = p_owner_id AND agent_id = p_agent_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Seat not found.');
    END IF;

    RETURN jsonb_build_object('success', true);
  END IF;

  -- Grant logic below

  -- 1. Verify owner has active Team plan
  SELECT sp.name, us.status INTO v_owner_plan, v_owner_sub_status
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_owner_id
    AND us.status IN ('active', 'trialing')
  LIMIT 1;

  IF v_owner_plan IS NULL OR v_owner_plan != 'team' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active Team plan required to manage seats.');
  END IF;

  -- 2. Verify agent is in owner's downline
  SELECT upline_id, hierarchy_path INTO v_agent_upline, v_agent_hierarchy
  FROM user_profiles
  WHERE id = p_agent_id;

  IF v_agent_upline IS NULL AND (v_agent_hierarchy IS NULL OR v_agent_hierarchy NOT LIKE '%' || p_owner_id::TEXT || '%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent must be in your downline.');
  END IF;

  -- Check direct upline or hierarchy path contains owner
  IF v_agent_upline != p_owner_id AND (v_agent_hierarchy IS NULL OR v_agent_hierarchy NOT LIKE '%' || p_owner_id::TEXT || '%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent must be in your downline.');
  END IF;

  -- 3. Check seat limit
  v_seat_limit := get_team_seat_limit(p_owner_id);

  SELECT COUNT(*) INTO v_current_seats
  FROM team_uw_wizard_seats
  WHERE team_owner_id = p_owner_id;

  IF v_current_seats >= v_seat_limit THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Seat limit reached (%s/%s). Purchase additional seat packs to add more agents.', v_current_seats, v_seat_limit));
  END IF;

  -- 4. Insert seat (will fail on unique constraint if agent already seated)
  BEGIN
    INSERT INTO team_uw_wizard_seats (team_owner_id, agent_id, runs_limit)
    VALUES (p_owner_id, p_agent_id, 100);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent is already assigned a UW Wizard seat.');
  END;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. Modified RPC: user_has_uw_wizard_access
-- ============================================================

CREATE OR REPLACE FUNCTION user_has_uw_wizard_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check 1: User is on Team plan (owner gets built-in access)
  IF EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    RETURN true;
  END IF;

  -- Check 2: User is a team seat holder (assigned by a Team plan owner)
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

  -- Check 3: User profile flag (backward compatibility / manual grant by super admin)
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id AND uw_wizard_enabled = true
  ) THEN
    RETURN true;
  END IF;

  -- Check 4: Purchased or manually granted add-on (standalone for Pro users)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Modified RPC: get_uw_wizard_usage
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
BEGIN
  -- Calculate billing period (current month)
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Resolution order for determining tier/limit:
  -- 1. Team owner → 500 runs
  -- 2. Team seat → runs_limit from seat record (default 100)
  -- 3. Standalone addon → tier-based limit

  -- Check 1: Team owner
  IF EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    v_runs_limit := 500;
    v_tier_id := 'team_owner';
    v_source := 'team_owner';

    -- Get current usage
    SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
    FROM uw_wizard_usage u
    WHERE u.user_id = p_user_id AND u.billing_period_start = v_period_start;
    v_runs_used := COALESCE(v_runs_used, 0);

    RETURN QUERY SELECT
      v_runs_used, v_runs_limit,
      GREATEST(0, v_runs_limit - v_runs_used),
      CASE WHEN v_runs_limit > 0
        THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
        ELSE 0 END,
      v_period_start, v_period_end,
      v_tier_id, 'Team Owner'::TEXT, v_source;
    RETURN;
  END IF;

  -- Check 2: Team seat
  DECLARE
    v_seat_limit INTEGER;
  BEGIN
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
      v_source := 'team_seat';

      SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
      FROM uw_wizard_usage u
      WHERE u.user_id = p_user_id AND u.billing_period_start = v_period_start;
      v_runs_used := COALESCE(v_runs_used, 0);

      RETURN QUERY SELECT
        v_runs_used, v_runs_limit,
        GREATEST(0, v_runs_limit - v_runs_used),
        CASE WHEN v_runs_limit > 0
          THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
          ELSE 0 END,
        v_period_start, v_period_end,
        v_tier_id, 'Team Seat'::TEXT, v_source;
      RETURN;
    END IF;
  END;

  -- Check 3: Standalone addon (existing logic)
  v_source := 'addon';

  SELECT usa.tier_id INTO v_tier_id
  FROM user_subscription_addons usa
  JOIN subscription_addons sa ON sa.id = usa.addon_id
  WHERE usa.user_id = p_user_id
    AND sa.name = 'uw_wizard'
    AND usa.status IN ('active', 'manual_grant')
    AND (usa.current_period_end IS NULL OR usa.current_period_end > now())
  LIMIT 1;

  IF v_tier_id IS NULL THEN
    v_tier_id := 'starter';
  END IF;

  SELECT tier_config INTO v_tier_config
  FROM subscription_addons WHERE name = 'uw_wizard';

  SELECT t INTO v_tier
  FROM jsonb_array_elements(v_tier_config->'tiers') t
  WHERE t->>'id' = v_tier_id;

  v_runs_limit := COALESCE((v_tier->>'runs_per_month')::INTEGER, 100);

  SELECT COALESCE(u.runs_used, 0) INTO v_runs_used
  FROM uw_wizard_usage u
  WHERE u.user_id = p_user_id AND u.billing_period_start = v_period_start;
  v_runs_used := COALESCE(v_runs_used, 0);

  RETURN QUERY SELECT
    v_runs_used, v_runs_limit,
    GREATEST(0, v_runs_limit - v_runs_used),
    CASE WHEN v_runs_limit > 0
      THEN ROUND((v_runs_used::NUMERIC / v_runs_limit) * 100, 1)
      ELSE 0 END,
    v_period_start, v_period_end,
    v_tier_id,
    COALESCE(v_tier->>'name', 'Starter'),
    v_source;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Modified RPC: can_run_uw_wizard (adds source passthrough)
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
  SELECT user_has_uw_wizard_access(p_user_id) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'no_subscription'::TEXT,
      0::INTEGER,
      NULL::TEXT,
      'none'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_usage FROM get_uw_wizard_usage(p_user_id);

  IF v_usage.runs_remaining <= 0 THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      'limit_exceeded'::TEXT,
      0::INTEGER,
      v_usage.tier_id::TEXT,
      v_usage.source::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::BOOLEAN,
    'ok'::TEXT,
    v_usage.runs_remaining::INTEGER,
    v_usage.tier_id::TEXT,
    v_usage.source::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. Modified RPC: increment_uw_wizard_usage (team-aware limits)
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
  v_runs_limit INTEGER;
  v_new_runs INTEGER;
  v_tier_id TEXT;
  v_tier_config JSONB;
  v_tier JSONB;
  v_seat_limit INTEGER;
BEGIN
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;

  -- Resolution order for runs_limit:
  -- 1. Team owner → 500
  -- 2. Team seat → runs_limit from seat record
  -- 3. Standalone addon → tier-based

  -- Check 1: Team owner
  IF EXISTS (
    SELECT 1 FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND sp.name = 'team'
      AND us.status IN ('active', 'trialing')
  ) THEN
    v_runs_limit := 500;
  ELSE
    -- Check 2: Team seat
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
    ELSE
      -- Check 3: Standalone addon tier
      SELECT usa.tier_id INTO v_tier_id
      FROM user_subscription_addons usa
      JOIN subscription_addons sa ON sa.id = usa.addon_id
      WHERE usa.user_id = p_user_id
        AND sa.name = 'uw_wizard'
        AND usa.status IN ('active', 'manual_grant')
      LIMIT 1;

      IF v_tier_id IS NULL THEN
        v_tier_id := 'starter';
      END IF;

      SELECT tier_config INTO v_tier_config
      FROM subscription_addons WHERE name = 'uw_wizard';

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
    runs_limit = v_runs_limit,
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

-- End of migration
