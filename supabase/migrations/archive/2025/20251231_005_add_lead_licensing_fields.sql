-- supabase/migrations/20251231_005_add_lead_licensing_fields.sql
-- Add licensing-related fields to recruiting_leads for enhanced lead qualification

-- ============================================================================
-- 1. Add new columns to recruiting_leads
-- ============================================================================
ALTER TABLE recruiting_leads
ADD COLUMN IF NOT EXISTS is_licensed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_imo_name TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[];

-- Add helpful comments
COMMENT ON COLUMN recruiting_leads.is_licensed IS 'Whether the lead has a life insurance license';
COMMENT ON COLUMN recruiting_leads.current_imo_name IS 'Name of the IMO/agency the lead is currently with (if licensed)';
COMMENT ON COLUMN recruiting_leads.specialties IS 'Array of product specialties the lead primarily sells';

-- ============================================================================
-- 2. Update submit_recruiting_lead function to accept new parameters
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_recruiting_lead(
  p_recruiter_slug TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_city TEXT,
  p_state TEXT,
  p_availability TEXT,
  p_income_goals TEXT DEFAULT NULL,
  p_why_interested TEXT DEFAULT '',
  p_insurance_experience TEXT DEFAULT 'none',
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_referrer_url TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_is_licensed BOOLEAN DEFAULT false,
  p_current_imo_name TEXT DEFAULT NULL,
  p_specialties TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recruiter RECORD;
  v_lead_id UUID;
  v_existing_lead UUID;
BEGIN
  -- Validate required fields
  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'First name is required');
  END IF;

  IF p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Last name is required');
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;

  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Phone is required');
  END IF;

  IF p_city IS NULL OR trim(p_city) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'City is required');
  END IF;

  IF p_state IS NULL OR trim(p_state) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'State is required');
  END IF;

  IF p_availability NOT IN ('full_time', 'part_time', 'exploring') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid availability value');
  END IF;

  IF p_insurance_experience NOT IN ('none', 'less_than_1_year', '1_to_3_years', '3_plus_years') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid insurance experience value');
  END IF;

  -- Find recruiter by slug
  SELECT up.id, up.imo_id, up.agency_id, i.is_active AS imo_active, up.approval_status
  INTO v_recruiter
  FROM user_profiles up
  JOIN imos i ON i.id = up.imo_id
  WHERE up.recruiter_slug = p_recruiter_slug
    AND up.recruiter_slug IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid recruiter link');
  END IF;

  -- Check if recruiter/IMO is active
  IF NOT v_recruiter.imo_active OR v_recruiter.approval_status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This recruiting link is no longer active');
  END IF;

  -- Check for existing pending lead with same email for this recruiter
  SELECT id INTO v_existing_lead
  FROM recruiting_leads
  WHERE lower(email) = lower(trim(p_email))
    AND recruiter_id = v_recruiter.id
    AND status = 'pending';

  IF v_existing_lead IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a pending submission with this recruiter');
  END IF;

  -- Insert lead with new licensing fields
  INSERT INTO recruiting_leads (
    recruiter_id,
    imo_id,
    agency_id,
    first_name,
    last_name,
    email,
    phone,
    city,
    state,
    availability,
    income_goals,
    why_interested,
    insurance_experience,
    utm_source,
    utm_medium,
    utm_campaign,
    referrer_url,
    ip_address,
    user_agent,
    is_licensed,
    current_imo_name,
    specialties
  ) VALUES (
    v_recruiter.id,
    v_recruiter.imo_id,
    v_recruiter.agency_id,
    trim(p_first_name),
    trim(p_last_name),
    lower(trim(p_email)),
    trim(p_phone),
    trim(p_city),
    upper(trim(p_state)),
    p_availability,
    p_income_goals,
    trim(p_why_interested),
    p_insurance_experience,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_referrer_url,
    p_ip_address,
    p_user_agent,
    COALESCE(p_is_licensed, false),
    CASE WHEN p_is_licensed = true THEN trim(p_current_imo_name) ELSE NULL END,
    CASE WHEN p_is_licensed = true THEN p_specialties ELSE NULL END
  )
  RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'message', 'Your interest has been submitted successfully'
  );
END;
$$;

-- Re-grant execute permissions with new signature
GRANT EXECUTE ON FUNCTION submit_recruiting_lead(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INET, TEXT, BOOLEAN, TEXT, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION submit_recruiting_lead(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INET, TEXT, BOOLEAN, TEXT, TEXT[]) TO authenticated;
