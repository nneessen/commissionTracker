-- supabase/migrations/20251231_004_recruiting_leads.sql
-- Public Recruiting Funnel - Leads Table and Supporting Infrastructure

-- ============================================================================
-- 1. Create recruiting_leads table
-- ============================================================================
CREATE TABLE IF NOT EXISTS recruiting_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recruiter/owner of this lead
  recruiter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- Contact information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,

  -- Lead qualification data
  availability TEXT NOT NULL CHECK (availability IN ('full_time', 'part_time', 'exploring')),
  income_goals TEXT,
  why_interested TEXT NOT NULL,
  insurance_experience TEXT NOT NULL CHECK (insurance_experience IN ('none', 'less_than_1_year', '1_to_3_years', '3_plus_years')),

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  rejection_reason TEXT,

  -- Scheduling
  discovery_call_scheduled BOOLEAN DEFAULT FALSE,
  discovery_call_scheduled_at TIMESTAMPTZ,
  discovery_call_url TEXT,

  -- Conversion tracking
  converted_at TIMESTAMPTZ,
  converted_recruit_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- UTM tracking for analytics
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,

  -- Spam prevention / rate limiting
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add helpful comment
COMMENT ON TABLE recruiting_leads IS 'Stores public recruiting funnel submissions before they become recruits';

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recruiting_leads_recruiter ON recruiting_leads(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiting_leads_status ON recruiting_leads(status);
CREATE INDEX IF NOT EXISTS idx_recruiting_leads_email ON recruiting_leads(email);
CREATE INDEX IF NOT EXISTS idx_recruiting_leads_imo ON recruiting_leads(imo_id);
CREATE INDEX IF NOT EXISTS idx_recruiting_leads_submitted_at ON recruiting_leads(submitted_at DESC);

-- Prevent duplicate pending leads from same email per recruiter
CREATE UNIQUE INDEX IF NOT EXISTS idx_recruiting_leads_email_recruiter_pending
  ON recruiting_leads(email, recruiter_id)
  WHERE status = 'pending';

-- ============================================================================
-- 3. Add recruiter_slug column to user_profiles for friendly URLs
-- ============================================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS recruiter_slug TEXT;

-- Unique index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_recruiter_slug
  ON user_profiles(recruiter_slug) WHERE recruiter_slug IS NOT NULL;

-- ============================================================================
-- 4. Updated_at trigger for recruiting_leads
-- ============================================================================
CREATE OR REPLACE FUNCTION update_recruiting_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recruiting_leads_updated_at ON recruiting_leads;
CREATE TRIGGER trigger_update_recruiting_leads_updated_at
  BEFORE UPDATE ON recruiting_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_recruiting_leads_updated_at();

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================
ALTER TABLE recruiting_leads ENABLE ROW LEVEL SECURITY;

-- Public insert for anonymous users (leads can only be created as pending)
CREATE POLICY "Anon users can submit leads"
  ON recruiting_leads
  FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

-- Authenticated users can also submit leads (in case form is accessed while logged in)
CREATE POLICY "Auth users can submit leads"
  ON recruiting_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending');

-- Recruiters can view their own leads
CREATE POLICY "Recruiters can view own leads"
  ON recruiting_leads
  FOR SELECT
  TO authenticated
  USING (recruiter_id = auth.uid());

-- Staff (trainers, contracting managers) can view leads in their IMO
CREATE POLICY "Staff can view IMO leads"
  ON recruiting_leads
  FOR SELECT
  TO authenticated
  USING (
    imo_id = get_my_imo_id() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (
        'trainer' = ANY(roles) OR
        'contracting_manager' = ANY(roles) OR
        'imo_owner' = ANY(roles) OR
        'admin' = ANY(roles)
      )
    )
  );

-- Super admins can view all leads
CREATE POLICY "Super admins can view all leads"
  ON recruiting_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Recruiters can update their own leads (accept/reject)
CREATE POLICY "Recruiters can update own leads"
  ON recruiting_leads
  FOR UPDATE
  TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

-- Staff can update IMO leads
CREATE POLICY "Staff can update IMO leads"
  ON recruiting_leads
  FOR UPDATE
  TO authenticated
  USING (
    imo_id = get_my_imo_id() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (
        'trainer' = ANY(roles) OR
        'contracting_manager' = ANY(roles) OR
        'imo_owner' = ANY(roles) OR
        'admin' = ANY(roles)
      )
    )
  );

-- Super admins can update all leads
CREATE POLICY "Super admins can update all leads"
  ON recruiting_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================================================
-- 6. RPC: Get public recruiter info (no auth required)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_public_recruiter_info(p_slug TEXT)
RETURNS TABLE (
  recruiter_id UUID,
  recruiter_first_name TEXT,
  recruiter_last_name TEXT,
  imo_name TEXT,
  imo_logo_url TEXT,
  imo_primary_color TEXT,
  imo_description TEXT,
  calendly_url TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id AS recruiter_id,
    up.first_name AS recruiter_first_name,
    up.last_name AS recruiter_last_name,
    i.name AS imo_name,
    i.logo_url AS imo_logo_url,
    i.primary_color AS imo_primary_color,
    i.description AS imo_description,
    (up.custom_permissions->>'calendly_url')::TEXT AS calendly_url,
    (i.is_active AND up.approval_status = 'approved') AS is_active
  FROM user_profiles up
  JOIN imos i ON i.id = up.imo_id
  WHERE up.recruiter_slug = p_slug
    AND up.recruiter_slug IS NOT NULL;
END;
$$;

-- Grant execute to anon for public access
GRANT EXECUTE ON FUNCTION get_public_recruiter_info(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_recruiter_info(TEXT) TO authenticated;

-- ============================================================================
-- 7. RPC: Submit recruiting lead (public, no auth)
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
  p_user_agent TEXT DEFAULT NULL
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

  -- Insert lead
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
    user_agent
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
    p_user_agent
  )
  RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'message', 'Your interest has been submitted successfully'
  );
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION submit_recruiting_lead(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_recruiting_lead(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INET, TEXT) TO authenticated;

-- ============================================================================
-- 8. RPC: Accept lead and create recruit
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_recruiting_lead(
  p_lead_id UUID,
  p_pipeline_template_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_recruit_id UUID;
  v_current_user UUID := auth.uid();
  v_is_super_admin BOOLEAN;
  v_default_template_id UUID;
BEGIN
  -- Check if super admin
  SELECT is_super_admin INTO v_is_super_admin
  FROM user_profiles
  WHERE id = v_current_user;

  -- Get lead with lock
  SELECT * INTO v_lead
  FROM recruiting_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  -- Check authorization
  IF v_lead.recruiter_id != v_current_user AND NOT COALESCE(v_is_super_admin, false) THEN
    -- Check if user is staff in same IMO
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = v_current_user
      AND imo_id = v_lead.imo_id
      AND (
        'trainer' = ANY(roles) OR
        'contracting_manager' = ANY(roles) OR
        'imo_owner' = ANY(roles) OR
        'admin' = ANY(roles)
      )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized to accept this lead');
    END IF;
  END IF;

  IF v_lead.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead is not pending');
  END IF;

  -- Check if email already exists as a user
  IF EXISTS (SELECT 1 FROM user_profiles WHERE lower(email) = lower(v_lead.email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A user with this email already exists');
  END IF;

  -- Get default pipeline template if not provided
  IF p_pipeline_template_id IS NULL THEN
    SELECT id INTO v_default_template_id
    FROM pipeline_templates
    WHERE imo_id = v_lead.imo_id
    AND is_default = true
    AND is_active = true
    LIMIT 1;

    IF v_default_template_id IS NULL THEN
      SELECT id INTO v_default_template_id
      FROM pipeline_templates
      WHERE imo_id = v_lead.imo_id
      AND is_active = true
      LIMIT 1;
    END IF;
  ELSE
    v_default_template_id := p_pipeline_template_id;
  END IF;

  -- Create recruit profile (without auth user - that comes later in pipeline)
  INSERT INTO user_profiles (
    email,
    first_name,
    last_name,
    phone,
    city,
    state,
    recruiter_id,
    upline_id,
    imo_id,
    agency_id,
    roles,
    onboarding_status,
    approval_status,
    referral_source,
    pipeline_template_id
  ) VALUES (
    v_lead.email,
    v_lead.first_name,
    v_lead.last_name,
    v_lead.phone,
    v_lead.city,
    v_lead.state,
    v_lead.recruiter_id,
    v_lead.recruiter_id,  -- upline = recruiter by default
    v_lead.imo_id,
    v_lead.agency_id,
    ARRAY['recruit']::TEXT[],
    'prospect',
    'pending',
    'public_funnel',
    v_default_template_id
  )
  RETURNING id INTO v_recruit_id;

  -- Update lead status
  UPDATE recruiting_leads
  SET status = 'accepted',
      converted_at = now(),
      converted_recruit_id = v_recruit_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'recruit_id', v_recruit_id,
    'message', 'Lead accepted and recruit created'
  );
END;
$$;

-- ============================================================================
-- 9. RPC: Reject lead
-- ============================================================================
CREATE OR REPLACE FUNCTION reject_recruiting_lead(
  p_lead_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_current_user UUID := auth.uid();
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if super admin
  SELECT is_super_admin INTO v_is_super_admin
  FROM user_profiles
  WHERE id = v_current_user;

  -- Get lead with lock
  SELECT * INTO v_lead
  FROM recruiting_leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  -- Check authorization
  IF v_lead.recruiter_id != v_current_user AND NOT COALESCE(v_is_super_admin, false) THEN
    -- Check if user is staff in same IMO
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = v_current_user
      AND imo_id = v_lead.imo_id
      AND (
        'trainer' = ANY(roles) OR
        'contracting_manager' = ANY(roles) OR
        'imo_owner' = ANY(roles) OR
        'admin' = ANY(roles)
      )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized to reject this lead');
    END IF;
  END IF;

  IF v_lead.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead is not pending');
  END IF;

  UPDATE recruiting_leads
  SET status = 'rejected',
      rejection_reason = p_reason,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead rejected'
  );
END;
$$;

-- ============================================================================
-- 10. RPC: Get leads stats for recruiter
-- ============================================================================
CREATE OR REPLACE FUNCTION get_recruiting_leads_stats(p_recruiter_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
  v_target_recruiter UUID;
  v_stats JSONB;
BEGIN
  -- If no recruiter specified, use current user
  v_target_recruiter := COALESCE(p_recruiter_id, v_current_user);

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'accepted', COUNT(*) FILTER (WHERE status = 'accepted'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired'),
    'this_week', COUNT(*) FILTER (WHERE submitted_at >= date_trunc('week', now())),
    'this_month', COUNT(*) FILTER (WHERE submitted_at >= date_trunc('month', now()))
  )
  INTO v_stats
  FROM recruiting_leads
  WHERE recruiter_id = v_target_recruiter;

  RETURN v_stats;
END;
$$;

-- ============================================================================
-- 11. RPC: Update discovery call scheduled
-- ============================================================================
CREATE OR REPLACE FUNCTION update_lead_discovery_call(
  p_lead_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_call_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
BEGIN
  SELECT * INTO v_lead
  FROM recruiting_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  UPDATE recruiting_leads
  SET discovery_call_scheduled = true,
      discovery_call_scheduled_at = p_scheduled_at,
      discovery_call_url = p_call_url,
      updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('success', true, 'message', 'Discovery call scheduled');
END;
$$;

-- Grant execute to anon (for post-submission scheduling)
GRANT EXECUTE ON FUNCTION update_lead_discovery_call(UUID, TIMESTAMPTZ, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_lead_discovery_call(UUID, TIMESTAMPTZ, TEXT) TO authenticated;
