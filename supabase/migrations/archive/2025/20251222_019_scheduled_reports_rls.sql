-- Migration: Scheduled Reports RLS Policies
-- Phase 9: Report Export Enhancement
-- Implements org-scoped access control for scheduled reports

-- 1. Enable RLS on tables
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_report_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEDULED_REPORTS POLICIES
-- ============================================================================

-- Super admins: full access to all schedules
CREATE POLICY "Super admins have full access to scheduled_reports"
  ON scheduled_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND 'super_admin' = ANY(roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND 'super_admin' = ANY(roles)
    )
  );

-- Owners: full CRUD on their own schedules
CREATE POLICY "Users can manage own schedules"
  ON scheduled_reports
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- IMO admins: can view all schedules in their IMO
CREATE POLICY "IMO admins can view IMO schedules"
  ON scheduled_reports
  FOR SELECT
  TO authenticated
  USING (
    imo_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND 'imo_admin' = ANY(roles)
        AND user_profiles.imo_id = scheduled_reports.imo_id
    )
  );

-- Agency owners: can view schedules in their agency
CREATE POLICY "Agency owners can view agency schedules"
  ON scheduled_reports
  FOR SELECT
  TO authenticated
  USING (
    agency_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM agencies
      WHERE id = scheduled_reports.agency_id
        AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- SCHEDULED_REPORT_DELIVERIES POLICIES
-- ============================================================================

-- Super admins: full access to all delivery history
CREATE POLICY "Super admins have full access to deliveries"
  ON scheduled_report_deliveries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND 'super_admin' = ANY(roles)
    )
  );

-- Owners: can view delivery history for their schedules
CREATE POLICY "Users can view delivery history for own schedules"
  ON scheduled_report_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports
      WHERE id = scheduled_report_deliveries.schedule_id
        AND owner_id = auth.uid()
    )
  );

-- IMO admins: can view delivery history for IMO schedules
CREATE POLICY "IMO admins can view IMO delivery history"
  ON scheduled_report_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports sr
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE sr.id = scheduled_report_deliveries.schedule_id
        AND sr.imo_id IS NOT NULL
        AND 'imo_admin' = ANY(up.roles)
        AND up.imo_id = sr.imo_id
    )
  );

-- Agency owners: can view delivery history for agency schedules
CREATE POLICY "Agency owners can view agency delivery history"
  ON scheduled_report_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_reports sr
      JOIN agencies a ON a.id = sr.agency_id
      WHERE sr.id = scheduled_report_deliveries.schedule_id
        AND sr.agency_id IS NOT NULL
        AND a.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- SERVICE ROLE ACCESS (for edge function)
-- ============================================================================
-- Note: Service role bypasses RLS by default, which is needed for the
-- process-scheduled-reports edge function to access all due schedules.

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_reports TO authenticated;
GRANT SELECT ON scheduled_report_deliveries TO authenticated;

-- Service role needs INSERT for creating delivery records
GRANT INSERT, UPDATE ON scheduled_report_deliveries TO service_role;
