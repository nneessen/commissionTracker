-- supabase/migrations/20260106_012_create_subscription_on_user_creation.sql
-- Create subscription records automatically for new users
-- Ensures all new users have Instagram access during temporary free period (until Feb 1, 2026)

-- Create a trigger function that creates a subscription for new user profiles
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_plan_id UUID;
  v_grandfather_date TIMESTAMPTZ;
BEGIN
  -- Get the Team plan ID (Instagram access requires Team tier)
  SELECT id INTO v_team_plan_id
  FROM subscription_plans
  WHERE name = 'team';

  -- If team plan doesn't exist, log warning and continue (don't fail user creation)
  IF v_team_plan_id IS NULL THEN
    RAISE WARNING 'create_default_subscription: Team plan not found, skipping subscription creation for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Grandfathered until Feb 1, 2026 (temporary free access period)
  v_grandfather_date := '2026-02-01 00:00:00+00'::TIMESTAMPTZ;

  -- Only create if subscription doesn't already exist
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    billing_interval,
    current_period_start,
    current_period_end,
    grandfathered_until
  )
  VALUES (
    NEW.id,
    v_team_plan_id,
    'active',
    'monthly',
    now(),
    v_grandfather_date,
    v_grandfather_date
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail user creation - subscription can be added later
    RAISE WARNING 'create_default_subscription: Failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS create_subscription_on_profile_insert ON user_profiles;

-- Create the trigger on user_profiles
-- Fires AFTER INSERT so the user profile is fully created first
CREATE TRIGGER create_subscription_on_profile_insert
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

COMMENT ON FUNCTION create_default_subscription() IS
'Creates a default Team subscription (grandfathered until Feb 1, 2026) for new users.
This ensures all new users have Instagram access during the free access period.
Created 2026-01-06 to fix Instagram OAuth 403 errors for new users.';
