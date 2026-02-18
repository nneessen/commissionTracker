-- Add leaderboard feature to subscription plans
-- Pro and Team: enabled, Free: disabled

UPDATE subscription_plans
SET features = features || '{"leaderboard": true}'::jsonb
WHERE name IN ('pro', 'team');

UPDATE subscription_plans
SET features = features || '{"leaderboard": false}'::jsonb
WHERE name = 'free';

-- Safety net for any other plans
UPDATE subscription_plans
SET features = features || '{"leaderboard": false}'::jsonb
WHERE NOT (features ? 'leaderboard');
