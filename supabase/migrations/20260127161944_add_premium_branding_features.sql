-- supabase/migrations/20260127161944_add_premium_branding_features.sql
-- Add premium subscription feature flags for white-labeling/custom branding
--
-- New features:
--   - recruiting_basic: Generic recruiting pipeline (free tier)
--   - recruiting_custom_pipeline: Full customizable recruiting pipeline (premium)
--   - custom_branding: Custom domain, recruiting link, landing page customization (premium)

-- Update Free tier: basic recruiting only
UPDATE subscription_plans
SET features = features || '{
  "recruiting_basic": true,
  "recruiting_custom_pipeline": false,
  "custom_branding": false
}'::jsonb,
    updated_at = now()
WHERE name = 'free';

-- Update Pro tier: basic recruiting only (admin can adjust)
UPDATE subscription_plans
SET features = features || '{
  "recruiting_basic": true,
  "recruiting_custom_pipeline": false,
  "custom_branding": false
}'::jsonb,
    updated_at = now()
WHERE name = 'pro';

-- Update Team tier: full access to all features
UPDATE subscription_plans
SET features = features || '{
  "recruiting_basic": true,
  "recruiting_custom_pipeline": true,
  "custom_branding": true
}'::jsonb,
    updated_at = now()
WHERE name = 'team';

-- Add comment for documentation
COMMENT ON COLUMN subscription_plans.features IS 'JSONB feature flags including: dashboard, policies, comp_guide, settings, connect_upline, expenses, targets_basic, targets_full, reports_view, reports_export, email, sms, hierarchy, recruiting, overrides, downline_reports, instagram_messaging, recruiting_basic, recruiting_custom_pipeline, custom_branding';
