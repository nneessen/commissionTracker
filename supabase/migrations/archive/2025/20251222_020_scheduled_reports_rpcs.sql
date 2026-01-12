-- Migration: Scheduled Reports RPCs
-- Phase 9: Report Export Enhancement
-- Helper functions for schedule management and processing

-- ============================================================================
-- HELPER: Calculate next delivery date based on frequency
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_next_delivery(
  p_frequency report_frequency,
  p_day_of_week SMALLINT,
  p_day_of_month SMALLINT,
  p_preferred_time TIME,
  p_from_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_next_date DATE;
  v_result TIMESTAMPTZ;
BEGIN
  CASE p_frequency
    WHEN 'weekly' THEN
      -- Find next occurrence of the specified day of week
      v_next_date := p_from_date::date;
      WHILE EXTRACT(DOW FROM v_next_date) != p_day_of_week OR v_next_date <= p_from_date::date LOOP
        v_next_date := v_next_date + INTERVAL '1 day';
      END LOOP;

    WHEN 'monthly' THEN
      -- Find next occurrence of the specified day of month
      v_next_date := date_trunc('month', p_from_date)::date + (p_day_of_month - 1);
      IF v_next_date <= p_from_date::date THEN
        v_next_date := date_trunc('month', p_from_date + INTERVAL '1 month')::date + (p_day_of_month - 1);
      END IF;

    WHEN 'quarterly' THEN
      -- Find next quarter start (Jan, Apr, Jul, Oct) + specified day
      v_next_date := date_trunc('quarter', p_from_date)::date + (p_day_of_month - 1);
      IF v_next_date <= p_from_date::date THEN
        v_next_date := date_trunc('quarter', p_from_date + INTERVAL '3 months')::date + (p_day_of_month - 1);
      END IF;
  END CASE;

  -- Combine date with preferred time (in UTC)
  v_result := v_next_date + p_preferred_time;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION calculate_next_delivery IS 'Calculates the next delivery timestamp based on frequency and schedule settings';

-- ============================================================================
-- HELPER: Validate recipients are org members
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_schedule_recipients(
  p_recipients JSONB,
  p_imo_id UUID,
  p_agency_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_recipient JSONB;
  v_user_id UUID;
  v_valid BOOLEAN;
BEGIN
  -- Check each recipient
  FOR v_recipient IN SELECT jsonb_array_elements(p_recipients)
  LOOP
    v_user_id := (v_recipient->>'user_id')::UUID;

    IF v_user_id IS NULL THEN
      RETURN FALSE; -- All recipients must have user_id
    END IF;

    -- Check if user is in the org
    IF p_agency_id IS NOT NULL THEN
      -- Agency scope: user must be in this agency
      SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = v_user_id AND agency_id = p_agency_id
      ) INTO v_valid;
    ELSIF p_imo_id IS NOT NULL THEN
      -- IMO scope: user must be in this IMO (any agency within it)
      SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = v_user_id AND imo_id = p_imo_id
      ) INTO v_valid;
    ELSE
      v_valid := FALSE;
    END IF;

    IF NOT v_valid THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION validate_schedule_recipients IS 'Validates that all recipients are members of the specified org (IMO or Agency)';

-- ============================================================================
-- RPC: Get eligible recipients for a schedule (org members)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_eligible_recipients(
  p_imo_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  agency_name TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  IF p_agency_id IS NOT NULL THEN
    -- Agency scope: return users in this agency
    RETURN QUERY
    SELECT
      up.user_id,
      u.email,
      COALESCE(up.first_name || ' ' || up.last_name, u.email) AS full_name,
      up.role::TEXT,
      a.name AS agency_name
    FROM user_profiles up
    JOIN auth.users u ON u.id = up.user_id
    LEFT JOIN agencies a ON a.id = up.agency_id
    WHERE up.agency_id = p_agency_id
      AND up.is_active = true
    ORDER BY full_name;

  ELSIF p_imo_id IS NOT NULL THEN
    -- IMO scope: return all users in this IMO
    RETURN QUERY
    SELECT
      up.user_id,
      u.email,
      COALESCE(up.first_name || ' ' || up.last_name, u.email) AS full_name,
      up.role::TEXT,
      a.name AS agency_name
    FROM user_profiles up
    JOIN auth.users u ON u.id = up.user_id
    LEFT JOIN agencies a ON a.id = up.agency_id
    WHERE up.imo_id = p_imo_id
      AND up.is_active = true
    ORDER BY agency_name NULLS LAST, full_name;

  ELSE
    -- No scope provided, return empty
    RETURN;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_eligible_recipients IS 'Returns list of org members who can be added as recipients to a scheduled report';

-- ============================================================================
-- RPC: Create scheduled report with validation
-- ============================================================================
CREATE OR REPLACE FUNCTION create_scheduled_report(
  p_schedule_name TEXT,
  p_report_type TEXT,
  p_frequency report_frequency,
  p_day_of_week SMALLINT DEFAULT NULL,
  p_day_of_month SMALLINT DEFAULT NULL,
  p_preferred_time TIME DEFAULT '08:00:00',
  p_recipients JSONB DEFAULT '[]',
  p_export_format TEXT DEFAULT 'pdf',
  p_report_config JSONB DEFAULT '{}',
  p_include_charts BOOLEAN DEFAULT true,
  p_include_insights BOOLEAN DEFAULT true,
  p_include_summary BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_profile user_profiles%ROWTYPE;
  v_schedule_id UUID;
  v_next_delivery TIMESTAMPTZ;
BEGIN
  -- Get user's profile for org context
  SELECT * INTO v_user_profile
  FROM user_profiles
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Validate recipients are org members
  IF jsonb_array_length(p_recipients) > 0 THEN
    IF NOT validate_schedule_recipients(p_recipients, v_user_profile.imo_id, v_user_profile.agency_id) THEN
      RAISE EXCEPTION 'Invalid recipients: all recipients must be members of your organization';
    END IF;
  END IF;

  -- Calculate next delivery
  v_next_delivery := calculate_next_delivery(
    p_frequency,
    p_day_of_week,
    p_day_of_month,
    p_preferred_time
  );

  -- Insert the schedule
  INSERT INTO scheduled_reports (
    owner_id,
    imo_id,
    agency_id,
    schedule_name,
    report_type,
    report_config,
    frequency,
    day_of_week,
    day_of_month,
    preferred_time,
    recipients,
    export_format,
    include_charts,
    include_insights,
    include_summary,
    next_delivery
  )
  VALUES (
    auth.uid(),
    v_user_profile.imo_id,
    v_user_profile.agency_id,
    p_schedule_name,
    p_report_type,
    COALESCE(p_report_config, '{}'::jsonb),
    p_frequency,
    p_day_of_week,
    p_day_of_month,
    p_preferred_time,
    COALESCE(p_recipients, '[]'::jsonb),
    COALESCE(p_export_format, 'pdf'),
    COALESCE(p_include_charts, true),
    COALESCE(p_include_insights, true),
    COALESCE(p_include_summary, true),
    v_next_delivery
  )
  RETURNING id INTO v_schedule_id;

  RETURN v_schedule_id;
END;
$$;

COMMENT ON FUNCTION create_scheduled_report IS 'Creates a new scheduled report with recipient validation';

-- ============================================================================
-- RPC: Update scheduled report
-- ============================================================================
CREATE OR REPLACE FUNCTION update_scheduled_report(
  p_schedule_id UUID,
  p_schedule_name TEXT DEFAULT NULL,
  p_frequency report_frequency DEFAULT NULL,
  p_day_of_week SMALLINT DEFAULT NULL,
  p_day_of_month SMALLINT DEFAULT NULL,
  p_preferred_time TIME DEFAULT NULL,
  p_recipients JSONB DEFAULT NULL,
  p_export_format TEXT DEFAULT NULL,
  p_report_config JSONB DEFAULT NULL,
  p_include_charts BOOLEAN DEFAULT NULL,
  p_include_insights BOOLEAN DEFAULT NULL,
  p_include_summary BOOLEAN DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_schedule scheduled_reports%ROWTYPE;
  v_new_next_delivery TIMESTAMPTZ;
BEGIN
  -- Get existing schedule (RLS will enforce ownership)
  SELECT * INTO v_schedule
  FROM scheduled_reports
  WHERE id = p_schedule_id AND owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found or access denied';
  END IF;

  -- Validate recipients if being updated
  IF p_recipients IS NOT NULL AND jsonb_array_length(p_recipients) > 0 THEN
    IF NOT validate_schedule_recipients(p_recipients, v_schedule.imo_id, v_schedule.agency_id) THEN
      RAISE EXCEPTION 'Invalid recipients: all recipients must be members of your organization';
    END IF;
  END IF;

  -- Calculate new next_delivery if schedule timing changed
  IF p_frequency IS NOT NULL OR p_day_of_week IS NOT NULL OR p_day_of_month IS NOT NULL OR p_preferred_time IS NOT NULL THEN
    v_new_next_delivery := calculate_next_delivery(
      COALESCE(p_frequency, v_schedule.frequency),
      COALESCE(p_day_of_week, v_schedule.day_of_week),
      COALESCE(p_day_of_month, v_schedule.day_of_month),
      COALESCE(p_preferred_time, v_schedule.preferred_time)
    );
  ELSE
    v_new_next_delivery := v_schedule.next_delivery;
  END IF;

  -- Update the schedule
  UPDATE scheduled_reports
  SET
    schedule_name = COALESCE(p_schedule_name, schedule_name),
    frequency = COALESCE(p_frequency, frequency),
    day_of_week = COALESCE(p_day_of_week, day_of_week),
    day_of_month = COALESCE(p_day_of_month, day_of_month),
    preferred_time = COALESCE(p_preferred_time, preferred_time),
    recipients = COALESCE(p_recipients, recipients),
    export_format = COALESCE(p_export_format, export_format),
    report_config = COALESCE(p_report_config, report_config),
    include_charts = COALESCE(p_include_charts, include_charts),
    include_insights = COALESCE(p_include_insights, include_insights),
    include_summary = COALESCE(p_include_summary, include_summary),
    is_active = COALESCE(p_is_active, is_active),
    next_delivery = v_new_next_delivery,
    consecutive_failures = CASE WHEN p_is_active = true THEN 0 ELSE consecutive_failures END
  WHERE id = p_schedule_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION update_scheduled_report IS 'Updates an existing scheduled report with validation';

-- ============================================================================
-- RPC: Get user's scheduled reports with delivery stats
-- ============================================================================
CREATE OR REPLACE FUNCTION get_my_scheduled_reports()
RETURNS TABLE (
  id UUID,
  schedule_name TEXT,
  report_type TEXT,
  frequency report_frequency,
  day_of_week SMALLINT,
  day_of_month SMALLINT,
  preferred_time TIME,
  recipients JSONB,
  export_format TEXT,
  report_config JSONB,
  include_charts BOOLEAN,
  include_insights BOOLEAN,
  include_summary BOOLEAN,
  is_active BOOLEAN,
  next_delivery TIMESTAMPTZ,
  last_delivery TIMESTAMPTZ,
  consecutive_failures SMALLINT,
  created_at TIMESTAMPTZ,
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.schedule_name,
    sr.report_type,
    sr.frequency,
    sr.day_of_week,
    sr.day_of_month,
    sr.preferred_time,
    sr.recipients,
    sr.export_format,
    sr.report_config,
    sr.include_charts,
    sr.include_insights,
    sr.include_summary,
    sr.is_active,
    sr.next_delivery,
    sr.last_delivery,
    sr.consecutive_failures,
    sr.created_at,
    COUNT(srd.id) AS total_deliveries,
    COUNT(srd.id) FILTER (WHERE srd.status = 'sent') AS successful_deliveries,
    COUNT(srd.id) FILTER (WHERE srd.status = 'failed') AS failed_deliveries
  FROM scheduled_reports sr
  LEFT JOIN scheduled_report_deliveries srd ON srd.schedule_id = sr.id
  WHERE sr.owner_id = auth.uid()
  GROUP BY sr.id
  ORDER BY sr.is_active DESC, sr.next_delivery ASC;
END;
$$;

COMMENT ON FUNCTION get_my_scheduled_reports IS 'Returns all scheduled reports owned by the current user with delivery statistics';

-- ============================================================================
-- RPC: Get delivery history for a schedule
-- ============================================================================
CREATE OR REPLACE FUNCTION get_schedule_delivery_history(
  p_schedule_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  recipients_sent JSONB,
  report_period_start DATE,
  report_period_end DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Verify user owns this schedule
  IF NOT EXISTS (
    SELECT 1 FROM scheduled_reports
    WHERE id = p_schedule_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Schedule not found or access denied';
  END IF;

  RETURN QUERY
  SELECT
    srd.id,
    srd.status,
    srd.error_message,
    srd.delivered_at,
    srd.recipients_sent,
    srd.report_period_start,
    srd.report_period_end,
    srd.created_at
  FROM scheduled_report_deliveries srd
  WHERE srd.schedule_id = p_schedule_id
  ORDER BY srd.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_schedule_delivery_history IS 'Returns delivery history for a specific schedule';

-- ============================================================================
-- RPC: Get due schedules (for edge function - requires service role)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_due_scheduled_reports()
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  imo_id UUID,
  agency_id UUID,
  schedule_name TEXT,
  report_type TEXT,
  report_config JSONB,
  frequency report_frequency,
  day_of_week SMALLINT,
  day_of_month SMALLINT,
  preferred_time TIME,
  recipients JSONB,
  export_format TEXT,
  include_charts BOOLEAN,
  include_insights BOOLEAN,
  include_summary BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- This function is intended for the service role (edge function)
  -- It bypasses RLS to get all due schedules
  RETURN QUERY
  SELECT
    sr.id,
    sr.owner_id,
    sr.imo_id,
    sr.agency_id,
    sr.schedule_name,
    sr.report_type,
    sr.report_config,
    sr.frequency,
    sr.day_of_week,
    sr.day_of_month,
    sr.preferred_time,
    sr.recipients,
    sr.export_format,
    sr.include_charts,
    sr.include_insights,
    sr.include_summary
  FROM scheduled_reports sr
  WHERE sr.is_active = true
    AND sr.next_delivery <= now()
    AND sr.consecutive_failures < 3
    AND jsonb_array_length(sr.recipients) > 0
  ORDER BY sr.next_delivery ASC
  LIMIT 50; -- Process max 50 per run to avoid timeouts
END;
$$;

COMMENT ON FUNCTION get_due_scheduled_reports IS 'Returns schedules that are due for delivery (for edge function use)';

-- ============================================================================
-- RPC: Mark delivery complete and update next delivery
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_scheduled_delivery(
  p_schedule_id UUID,
  p_delivery_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_mailgun_message_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_schedule scheduled_reports%ROWTYPE;
  v_new_next_delivery TIMESTAMPTZ;
BEGIN
  -- Get the schedule
  SELECT * INTO v_schedule FROM scheduled_reports WHERE id = p_schedule_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update delivery record
  UPDATE scheduled_report_deliveries
  SET
    status = CASE WHEN p_success THEN 'sent' ELSE 'failed' END,
    error_message = p_error_message,
    delivered_at = CASE WHEN p_success THEN now() ELSE NULL END,
    mailgun_message_id = p_mailgun_message_id
  WHERE id = p_delivery_id;

  -- Calculate next delivery
  v_new_next_delivery := calculate_next_delivery(
    v_schedule.frequency,
    v_schedule.day_of_week,
    v_schedule.day_of_month,
    v_schedule.preferred_time,
    now()
  );

  -- Update schedule
  UPDATE scheduled_reports
  SET
    last_delivery = CASE WHEN p_success THEN now() ELSE last_delivery END,
    next_delivery = v_new_next_delivery,
    consecutive_failures = CASE
      WHEN p_success THEN 0
      ELSE consecutive_failures + 1
    END,
    is_active = CASE
      WHEN p_success THEN is_active
      WHEN consecutive_failures >= 2 THEN false -- Disable after 3 failures
      ELSE is_active
    END
  WHERE id = p_schedule_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION complete_scheduled_delivery IS 'Marks a delivery as complete and updates schedule state';
