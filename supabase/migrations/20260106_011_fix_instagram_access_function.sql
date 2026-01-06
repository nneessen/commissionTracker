-- supabase/migrations/20260106_011_fix_instagram_access_function.sql
-- Fix: user_has_instagram_access() to handle missing subscription records
-- Previously returned NULL when no subscription existed, now returns FALSE

CREATE OR REPLACE FUNCTION user_has_instagram_access(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_feature BOOLEAN;
  v_is_grandfathered BOOLEAN;
  v_subscription_exists BOOLEAN;
BEGIN
  -- First check if subscription record exists at all
  SELECT EXISTS(
    SELECT 1 FROM user_subscriptions WHERE user_id = p_user_id
  ) INTO v_subscription_exists;

  -- If no subscription record, user doesn't have access
  IF NOT v_subscription_exists THEN
    RETURN false;
  END IF;

  -- Check if user is grandfathered (free access until grandfathered_until date)
  SELECT COALESCE(
    (grandfathered_until IS NOT NULL AND grandfathered_until > now()),
    false
  )
  INTO v_is_grandfathered
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active';

  IF v_is_grandfathered THEN
    RETURN true;
  END IF;

  -- Check if user's plan has instagram_messaging feature
  SELECT COALESCE((sp.features->>'instagram_messaging')::boolean, false)
  INTO v_has_feature
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active';

  RETURN COALESCE(v_has_feature, false);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_has_instagram_access IS
'Checks if user has Instagram messaging access (Team tier or grandfathered).
Fixed 2026-01-06 to properly handle missing subscription records (returns false instead of null).';
