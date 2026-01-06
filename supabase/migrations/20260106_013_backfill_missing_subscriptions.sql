-- supabase/migrations/20260106_013_backfill_missing_subscriptions.sql
-- Backfill subscription records for existing users who don't have one
-- This ensures all existing users can access Instagram during the free period

DO $$
DECLARE
  v_team_plan_id UUID;
  v_grandfather_date TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  -- Get the Team plan ID
  SELECT id INTO v_team_plan_id
  FROM subscription_plans
  WHERE name = 'team';

  IF v_team_plan_id IS NULL THEN
    RAISE EXCEPTION 'Team plan not found - cannot backfill subscriptions';
  END IF;

  -- Grandfathered until Feb 1, 2026
  v_grandfather_date := '2026-02-01 00:00:00+00'::TIMESTAMPTZ;

  -- Insert subscriptions for all users without one
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    billing_interval,
    current_period_start,
    current_period_end,
    grandfathered_until
  )
  SELECT
    up.id,
    v_team_plan_id,
    'active',
    'monthly',
    now(),
    v_grandfather_date,
    v_grandfather_date
  FROM user_profiles up
  LEFT JOIN user_subscriptions us ON us.user_id = up.id
  WHERE us.id IS NULL
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % subscription records for users without subscriptions', v_count;
END $$;

-- Verify no users are left without subscriptions
DO $$
DECLARE
  v_missing_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_missing_count
  FROM user_profiles up
  LEFT JOIN user_subscriptions us ON us.user_id = up.id
  WHERE us.id IS NULL;

  IF v_missing_count > 0 THEN
    RAISE WARNING 'Still have % users without subscriptions after backfill', v_missing_count;
  ELSE
    RAISE NOTICE 'Success: All users now have subscription records';
  END IF;
END $$;
