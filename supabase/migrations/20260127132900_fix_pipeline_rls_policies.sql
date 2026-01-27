-- supabase/migrations/20260127132900_fix_pipeline_rls_policies.sql
-- Fix pipeline RLS policies to prevent staff from editing agency owners' personal pipelines
-- Staff can only edit pipelines they created, not other users' personal pipelines

-- ============================================================================
-- 1. Drop overly permissive policies on pipeline_templates
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can delete pipeline templates" ON pipeline_templates;
DROP POLICY IF EXISTS "Authenticated users can insert pipeline templates" ON pipeline_templates;
DROP POLICY IF EXISTS "Authenticated users can view pipeline templates" ON pipeline_templates;
DROP POLICY IF EXISTS "Authenticated users can update pipeline templates" ON pipeline_templates;
DROP POLICY IF EXISTS "Users can view pipeline_templates in own IMO" ON pipeline_templates;
DROP POLICY IF EXISTS "IMO admins can manage pipeline_templates in own IMO" ON pipeline_templates;
DROP POLICY IF EXISTS "Super admins can manage all pipeline_templates" ON pipeline_templates;

-- ============================================================================
-- 2. Create proper RLS policies for pipeline_templates
-- ============================================================================

-- SELECT: Super admins can view all
CREATE POLICY "pipeline_templates_super_admin_select"
ON pipeline_templates FOR SELECT
TO authenticated
USING (is_super_admin());

-- SELECT: IMO admins and staff can view their IMO's pipelines
CREATE POLICY "pipeline_templates_imo_select"
ON pipeline_templates FOR SELECT
TO authenticated
USING (
  (is_imo_admin() OR is_imo_staff_role())
  AND (imo_id = get_my_imo_id() OR imo_id IS NULL)
);

-- SELECT: Agency owners can view their IMO's pipelines + their own
-- Note: Using is_agency_owner(NULL::uuid) to disambiguate from overloaded version
CREATE POLICY "pipeline_templates_agency_owner_select"
ON pipeline_templates FOR SELECT
TO authenticated
USING (
  is_agency_owner(NULL::uuid)
  AND (
    imo_id = get_my_imo_id()
    OR imo_id IS NULL
    OR created_by = auth.uid()
  )
);

-- INSERT: Super admins can insert anywhere
CREATE POLICY "pipeline_templates_super_admin_insert"
ON pipeline_templates FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- INSERT: IMO admins can insert for their IMO
CREATE POLICY "pipeline_templates_imo_admin_insert"
ON pipeline_templates FOR INSERT
TO authenticated
WITH CHECK (
  is_imo_admin()
  AND (imo_id = get_my_imo_id() OR imo_id IS NULL)
);

-- INSERT: IMO staff can insert (will be associated with their IMO)
CREATE POLICY "pipeline_templates_imo_staff_insert"
ON pipeline_templates FOR INSERT
TO authenticated
WITH CHECK (
  is_imo_staff_role()
  AND (imo_id = get_my_imo_id() OR imo_id IS NULL)
  AND created_by = auth.uid()
);

-- INSERT: Agency owners can insert their own
CREATE POLICY "pipeline_templates_agency_owner_insert"
ON pipeline_templates FOR INSERT
TO authenticated
WITH CHECK (
  is_agency_owner(NULL::uuid)
  AND created_by = auth.uid()
);

-- UPDATE: Super admins can update all
CREATE POLICY "pipeline_templates_super_admin_update"
ON pipeline_templates FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- UPDATE: IMO admins can update their IMO's pipelines
CREATE POLICY "pipeline_templates_imo_admin_update"
ON pipeline_templates FOR UPDATE
TO authenticated
USING (
  is_imo_admin()
  AND (imo_id = get_my_imo_id() OR imo_id IS NULL)
)
WITH CHECK (
  is_imo_admin()
  AND (imo_id = get_my_imo_id() OR imo_id IS NULL)
);

-- UPDATE: IMO staff can ONLY update pipelines they created
CREATE POLICY "pipeline_templates_imo_staff_update"
ON pipeline_templates FOR UPDATE
TO authenticated
USING (
  is_imo_staff_role()
  AND created_by = auth.uid()
)
WITH CHECK (
  is_imo_staff_role()
  AND created_by = auth.uid()
);

-- UPDATE: Agency owners can ONLY update pipelines they created
CREATE POLICY "pipeline_templates_agency_owner_update"
ON pipeline_templates FOR UPDATE
TO authenticated
USING (
  is_agency_owner(NULL::uuid)
  AND created_by = auth.uid()
)
WITH CHECK (
  is_agency_owner(NULL::uuid)
  AND created_by = auth.uid()
);

-- DELETE: Super admins can delete all
CREATE POLICY "pipeline_templates_super_admin_delete"
ON pipeline_templates FOR DELETE
TO authenticated
USING (is_super_admin());

-- DELETE: IMO admins can delete their IMO's pipelines
CREATE POLICY "pipeline_templates_imo_admin_delete"
ON pipeline_templates FOR DELETE
TO authenticated
USING (
  is_imo_admin()
  AND (imo_id = get_my_imo_id() OR imo_id IS NULL)
);

-- DELETE: IMO staff can ONLY delete pipelines they created
CREATE POLICY "pipeline_templates_imo_staff_delete"
ON pipeline_templates FOR DELETE
TO authenticated
USING (
  is_imo_staff_role()
  AND created_by = auth.uid()
);

-- DELETE: Agency owners can ONLY delete pipelines they created
CREATE POLICY "pipeline_templates_agency_owner_delete"
ON pipeline_templates FOR DELETE
TO authenticated
USING (
  is_agency_owner(NULL::uuid)
  AND created_by = auth.uid()
);

-- ============================================================================
-- 3. Drop overly permissive policies on pipeline_phases
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can delete pipeline phases" ON pipeline_phases;
DROP POLICY IF EXISTS "Authenticated users can insert pipeline phases" ON pipeline_phases;
DROP POLICY IF EXISTS "Authenticated users can view pipeline phases" ON pipeline_phases;
DROP POLICY IF EXISTS "Authenticated users can update pipeline phases" ON pipeline_phases;

-- ============================================================================
-- 4. Create proper RLS policies for pipeline_phases
-- Phases inherit permissions from their parent template
-- ============================================================================

-- SELECT: Super admins can view all
CREATE POLICY "pipeline_phases_super_admin_select"
ON pipeline_phases FOR SELECT
TO authenticated
USING (is_super_admin());

-- SELECT: IMO admins and staff can view phases of their IMO's templates
CREATE POLICY "pipeline_phases_imo_select"
ON pipeline_phases FOR SELECT
TO authenticated
USING (
  (is_imo_admin() OR is_imo_staff_role())
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
  )
);

-- SELECT: Agency owners can view phases of templates they have access to
CREATE POLICY "pipeline_phases_agency_owner_select"
ON pipeline_phases FOR SELECT
TO authenticated
USING (
  is_agency_owner(NULL::uuid)
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL OR pt.created_by = auth.uid())
  )
);

-- INSERT: Super admins can insert anywhere
CREATE POLICY "pipeline_phases_super_admin_insert"
ON pipeline_phases FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- INSERT: IMO admins can insert to their IMO's templates
CREATE POLICY "pipeline_phases_imo_admin_insert"
ON pipeline_phases FOR INSERT
TO authenticated
WITH CHECK (
  is_imo_admin()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
  )
);

-- INSERT: IMO staff can ONLY insert to templates they created
CREATE POLICY "pipeline_phases_imo_staff_insert"
ON pipeline_phases FOR INSERT
TO authenticated
WITH CHECK (
  is_imo_staff_role()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
);

-- INSERT: Agency owners can ONLY insert to templates they created
CREATE POLICY "pipeline_phases_agency_owner_insert"
ON pipeline_phases FOR INSERT
TO authenticated
WITH CHECK (
  is_agency_owner(NULL::uuid)
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
);

-- UPDATE: Super admins can update all
CREATE POLICY "pipeline_phases_super_admin_update"
ON pipeline_phases FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- UPDATE: IMO admins can update phases of their IMO's templates
CREATE POLICY "pipeline_phases_imo_admin_update"
ON pipeline_phases FOR UPDATE
TO authenticated
USING (
  is_imo_admin()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
  )
)
WITH CHECK (
  is_imo_admin()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
  )
);

-- UPDATE: IMO staff can ONLY update phases of templates they created
CREATE POLICY "pipeline_phases_imo_staff_update"
ON pipeline_phases FOR UPDATE
TO authenticated
USING (
  is_imo_staff_role()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
)
WITH CHECK (
  is_imo_staff_role()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
);

-- UPDATE: Agency owners can ONLY update phases of templates they created
CREATE POLICY "pipeline_phases_agency_owner_update"
ON pipeline_phases FOR UPDATE
TO authenticated
USING (
  is_agency_owner(NULL::uuid)
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
)
WITH CHECK (
  is_agency_owner(NULL::uuid)
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
);

-- DELETE: Super admins can delete all
CREATE POLICY "pipeline_phases_super_admin_delete"
ON pipeline_phases FOR DELETE
TO authenticated
USING (is_super_admin());

-- DELETE: IMO admins can delete phases of their IMO's templates
CREATE POLICY "pipeline_phases_imo_admin_delete"
ON pipeline_phases FOR DELETE
TO authenticated
USING (
  is_imo_admin()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
  )
);

-- DELETE: IMO staff can ONLY delete phases of templates they created
CREATE POLICY "pipeline_phases_imo_staff_delete"
ON pipeline_phases FOR DELETE
TO authenticated
USING (
  is_imo_staff_role()
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
);

-- DELETE: Agency owners can ONLY delete phases of templates they created
CREATE POLICY "pipeline_phases_agency_owner_delete"
ON pipeline_phases FOR DELETE
TO authenticated
USING (
  is_agency_owner(NULL::uuid)
  AND EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
    AND pt.created_by = auth.uid()
  )
);

-- ============================================================================
-- 5. Verify RLS is enabled
-- ============================================================================

ALTER TABLE pipeline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_phases ENABLE ROW LEVEL SECURITY;
