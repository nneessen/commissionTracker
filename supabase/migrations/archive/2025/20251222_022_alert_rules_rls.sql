-- Migration: Alert Rules RLS Policies
-- Phase 10: Notifications & Alerts System
-- Implements org-scoped access control for alert rules

-- Enable RLS on new tables
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rule_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digest_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ALERT RULES POLICIES
-- ============================================

-- Super admins can do everything
CREATE POLICY "alert_rules_super_admin_all"
  ON alert_rules
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Owners can CRUD their own rules
CREATE POLICY "alert_rules_owner_select"
  ON alert_rules
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "alert_rules_owner_insert"
  ON alert_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      -- Must belong to the IMO/Agency they're creating rule for
      (imo_id IS NOT NULL AND imo_id = get_my_imo_id())
      OR (agency_id IS NOT NULL AND agency_id = get_my_agency_id())
    )
  );

CREATE POLICY "alert_rules_owner_update"
  ON alert_rules
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "alert_rules_owner_delete"
  ON alert_rules
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- IMO admins can view all rules in their IMO
CREATE POLICY "alert_rules_imo_admin_select"
  ON alert_rules
  FOR SELECT
  TO authenticated
  USING (
    imo_id = get_my_imo_id()
    AND is_imo_admin()
  );

-- Agency owners can view all rules in their agency
CREATE POLICY "alert_rules_agency_owner_select"
  ON alert_rules
  FOR SELECT
  TO authenticated
  USING (
    agency_id = get_my_agency_id()
    AND EXISTS (
      SELECT 1 FROM agencies
      WHERE agencies.id = alert_rules.agency_id
      AND agencies.owner_id = auth.uid()
    )
  );

-- ============================================
-- ALERT RULE EVALUATIONS POLICIES
-- ============================================

-- Super admins can see all evaluations
CREATE POLICY "evaluations_super_admin_select"
  ON alert_rule_evaluations
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Users can see evaluations for their own rules
CREATE POLICY "evaluations_owner_select"
  ON alert_rule_evaluations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM alert_rules
      WHERE alert_rules.id = alert_rule_evaluations.rule_id
      AND alert_rules.owner_id = auth.uid()
    )
  );

-- Users can see evaluations that affected them
CREATE POLICY "evaluations_affected_user_select"
  ON alert_rule_evaluations
  FOR SELECT
  TO authenticated
  USING (affected_user_id = auth.uid());

-- Service role can insert evaluations (edge function)
-- Note: Edge functions use service role key which bypasses RLS

-- ============================================
-- NOTIFICATION DIGEST LOG POLICIES
-- ============================================

-- Super admins can see all digest logs
CREATE POLICY "digest_log_super_admin_select"
  ON notification_digest_log
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Users can see their own digest logs
CREATE POLICY "digest_log_user_select"
  ON notification_digest_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATION PREFERENCES POLICIES UPDATE
-- ============================================

-- Ensure users can update their own preferences
-- (Should already exist, but add if missing)
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_preferences'
    AND policyname = 'notification_prefs_user_update'
  ) THEN
    EXECUTE 'CREATE POLICY "notification_prefs_user_update"
      ON notification_preferences
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- Ensure users can insert their own preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_preferences'
    AND policyname = 'notification_prefs_user_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "notification_prefs_user_insert"
      ON notification_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;
