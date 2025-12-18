-- Migration: 20251218_008_pro_tier_updates.sql
-- Description: Update Pro tier to include SMS and add team size limits
-- Pro tier now includes SMS (was Team only)
-- Pro tier limited to 5 direct downlines (agents + recruits)

-- First add the team_size_limit column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'team_size_limit'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN team_size_limit int;
  END IF;
END $$;

-- Update Pro tier features to include SMS
UPDATE subscription_plans
SET
  features = jsonb_set(
    features::jsonb,
    '{sms}',
    'true'::jsonb
  ),
  team_size_limit = 5,
  updated_at = NOW()
WHERE name = 'pro';

-- Ensure Team tier has no limit (null = unlimited)
UPDATE subscription_plans
SET
  team_size_limit = NULL,
  updated_at = NOW()
WHERE name = 'team';

-- Ensure Starter and Free tiers have no team features (0 = no access to team features)
UPDATE subscription_plans
SET
  team_size_limit = 0,
  updated_at = NOW()
WHERE name IN ('free', 'starter');

-- Add comment explaining the field
COMMENT ON COLUMN subscription_plans.team_size_limit IS
  'Maximum number of direct downlines (agents + recruits) allowed. NULL = unlimited, 0 = no team features access.';

-- Create function to check if user can add more team members
CREATE OR REPLACE FUNCTION check_team_size_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_current_count int;
  v_plan_name text;
  v_can_add boolean;
  v_at_warning boolean;
BEGIN
  -- Get user's team size limit from their subscription plan
  SELECT sp.team_size_limit, sp.name
  INTO v_limit, v_plan_name
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
    AND (us.grandfathered_until IS NULL OR us.grandfathered_until > NOW())
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Default to 0 if no subscription found
  IF v_limit IS NULL THEN
    -- Check if it's Team tier (unlimited)
    IF v_plan_name = 'team' THEN
      v_limit := NULL;
    ELSE
      v_limit := 0;
    END IF;
  END IF;

  -- Count current direct downlines
  SELECT COUNT(*)
  INTO v_current_count
  FROM user_profiles
  WHERE upline_id = p_user_id
    AND approval_status = 'approved';

  -- Determine if user can add more
  IF v_limit IS NULL THEN
    -- Unlimited (Team tier)
    v_can_add := TRUE;
    v_at_warning := FALSE;
  ELSIF v_limit = 0 THEN
    -- No team features
    v_can_add := FALSE;
    v_at_warning := FALSE;
  ELSE
    v_can_add := v_current_count < v_limit;
    v_at_warning := v_current_count >= (v_limit - 1); -- Warn at limit - 1 (e.g., 4 for limit of 5)
  END IF;

  RETURN jsonb_build_object(
    'limit', v_limit,
    'current', v_current_count,
    'remaining', CASE WHEN v_limit IS NULL THEN NULL ELSE GREATEST(0, v_limit - v_current_count) END,
    'can_add', v_can_add,
    'at_warning', v_at_warning,
    'plan_name', COALESCE(v_plan_name, 'Free')
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_team_size_limit(uuid) TO authenticated;
