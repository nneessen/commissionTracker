-- Migration: Audit Log RPCs
-- Phase 11: Audit Trail & Activity Logs
-- Query functions for paginated audit log access with filters

-- ============================================
-- GET AUDIT LOGS (PAGINATED WITH FILTERS)
-- ============================================

CREATE OR REPLACE FUNCTION get_audit_logs(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50,
  p_table_name TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  imo_id UUID,
  agency_id UUID,
  table_name TEXT,
  record_id UUID,
  action audit_action,
  performed_by UUID,
  performed_by_name TEXT,
  performed_by_email TEXT,
  changed_fields TEXT[],
  action_type TEXT,
  description TEXT,
  source audit_source,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_user_imo_id UUID;
  v_user_agency_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_imo_admin BOOLEAN;
  v_is_agency_owner BOOLEAN;
  v_total BIGINT;
BEGIN
  -- Get user context
  v_user_imo_id := get_my_imo_id();
  v_user_agency_id := get_my_agency_id();
  v_is_super_admin := is_super_admin();
  v_is_imo_admin := is_imo_admin();
  v_is_agency_owner := EXISTS (
    SELECT 1 FROM agencies WHERE owner_id = auth.uid()
  );

  -- Validate access
  IF NOT (v_is_super_admin OR v_is_imo_admin OR v_is_agency_owner) THEN
    RAISE EXCEPTION 'Access denied: requires admin or owner role';
  END IF;

  -- Calculate offset
  v_offset := (GREATEST(p_page, 1) - 1) * p_page_size;

  -- Get total count matching filters
  SELECT COUNT(*)
  INTO v_total
  FROM audit_log al
  WHERE
    -- Permission check
    (
      v_is_super_admin
      OR (v_is_imo_admin AND al.imo_id = v_user_imo_id)
      OR (v_is_agency_owner AND al.agency_id = v_user_agency_id)
    )
    -- Filters
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_action IS NULL OR al.action::TEXT = p_action)
    AND (p_action_type IS NULL OR al.action_type = p_action_type)
    AND (p_performed_by IS NULL OR al.performed_by = p_performed_by)
    AND (p_record_id IS NULL OR al.record_id = p_record_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (
      p_search IS NULL
      OR al.performed_by_name ILIKE '%' || p_search || '%'
      OR al.performed_by_email ILIKE '%' || p_search || '%'
      OR al.description ILIKE '%' || p_search || '%'
      OR al.action_type ILIKE '%' || p_search || '%'
    );

  -- Return paginated results
  RETURN QUERY
  SELECT
    al.id,
    al.imo_id,
    al.agency_id,
    al.table_name,
    al.record_id,
    al.action,
    al.performed_by,
    al.performed_by_name,
    al.performed_by_email,
    al.changed_fields,
    al.action_type,
    al.description,
    al.source,
    al.created_at,
    v_total AS total_count
  FROM audit_log al
  WHERE
    -- Permission check
    (
      v_is_super_admin
      OR (v_is_imo_admin AND al.imo_id = v_user_imo_id)
      OR (v_is_agency_owner AND al.agency_id = v_user_agency_id)
    )
    -- Filters
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_action IS NULL OR al.action::TEXT = p_action)
    AND (p_action_type IS NULL OR al.action_type = p_action_type)
    AND (p_performed_by IS NULL OR al.performed_by = p_performed_by)
    AND (p_record_id IS NULL OR al.record_id = p_record_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (
      p_search IS NULL
      OR al.performed_by_name ILIKE '%' || p_search || '%'
      OR al.performed_by_email ILIKE '%' || p_search || '%'
      OR al.description ILIKE '%' || p_search || '%'
      OR al.action_type ILIKE '%' || p_search || '%'
    )
  ORDER BY al.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- ============================================
-- GET AUDIT LOG DETAIL
-- ============================================

CREATE OR REPLACE FUNCTION get_audit_log_detail(p_audit_id UUID)
RETURNS TABLE (
  id UUID,
  imo_id UUID,
  agency_id UUID,
  table_name TEXT,
  record_id UUID,
  action audit_action,
  performed_by UUID,
  performed_by_name TEXT,
  performed_by_email TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  action_type TEXT,
  description TEXT,
  source audit_source,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_imo_id UUID;
  v_user_agency_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_imo_admin BOOLEAN;
  v_is_agency_owner BOOLEAN;
BEGIN
  -- Get user context
  v_user_imo_id := get_my_imo_id();
  v_user_agency_id := get_my_agency_id();
  v_is_super_admin := is_super_admin();
  v_is_imo_admin := is_imo_admin();
  v_is_agency_owner := EXISTS (
    SELECT 1 FROM agencies WHERE owner_id = auth.uid()
  );

  RETURN QUERY
  SELECT
    al.id,
    al.imo_id,
    al.agency_id,
    al.table_name,
    al.record_id,
    al.action,
    al.performed_by,
    al.performed_by_name,
    al.performed_by_email,
    al.old_data,
    al.new_data,
    al.changed_fields,
    al.action_type,
    al.description,
    al.source,
    al.metadata,
    al.created_at
  FROM audit_log al
  WHERE
    al.id = p_audit_id
    AND (
      v_is_super_admin
      OR (v_is_imo_admin AND al.imo_id = v_user_imo_id)
      OR (v_is_agency_owner AND al.agency_id = v_user_agency_id)
      OR al.performed_by = auth.uid()
    );
END;
$$;

-- ============================================
-- GET AUDIT ACTION TYPES (FOR FILTER DROPDOWN)
-- ============================================

CREATE OR REPLACE FUNCTION get_audit_action_types()
RETURNS TABLE (
  action_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_imo_id UUID;
  v_user_agency_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_imo_admin BOOLEAN;
  v_is_agency_owner BOOLEAN;
BEGIN
  -- Get user context
  v_user_imo_id := get_my_imo_id();
  v_user_agency_id := get_my_agency_id();
  v_is_super_admin := is_super_admin();
  v_is_imo_admin := is_imo_admin();
  v_is_agency_owner := EXISTS (
    SELECT 1 FROM agencies WHERE owner_id = auth.uid()
  );

  RETURN QUERY
  SELECT al.action_type, COUNT(*) AS count
  FROM audit_log al
  WHERE
    al.action_type IS NOT NULL
    AND (
      v_is_super_admin
      OR (v_is_imo_admin AND al.imo_id = v_user_imo_id)
      OR (v_is_agency_owner AND al.agency_id = v_user_agency_id)
    )
  GROUP BY al.action_type
  ORDER BY count DESC;
END;
$$;

-- ============================================
-- GET AUDIT TABLES (FOR FILTER DROPDOWN)
-- ============================================

CREATE OR REPLACE FUNCTION get_audit_tables()
RETURNS TABLE (
  table_name TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_imo_id UUID;
  v_user_agency_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_imo_admin BOOLEAN;
  v_is_agency_owner BOOLEAN;
BEGIN
  -- Get user context
  v_user_imo_id := get_my_imo_id();
  v_user_agency_id := get_my_agency_id();
  v_is_super_admin := is_super_admin();
  v_is_imo_admin := is_imo_admin();
  v_is_agency_owner := EXISTS (
    SELECT 1 FROM agencies WHERE owner_id = auth.uid()
  );

  RETURN QUERY
  SELECT al.table_name, COUNT(*) AS count
  FROM audit_log al
  WHERE
    v_is_super_admin
    OR (v_is_imo_admin AND al.imo_id = v_user_imo_id)
    OR (v_is_agency_owner AND al.agency_id = v_user_agency_id)
  GROUP BY al.table_name
  ORDER BY count DESC;
END;
$$;

-- ============================================
-- GET AUDIT PERFORMERS (FOR USER FILTER)
-- ============================================

CREATE OR REPLACE FUNCTION get_audit_performers()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  action_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_imo_id UUID;
  v_user_agency_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_imo_admin BOOLEAN;
  v_is_agency_owner BOOLEAN;
BEGIN
  -- Get user context
  v_user_imo_id := get_my_imo_id();
  v_user_agency_id := get_my_agency_id();
  v_is_super_admin := is_super_admin();
  v_is_imo_admin := is_imo_admin();
  v_is_agency_owner := EXISTS (
    SELECT 1 FROM agencies WHERE owner_id = auth.uid()
  );

  RETURN QUERY
  SELECT
    al.performed_by AS user_id,
    al.performed_by_name AS user_name,
    al.performed_by_email AS user_email,
    COUNT(*) AS action_count
  FROM audit_log al
  WHERE
    al.performed_by IS NOT NULL
    AND (
      v_is_super_admin
      OR (v_is_imo_admin AND al.imo_id = v_user_imo_id)
      OR (v_is_agency_owner AND al.agency_id = v_user_agency_id)
    )
  GROUP BY al.performed_by, al.performed_by_name, al.performed_by_email
  ORDER BY action_count DESC
  LIMIT 100;
END;
$$;

-- ============================================
-- CLEANUP OLD AUDIT LOGS
-- Retention: 90 days non-financial, 365 days financial
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS TABLE (
  deleted_non_financial INTEGER,
  deleted_financial INTEGER,
  total_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_non_financial INTEGER := 0;
  v_deleted_financial INTEGER := 0;
BEGIN
  -- Delete non-financial audit logs older than 90 days
  DELETE FROM audit_log
  WHERE
    created_at < NOW() - INTERVAL '90 days'
    AND table_name NOT IN ('policies', 'commissions', 'override_commissions');

  GET DIAGNOSTICS v_deleted_non_financial = ROW_COUNT;

  -- Delete financial audit logs older than 365 days
  DELETE FROM audit_log
  WHERE
    created_at < NOW() - INTERVAL '365 days'
    AND table_name IN ('policies', 'commissions', 'override_commissions');

  GET DIAGNOSTICS v_deleted_financial = ROW_COUNT;

  RETURN QUERY
  SELECT
    v_deleted_non_financial,
    v_deleted_financial,
    v_deleted_non_financial + v_deleted_financial;
END;
$$;

-- ============================================
-- LOG APPLICATION AUDIT (EXPLICIT LOGGING)
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_table_name TEXT,
  p_record_id UUID,
  p_action audit_action,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_imo_id UUID;
  v_agency_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    SELECT
      COALESCE(first_name || ' ' || last_name, email),
      email,
      imo_id,
      agency_id
    INTO v_user_name, v_user_email, v_imo_id, v_agency_id
    FROM user_profiles
    WHERE id = v_user_id;
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (
    imo_id,
    agency_id,
    table_name,
    record_id,
    action,
    performed_by,
    performed_by_name,
    performed_by_email,
    old_data,
    new_data,
    changed_fields,
    source,
    action_type,
    description,
    metadata
  ) VALUES (
    v_imo_id,
    v_agency_id,
    p_table_name,
    p_record_id,
    p_action,
    v_user_id,
    v_user_name,
    v_user_email,
    p_old_data,
    p_new_data,
    p_changed_fields,
    'application',
    p_action_type,
    p_description,
    p_metadata
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_log_detail TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_action_types TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_tables TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_performers TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO service_role;
