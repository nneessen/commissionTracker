-- supabase/migrations/20260103_009_instagram_billing_feature.sql
-- Instagram DM Integration - Add feature flag to Team tier

-- ============================================================================
-- 1. Add instagram_messaging feature to Team tier
-- ============================================================================

UPDATE subscription_plans
SET features = features || '{
  "instagram_messaging": true,
  "instagram_scheduled_messages": true,
  "instagram_templates": true
}'::jsonb,
    updated_at = now()
WHERE name = 'team';

-- ============================================================================
-- 2. Ensure other tiers do NOT have Instagram messaging
-- ============================================================================

UPDATE subscription_plans
SET features = features || '{
  "instagram_messaging": false,
  "instagram_scheduled_messages": false,
  "instagram_templates": false
}'::jsonb,
    updated_at = now()
WHERE name IN ('free', 'starter', 'pro');

-- ============================================================================
-- 3. Add instagram_messages_sent to usage tracking metric check
-- ============================================================================

ALTER TABLE usage_tracking
DROP CONSTRAINT IF EXISTS usage_tracking_metric_check;

ALTER TABLE usage_tracking
ADD CONSTRAINT usage_tracking_metric_check
CHECK (metric IN ('emails_sent', 'sms_sent', 'instagram_messages_sent'));

-- ============================================================================
-- 4. Create helper function to check if user has Instagram access
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_instagram_access(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_feature BOOLEAN;
  v_is_grandfathered BOOLEAN;
BEGIN
  -- Check if user is grandfathered (free access until Feb 1, 2026)
  SELECT (grandfathered_until IS NOT NULL AND grandfathered_until > now())
  INTO v_is_grandfathered
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  IF v_is_grandfathered THEN
    RETURN true;
  END IF;

  -- Check if user's plan has instagram_messaging feature
  SELECT COALESCE(sp.features->>'instagram_messaging', 'false')::boolean
  INTO v_has_feature
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active';

  RETURN COALESCE(v_has_feature, false);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION user_has_instagram_access TO authenticated;

COMMENT ON FUNCTION user_has_instagram_access IS 'Checks if user has access to Instagram messaging feature (Team tier or grandfathered)';

-- ============================================================================
-- 5. Verify the feature was added correctly
-- ============================================================================

DO $$
DECLARE
  v_team_features JSONB;
BEGIN
  SELECT features INTO v_team_features
  FROM subscription_plans
  WHERE name = 'team';

  IF NOT (v_team_features->>'instagram_messaging')::boolean THEN
    RAISE EXCEPTION 'Failed to add instagram_messaging feature to Team tier';
  END IF;

  RAISE NOTICE 'Successfully added Instagram messaging to Team tier';
END $$;
