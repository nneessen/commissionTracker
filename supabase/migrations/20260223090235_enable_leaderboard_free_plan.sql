-- Enable leaderboard for free plan so all users can access it.
-- Pro and team plans already have leaderboard: true (from 20260217201627).
UPDATE subscription_plans
SET features = features || '{"leaderboard": true}'::jsonb
WHERE name = 'free';
