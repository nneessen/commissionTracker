-- Migration: Add workflow rate limiting system
-- Date: 2025-12-11
-- Purpose: Prevent runaway email costs with daily caps and per-workflow limits

-- Create workflow email tracking table
CREATE TABLE IF NOT EXISTS workflow_email_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE,
  success boolean DEFAULT true,
  error_message text
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_workflow_email_tracking_date
ON workflow_email_tracking(date, user_id);

CREATE INDEX IF NOT EXISTS idx_workflow_email_tracking_workflow
ON workflow_email_tracking(workflow_id, date);

-- Rate limit configuration table
CREATE TABLE IF NOT EXISTS workflow_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  -- Daily limits
  daily_email_limit integer DEFAULT 100,
  daily_workflow_runs_limit integer DEFAULT 50,
  -- Per-workflow limits
  per_workflow_hourly_limit integer DEFAULT 10,
  per_recipient_daily_limit integer DEFAULT 3,
  -- Bulk email limits
  max_recipients_per_action integer DEFAULT 20,
  -- Override for admins/power users
  is_unlimited boolean DEFAULT false,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Default rate limits (applied when user has no specific limits)
INSERT INTO workflow_rate_limits (user_id, daily_email_limit, daily_workflow_runs_limit, per_workflow_hourly_limit, per_recipient_daily_limit, max_recipients_per_action, is_unlimited)
VALUES (NULL, 100, 50, 10, 3, 20, false)
ON CONFLICT DO NOTHING;

-- Function to check if email can be sent (rate limit check)
CREATE OR REPLACE FUNCTION check_workflow_email_rate_limit(
  p_user_id uuid,
  p_workflow_id uuid,
  p_recipient_email text,
  p_recipient_count integer DEFAULT 1
) RETURNS jsonb AS $$
DECLARE
  v_limits record;
  v_daily_sent integer;
  v_workflow_hourly integer;
  v_recipient_daily integer;
  v_result jsonb;
BEGIN
  -- Get user's rate limits (or defaults)
  SELECT * INTO v_limits
  FROM workflow_rate_limits
  WHERE user_id = p_user_id OR user_id IS NULL
  ORDER BY user_id NULLS LAST
  LIMIT 1;

  -- If unlimited, allow
  IF v_limits.is_unlimited THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'unlimited');
  END IF;

  -- Check max recipients per action
  IF p_recipient_count > v_limits.max_recipients_per_action THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'max_recipients_exceeded',
      'limit', v_limits.max_recipients_per_action,
      'requested', p_recipient_count
    );
  END IF;

  -- Check daily email limit
  SELECT COUNT(*) INTO v_daily_sent
  FROM workflow_email_tracking
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE
    AND success = true;

  IF v_daily_sent + p_recipient_count > v_limits.daily_email_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_exceeded',
      'limit', v_limits.daily_email_limit,
      'sent', v_daily_sent,
      'remaining', GREATEST(0, v_limits.daily_email_limit - v_daily_sent)
    );
  END IF;

  -- Check per-workflow hourly limit
  SELECT COUNT(*) INTO v_workflow_hourly
  FROM workflow_email_tracking
  WHERE workflow_id = p_workflow_id
    AND sent_at > now() - interval '1 hour'
    AND success = true;

  IF v_workflow_hourly + p_recipient_count > v_limits.per_workflow_hourly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'workflow_hourly_limit_exceeded',
      'limit', v_limits.per_workflow_hourly_limit,
      'sent_this_hour', v_workflow_hourly
    );
  END IF;

  -- Check per-recipient daily limit (prevent spam to same person)
  IF p_recipient_email IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recipient_daily
    FROM workflow_email_tracking
    WHERE recipient_email = p_recipient_email
      AND date = CURRENT_DATE
      AND success = true;

    IF v_recipient_daily >= v_limits.per_recipient_daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'recipient_daily_limit_exceeded',
        'limit', v_limits.per_recipient_daily_limit,
        'recipient', p_recipient_email
      );
    END IF;
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'daily_remaining', v_limits.daily_email_limit - v_daily_sent - p_recipient_count,
    'workflow_hourly_remaining', v_limits.per_workflow_hourly_limit - v_workflow_hourly - p_recipient_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record sent email
CREATE OR REPLACE FUNCTION record_workflow_email(
  p_workflow_id uuid,
  p_user_id uuid,
  p_recipient_email text,
  p_recipient_type text,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO workflow_email_tracking (
    workflow_id, user_id, recipient_email, recipient_type, success, error_message
  ) VALUES (
    p_workflow_id, p_user_id, p_recipient_email, p_recipient_type, p_success, p_error_message
  ) RETURNING id INTO v_id;

  -- Also update email_quota_tracking if it exists
  INSERT INTO email_quota_tracking (user_id, provider, date, emails_sent)
  VALUES (p_user_id, 'workflow', CURRENT_DATE, 1)
  ON CONFLICT (user_id, provider, date)
  DO UPDATE SET emails_sent = email_quota_tracking.emails_sent + 1;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current usage stats
CREATE OR REPLACE FUNCTION get_workflow_email_usage(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_limits record;
  v_daily_sent integer;
  v_result jsonb;
BEGIN
  -- Get limits
  SELECT * INTO v_limits
  FROM workflow_rate_limits
  WHERE user_id = p_user_id OR user_id IS NULL
  ORDER BY user_id NULLS LAST
  LIMIT 1;

  -- Get daily count
  SELECT COUNT(*) INTO v_daily_sent
  FROM workflow_email_tracking
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE
    AND success = true;

  RETURN jsonb_build_object(
    'daily_limit', v_limits.daily_email_limit,
    'daily_sent', v_daily_sent,
    'daily_remaining', GREATEST(0, v_limits.daily_email_limit - v_daily_sent),
    'per_workflow_hourly_limit', v_limits.per_workflow_hourly_limit,
    'max_recipients_per_action', v_limits.max_recipients_per_action,
    'is_unlimited', v_limits.is_unlimited
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE workflow_email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own tracking
CREATE POLICY "Users can view own email tracking"
ON workflow_email_tracking FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
));

-- Admins can view all rate limits, users can view their own
CREATE POLICY "View rate limits"
ON workflow_rate_limits FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL OR EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
));

-- Only admins can modify rate limits
CREATE POLICY "Admins can manage rate limits"
ON workflow_rate_limits FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_workflow_email_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION record_workflow_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_email_usage TO authenticated;

-- Add comment
COMMENT ON TABLE workflow_email_tracking IS 'Tracks all emails sent via workflows for rate limiting';
COMMENT ON TABLE workflow_rate_limits IS 'Configurable rate limits per user for workflow emails';
