-- Add announcement_features column to subscription_plans
-- Stores curated, ordered list of feature keys to highlight per plan in the announcement dialog
-- Separate from features JSONB (which controls access); this is for marketing display

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS announcement_features text[] NOT NULL DEFAULT '{}';

-- Seed defaults matching current hardcoded announcement dialog values
UPDATE subscription_plans
SET announcement_features = ARRAY['dashboard', 'policies', 'comp_guide', 'settings', 'connect_upline']
WHERE name = 'free';

UPDATE subscription_plans
SET announcement_features = ARRAY['expenses', 'targets_full', 'analytics', 'reports_export', 'email']
WHERE name = 'pro';

UPDATE subscription_plans
SET announcement_features = ARRAY['sms', 'hierarchy', 'team_analytics', 'recruiting', 'overrides', 'instagram_messaging']
WHERE name = 'team';
