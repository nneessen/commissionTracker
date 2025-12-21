-- =============================================================================
-- Multi-IMO RLS Policies
-- =============================================================================
-- This migration enables RLS on new tables and adds IMO-scoped policies
-- to enforce tenant isolation across all data.
-- =============================================================================

-- =============================================================================
-- 1. Enable RLS and create policies for imos table
-- =============================================================================
ALTER TABLE imos ENABLE ROW LEVEL SECURITY;

-- Users can view their own IMO
DROP POLICY IF EXISTS "Users can view own IMO" ON imos;
CREATE POLICY "Users can view own IMO"
ON imos FOR SELECT
TO authenticated
USING (id = get_my_imo_id());

-- IMO admins can update their IMO
DROP POLICY IF EXISTS "IMO admins can update own IMO" ON imos;
CREATE POLICY "IMO admins can update own IMO"
ON imos FOR UPDATE
TO authenticated
USING (id = get_my_imo_id() AND is_imo_admin());

-- Super admins can manage all IMOs
DROP POLICY IF EXISTS "Super admins can manage all IMOs" ON imos;
CREATE POLICY "Super admins can manage all IMOs"
ON imos FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_super_admin = true)
);

-- =============================================================================
-- 2. Enable RLS and create policies for agencies table
-- =============================================================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Users can view agencies in their IMO
DROP POLICY IF EXISTS "Users can view agencies in own IMO" ON agencies;
CREATE POLICY "Users can view agencies in own IMO"
ON agencies FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id());

-- IMO admins can manage all agencies in their IMO
DROP POLICY IF EXISTS "IMO admins can manage agencies in own IMO" ON agencies;
CREATE POLICY "IMO admins can manage agencies in own IMO"
ON agencies FOR ALL
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- Agency owners can update their own agency
DROP POLICY IF EXISTS "Agency owners can update own agency" ON agencies;
CREATE POLICY "Agency owners can update own agency"
ON agencies FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- =============================================================================
-- 3. Add IMO-scoped policies to user_profiles
-- =============================================================================
-- Note: Keep existing policies and add IMO-scoped ones

-- IMO admins can view all users in their IMO
DROP POLICY IF EXISTS "IMO admins can view all users in own IMO" ON user_profiles;
CREATE POLICY "IMO admins can view all users in own IMO"
ON user_profiles FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- IMO admins can update users in their IMO
DROP POLICY IF EXISTS "IMO admins can update users in own IMO" ON user_profiles;
CREATE POLICY "IMO admins can update users in own IMO"
ON user_profiles FOR UPDATE
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- =============================================================================
-- 4. Add IMO-scoped policies to carriers
-- =============================================================================
-- Users can view carriers in their IMO (or global carriers where imo_id is NULL)
DROP POLICY IF EXISTS "Users can view carriers in own IMO" ON carriers;
CREATE POLICY "Users can view carriers in own IMO"
ON carriers FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() OR imo_id IS NULL);

-- IMO admins can manage carriers in their IMO
DROP POLICY IF EXISTS "IMO admins can manage carriers in own IMO" ON carriers;
CREATE POLICY "IMO admins can manage carriers in own IMO"
ON carriers FOR ALL
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- =============================================================================
-- 5. Add IMO-scoped policies to products
-- =============================================================================
-- Users can view products in their IMO (or global products where imo_id is NULL)
DROP POLICY IF EXISTS "Users can view products in own IMO" ON products;
CREATE POLICY "Users can view products in own IMO"
ON products FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() OR imo_id IS NULL);

-- IMO admins can manage products in their IMO
DROP POLICY IF EXISTS "IMO admins can manage products in own IMO" ON products;
CREATE POLICY "IMO admins can manage products in own IMO"
ON products FOR ALL
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- =============================================================================
-- 6. Add IMO-scoped policies to comp_guide
-- =============================================================================
-- Users can view comp_guide in their IMO (or global where imo_id is NULL)
DROP POLICY IF EXISTS "Users can view comp_guide in own IMO" ON comp_guide;
CREATE POLICY "Users can view comp_guide in own IMO"
ON comp_guide FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() OR imo_id IS NULL);

-- IMO admins can manage comp_guide in their IMO
DROP POLICY IF EXISTS "IMO admins can manage comp_guide in own IMO" ON comp_guide;
CREATE POLICY "IMO admins can manage comp_guide in own IMO"
ON comp_guide FOR ALL
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- =============================================================================
-- 7. Add IMO-scoped policies to pipeline_templates
-- =============================================================================
-- Users can view pipeline_templates in their IMO (or global where imo_id is NULL)
DROP POLICY IF EXISTS "Users can view pipeline_templates in own IMO" ON pipeline_templates;
CREATE POLICY "Users can view pipeline_templates in own IMO"
ON pipeline_templates FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() OR imo_id IS NULL);

-- IMO admins can manage pipeline_templates in their IMO
DROP POLICY IF EXISTS "IMO admins can manage pipeline_templates in own IMO" ON pipeline_templates;
CREATE POLICY "IMO admins can manage pipeline_templates in own IMO"
ON pipeline_templates FOR ALL
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin());

-- =============================================================================
-- 8. Add IMO admin visibility to policies table
-- =============================================================================
-- IMO admins can view all policies in their IMO
DROP POLICY IF EXISTS "IMO admins can view all policies in own IMO" ON policies;
CREATE POLICY "IMO admins can view all policies in own IMO"
ON policies FOR SELECT
TO authenticated
USING (
  -- Check via denormalized imo_id column for performance
  imo_id = get_my_imo_id() AND is_imo_admin()
);

-- =============================================================================
-- 9. Add IMO admin visibility to commissions table
-- =============================================================================
-- IMO admins can view all commissions in their IMO
DROP POLICY IF EXISTS "IMO admins can view all commissions in own IMO" ON commissions;
CREATE POLICY "IMO admins can view all commissions in own IMO"
ON commissions FOR SELECT
TO authenticated
USING (
  imo_id = get_my_imo_id() AND is_imo_admin()
);

-- =============================================================================
-- 10. Add IMO admin visibility to override_commissions table
-- =============================================================================
-- IMO admins can view all override_commissions in their IMO
DROP POLICY IF EXISTS "IMO admins can view all override_commissions in own IMO" ON override_commissions;
CREATE POLICY "IMO admins can view all override_commissions in own IMO"
ON override_commissions FOR SELECT
TO authenticated
USING (
  imo_id = get_my_imo_id() AND is_imo_admin()
);

-- =============================================================================
-- 11. Verify policies created
-- =============================================================================
DO $$
DECLARE
  imo_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO imo_policy_count
  FROM pg_policies
  WHERE policyname LIKE '%IMO%' OR policyname LIKE '%imo%';

  RAISE NOTICE 'Created % IMO-related policies', imo_policy_count;
END $$;
