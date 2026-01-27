-- supabase/migrations/20260127135651_add_subscription_admin_system.sql
-- Add subscription admin system for configurable tier management

-- ============================================
-- 1. Create subscription_addons table
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_annual INTEGER NOT NULL DEFAULT 0,
  lemon_variant_id_monthly TEXT,
  lemon_variant_id_annual TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment
COMMENT ON TABLE subscription_addons IS 'Purchasable add-on products (e.g., UW Wizard)';

-- ============================================
-- 2. Create user_subscription_addons table
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES subscription_addons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'manual_grant', 'expired')),
  granted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  lemon_subscription_id TEXT,
  lemon_order_id TEXT,
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annual', NULL)),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, addon_id)
);

-- Add comment
COMMENT ON TABLE user_subscription_addons IS 'User add-on subscriptions (purchased or manually granted)';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_subscription_addons_user_id ON user_subscription_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_addons_addon_id ON user_subscription_addons(addon_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_addons_status ON user_subscription_addons(status);

-- ============================================
-- 3. Create subscription_plan_changes audit table
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('features', 'pricing', 'analytics', 'metadata', 'limits')),
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment
COMMENT ON TABLE subscription_plan_changes IS 'Audit trail for subscription plan configuration changes';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plan_changes_plan_id ON subscription_plan_changes(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_changes_changed_by ON subscription_plan_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_changes_created_at ON subscription_plan_changes(created_at DESC);

-- ============================================
-- 4. Create RPC function: user_has_uw_wizard_access
-- ============================================
CREATE OR REPLACE FUNCTION user_has_uw_wizard_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check user profile flag (existing behavior for backward compatibility)
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id AND uw_wizard_enabled = true
  ) THEN
    RETURN true;
  END IF;

  -- Check purchased or manually granted add-on
  IF EXISTS (
    SELECT 1 FROM user_subscription_addons usa
    JOIN subscription_addons sa ON sa.id = usa.addon_id
    WHERE usa.user_id = p_user_id
      AND sa.name = 'uw_wizard'
      AND usa.status IN ('active', 'manual_grant')
      AND (usa.current_period_end IS NULL OR usa.current_period_end > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Create RPC function: get_user_addons
-- ============================================
CREATE OR REPLACE FUNCTION get_user_addons(p_user_id UUID)
RETURNS TABLE (
  addon_id UUID,
  addon_name TEXT,
  addon_display_name TEXT,
  status TEXT,
  billing_interval TEXT,
  current_period_end TIMESTAMPTZ,
  granted_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.id as addon_id,
    sa.name as addon_name,
    sa.display_name as addon_display_name,
    usa.status,
    usa.billing_interval,
    usa.current_period_end,
    usa.granted_by
  FROM user_subscription_addons usa
  JOIN subscription_addons sa ON sa.id = usa.addon_id
  WHERE usa.user_id = p_user_id
    AND usa.status IN ('active', 'manual_grant')
    AND (usa.current_period_end IS NULL OR usa.current_period_end > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Create trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_subscription_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscription_addons_updated_at
  BEFORE UPDATE ON subscription_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_addons_updated_at();

CREATE TRIGGER trigger_user_subscription_addons_updated_at
  BEFORE UPDATE ON user_subscription_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_addons_updated_at();

-- ============================================
-- 7. RLS Policies for subscription_addons
-- ============================================
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active add-ons
CREATE POLICY "Anyone can view active addons"
  ON subscription_addons FOR SELECT
  USING (is_active = true);

-- Only super admins can insert/update/delete
CREATE POLICY "Super admins can manage addons"
  ON subscription_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================
-- 8. RLS Policies for user_subscription_addons
-- ============================================
ALTER TABLE user_subscription_addons ENABLE ROW LEVEL SECURITY;

-- Users can view their own add-ons
CREATE POLICY "Users can view own addons"
  ON user_subscription_addons FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all add-ons
CREATE POLICY "Super admins can view all user addons"
  ON user_subscription_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Super admins can manage user add-ons
CREATE POLICY "Super admins can manage user addons"
  ON user_subscription_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Service role can manage (for webhooks)
CREATE POLICY "Service role can manage user addons"
  ON user_subscription_addons FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 9. RLS Policies for subscription_plan_changes
-- ============================================
ALTER TABLE subscription_plan_changes ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and create audit entries
CREATE POLICY "Super admins can view plan changes"
  ON subscription_plan_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "Super admins can create plan changes"
  ON subscription_plan_changes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================
-- 10. Seed UW Wizard add-on
-- ============================================
INSERT INTO subscription_addons (name, display_name, description, price_monthly, price_annual, sort_order)
VALUES (
  'uw_wizard',
  'UW Wizard',
  'Advanced underwriting analysis with AI-powered carrier recommendations and health class predictions.',
  2900,  -- $29/month
  29000, -- $290/year (2 months free)
  1
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 11. Migrate existing UW Wizard users to add-on system
-- ============================================
-- Users who have uw_wizard_enabled = true get a manual_grant entry
INSERT INTO user_subscription_addons (user_id, addon_id, status, granted_by)
SELECT
  up.id as user_id,
  sa.id as addon_id,
  'manual_grant' as status,
  NULL as granted_by
FROM user_profiles up
CROSS JOIN subscription_addons sa
WHERE up.uw_wizard_enabled = true
  AND sa.name = 'uw_wizard'
ON CONFLICT (user_id, addon_id) DO NOTHING;

-- ============================================
-- 12. Update subscription_plans RLS for admin updates
-- ============================================
-- Allow super admins to update subscription plans
DROP POLICY IF EXISTS "Super admins can update plans" ON subscription_plans;

CREATE POLICY "Super admins can update plans"
  ON subscription_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
