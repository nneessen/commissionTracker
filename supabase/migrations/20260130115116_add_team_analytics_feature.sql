-- supabase/migrations/20260130115116_add_team_analytics_feature.sql
-- Add team_analytics feature to subscription plans

-- Add team_analytics feature to all plans (default false)
UPDATE subscription_plans
SET features = features || '{"team_analytics": false}'::jsonb
WHERE NOT (features ? 'team_analytics');

-- Enable for Team tier only
UPDATE subscription_plans
SET features = jsonb_set(features, '{team_analytics}', 'true')
WHERE name = 'team';
