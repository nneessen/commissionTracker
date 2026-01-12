-- =============================================================================
-- Super Admin Full Access Policies
-- =============================================================================
-- This migration adds explicit super_admin policies to allow full access
-- across ALL IMOs and agencies, not just the one they're assigned to.
-- =============================================================================

-- =============================================================================
-- Helper function to check if current user is super admin
-- =============================================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

COMMENT ON FUNCTION is_super_admin IS 'Returns true if the current user is a super admin with full system access.';

-- =============================================================================
-- 1. Super admin access to agencies (all agencies across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all agencies" ON agencies;
CREATE POLICY "Super admins can manage all agencies"
ON agencies FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 2. Super admin access to user_profiles (all users across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can view all users" ON user_profiles;
CREATE POLICY "Super admins can view all users"
ON user_profiles FOR SELECT
TO authenticated
USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can update all users" ON user_profiles;
CREATE POLICY "Super admins can update all users"
ON user_profiles FOR UPDATE
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 3. Super admin access to carriers (all carriers across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all carriers" ON carriers;
CREATE POLICY "Super admins can manage all carriers"
ON carriers FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 4. Super admin access to products (all products across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all products" ON products;
CREATE POLICY "Super admins can manage all products"
ON products FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 5. Super admin access to comp_guide (all entries across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all comp_guide" ON comp_guide;
CREATE POLICY "Super admins can manage all comp_guide"
ON comp_guide FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 6. Super admin access to pipeline_templates (all templates across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all pipeline_templates" ON pipeline_templates;
CREATE POLICY "Super admins can manage all pipeline_templates"
ON pipeline_templates FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 7. Super admin access to policies (all policies across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can view all policies" ON policies;
CREATE POLICY "Super admins can view all policies"
ON policies FOR SELECT
TO authenticated
USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can manage all policies" ON policies;
CREATE POLICY "Super admins can manage all policies"
ON policies FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 8. Super admin access to commissions (all commissions across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can view all commissions" ON commissions;
CREATE POLICY "Super admins can view all commissions"
ON commissions FOR SELECT
TO authenticated
USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can manage all commissions" ON commissions;
CREATE POLICY "Super admins can manage all commissions"
ON commissions FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 9. Super admin access to override_commissions (all across all IMOs)
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can view all override_commissions" ON override_commissions;
CREATE POLICY "Super admins can view all override_commissions"
ON override_commissions FOR SELECT
TO authenticated
USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can manage all override_commissions" ON override_commissions;
CREATE POLICY "Super admins can manage all override_commissions"
ON override_commissions FOR ALL
TO authenticated
USING (is_super_admin());

-- =============================================================================
-- 10. Super admin access to storage buckets
-- =============================================================================
-- IMO assets - super admins can manage all
DROP POLICY IF EXISTS "Super admins can manage all imo assets" ON storage.objects;
CREATE POLICY "Super admins can manage all imo assets"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id IN ('imo-assets', 'agency-assets')
  AND is_super_admin()
);

-- =============================================================================
-- Summary
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Super admin policies created for: agencies, user_profiles, carriers, products, comp_guide, pipeline_templates, policies, commissions, override_commissions, storage';
END $$;
