-- Fix admin_get_all_users to return all editable fields for the edit dialog

CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  roles TEXT[],
  approval_status TEXT,
  is_admin BOOLEAN,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upline_id UUID,
  hierarchy_path TEXT,
  hierarchy_depth INTEGER,
  contract_level INTEGER,
  -- Additional editable fields
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  resident_state TEXT,
  license_number TEXT,
  npn TEXT,
  license_expiration TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  current_onboarding_phase TEXT,
  onboarding_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT
    COALESCE(
      (raw_user_meta_data->>'is_admin')::BOOLEAN,
      FALSE
    ) INTO caller_is_admin
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.email,
    COALESCE(
      CASE
        WHEN up.first_name IS NOT NULL AND up.last_name IS NOT NULL
          THEN up.first_name || ' ' || up.last_name
        WHEN up.first_name IS NOT NULL THEN up.first_name
        WHEN up.last_name IS NOT NULL THEN up.last_name
        ELSE NULL
      END,
      NULL
    ) AS full_name,
    up.first_name,
    up.last_name,
    up.phone,
    up.roles,
    up.approval_status,
    up.is_admin,
    up.approved_by,
    up.approved_at,
    up.denied_at,
    up.denial_reason,
    up.created_at,
    up.updated_at,
    up.upline_id,
    up.hierarchy_path,
    up.hierarchy_depth,
    up.contract_level,
    up.street_address,
    up.city,
    up.state,
    up.zip,
    up.resident_state,
    up.license_number,
    up.npn,
    up.license_expiration::TEXT,
    up.linkedin_url,
    up.instagram_url,
    up.current_onboarding_phase,
    up.onboarding_status
  FROM user_profiles up
  WHERE up.is_deleted IS NOT TRUE
  ORDER BY up.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;
