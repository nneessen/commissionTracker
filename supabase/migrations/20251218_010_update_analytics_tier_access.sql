-- supabase/migrations/20251218_010_update_analytics_tier_access.sql
-- Update analytics section access per subscription tier
-- Requirements:
--   Free: 3 sections (pace_metrics, policy_status_breakdown, product_matrix)
--   Starter: 6 sections (Free + carriers_products, geographic, client_segmentation)
--   Pro: 9 sections (all)
--   Team: 9 sections (all)

-- Update Free tier: 3 sections
UPDATE subscription_plans
SET analytics_sections = ARRAY[
  'pace_metrics',
  'policy_status_breakdown',
  'product_matrix'
],
updated_at = NOW()
WHERE name = 'free';

-- Update Starter tier: 6 sections
UPDATE subscription_plans
SET analytics_sections = ARRAY[
  'pace_metrics',
  'policy_status_breakdown',
  'product_matrix',
  'carriers_products',
  'geographic',
  'client_segmentation'
],
updated_at = NOW()
WHERE name = 'starter';

-- Update Pro tier: 9 sections (all)
UPDATE subscription_plans
SET analytics_sections = ARRAY[
  'pace_metrics',
  'policy_status_breakdown',
  'product_matrix',
  'carriers_products',
  'geographic',
  'client_segmentation',
  'game_plan',
  'commission_pipeline',
  'predictive_analytics'
],
updated_at = NOW()
WHERE name = 'pro';

-- Update Team tier: 9 sections (all)
UPDATE subscription_plans
SET analytics_sections = ARRAY[
  'pace_metrics',
  'policy_status_breakdown',
  'product_matrix',
  'carriers_products',
  'geographic',
  'client_segmentation',
  'game_plan',
  'commission_pipeline',
  'predictive_analytics'
],
updated_at = NOW()
WHERE name = 'team';

-- Verify the update
DO $$
DECLARE
  free_count INT;
  starter_count INT;
  pro_count INT;
  team_count INT;
BEGIN
  SELECT array_length(analytics_sections, 1) INTO free_count FROM subscription_plans WHERE name = 'free';
  SELECT array_length(analytics_sections, 1) INTO starter_count FROM subscription_plans WHERE name = 'starter';
  SELECT array_length(analytics_sections, 1) INTO pro_count FROM subscription_plans WHERE name = 'pro';
  SELECT array_length(analytics_sections, 1) INTO team_count FROM subscription_plans WHERE name = 'team';

  RAISE NOTICE 'Analytics sections updated - Free: %, Starter: %, Pro: %, Team: %',
    free_count, starter_count, pro_count, team_count;

  -- Verify counts match requirements
  IF free_count != 3 THEN
    RAISE EXCEPTION 'Free tier should have 3 analytics sections, got %', free_count;
  END IF;
  IF starter_count != 6 THEN
    RAISE EXCEPTION 'Starter tier should have 6 analytics sections, got %', starter_count;
  END IF;
  IF pro_count != 9 THEN
    RAISE EXCEPTION 'Pro tier should have 9 analytics sections, got %', pro_count;
  END IF;
  IF team_count != 9 THEN
    RAISE EXCEPTION 'Team tier should have 9 analytics sections, got %', team_count;
  END IF;
END $$;
