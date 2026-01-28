-- supabase/migrations/20260128094641_add_slack_linkedin_messaging_features.sql
-- Add slack and linkedin messaging features to subscription plans

-- Add new messaging features to all existing plans
-- Default to false (off) - admins can enable per plan in Feature Configuration

UPDATE subscription_plans
SET features = features || jsonb_build_object(
  'slack', false,
  'linkedin', false
)
WHERE NOT (features ? 'slack');

-- Log the update
DO $$
DECLARE
  plan_count integer;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM subscription_plans;
  RAISE NOTICE 'Added slack and linkedin features to % subscription plans', plan_count;
END $$;
