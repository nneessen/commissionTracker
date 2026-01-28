-- supabase/migrations/20260128085225_add_analytics_feature.sql
-- Add analytics feature to subscription plans (separate from dashboard)

-- Update all existing plans to add the analytics feature (default to false)
UPDATE subscription_plans
SET features = features || '{"analytics": false}'::jsonb
WHERE NOT (features ? 'analytics');

-- Add comment explaining the feature
COMMENT ON COLUMN subscription_plans.features IS
'JSONB object containing feature flags. Includes: dashboard, analytics, policies, comp_guide, settings, connect_upline, expenses, targets_basic, targets_full, reports_view, reports_export, email, sms, hierarchy, recruiting, overrides, downline_reports, instagram_messaging, instagram_scheduled_messages, instagram_templates, recruiting_basic, recruiting_custom_pipeline, custom_branding';
