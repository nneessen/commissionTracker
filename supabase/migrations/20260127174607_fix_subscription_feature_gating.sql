-- supabase/migrations/20260127174607_fix_subscription_feature_gating.sql
-- Fix subscription tier feature-gating: Free tier = Policies + Settings ONLY
-- Add missing Instagram feature keys to all tiers

-- 1. Fix Free tier features: ONLY policies + settings enabled
-- This is the canonical definition of what Free tier users can access
UPDATE subscription_plans
SET features = '{
  "dashboard": false,
  "policies": true,
  "comp_guide": false,
  "settings": true,
  "connect_upline": false,
  "expenses": false,
  "targets_basic": false,
  "targets_full": false,
  "reports_view": false,
  "reports_export": false,
  "email": false,
  "sms": false,
  "hierarchy": false,
  "recruiting": false,
  "overrides": false,
  "downline_reports": false,
  "instagram_messaging": false,
  "instagram_scheduled_messages": false,
  "instagram_templates": false,
  "recruiting_basic": false,
  "recruiting_custom_pipeline": false,
  "custom_branding": false
}'::jsonb,
analytics_sections = '{}',
updated_at = now()
WHERE name = 'free';

-- 2. Ensure Pro tier has all feature keys (add missing Instagram features as false)
UPDATE subscription_plans
SET features = features || '{
  "instagram_scheduled_messages": false,
  "instagram_templates": false
}'::jsonb,
updated_at = now()
WHERE name = 'pro'
  AND NOT (features ? 'instagram_scheduled_messages');

-- 3. Ensure Team tier has all feature keys (add missing Instagram features as true)
UPDATE subscription_plans
SET features = features || '{
  "instagram_scheduled_messages": true,
  "instagram_templates": true
}'::jsonb,
updated_at = now()
WHERE name = 'team'
  AND NOT (features ? 'instagram_scheduled_messages');

-- 4. Add comment documenting all feature keys for reference
COMMENT ON COLUMN subscription_plans.features IS
'JSONB with boolean flags for each feature.
Canonical keys (all must be present):
- dashboard: Dashboard access
- policies: Policy management
- comp_guide: Compensation guide
- settings: Settings access
- connect_upline: Connect upline feature
- expenses: Expense tracking
- targets_basic: Basic targets
- targets_full: Full targets & goals
- reports_view: View reports
- reports_export: Export reports
- email: Email messaging
- sms: SMS messaging
- hierarchy: Team hierarchy
- recruiting: Recruiting pipeline
- overrides: Override tracking
- downline_reports: Downline reports
- instagram_messaging: Instagram DM
- instagram_scheduled_messages: Scheduled Instagram messages
- instagram_templates: Instagram message templates
- recruiting_basic: Basic recruiting
- recruiting_custom_pipeline: Custom recruiting pipeline
- custom_branding: Custom branding';
