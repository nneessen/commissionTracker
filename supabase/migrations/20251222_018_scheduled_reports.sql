-- Migration: Scheduled Reports Infrastructure
-- Phase 9: Report Export Enhancement
-- Creates tables for scheduled report delivery system

-- 1. Create frequency enum for report scheduling
CREATE TYPE report_frequency AS ENUM ('weekly', 'monthly', 'quarterly');

-- 2. Create scheduled_reports table
-- Stores configuration for automated report delivery
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Org scoping (determines visibility and recipient validation)
  imo_id UUID REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Report configuration
  report_type TEXT NOT NULL CHECK (report_type IN (
    'imo-performance',
    'agency-performance',
    'team-comparison',
    'top-performers',
    'recruiting-summary',
    'override-summary',
    'executive-dashboard',
    'commission-performance',
    'policy-performance',
    'client-relationship',
    'financial-health'
  )),

  -- Report settings (date range mode, filters, etc.)
  report_config JSONB NOT NULL DEFAULT '{
    "dateRangeMode": "trailing",
    "trailingMonths": 12
  }',

  -- Schedule name for display
  schedule_name TEXT NOT NULL,

  -- Schedule frequency
  frequency report_frequency NOT NULL,
  day_of_week SMALLINT CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  day_of_month SMALLINT CHECK (day_of_month >= 1 AND day_of_month <= 28), -- 1-28 to avoid month-end issues
  preferred_time TIME NOT NULL DEFAULT '08:00:00', -- Delivery time in UTC

  -- Recipients (validated to be org members)
  recipients JSONB NOT NULL DEFAULT '[]', -- Array of {user_id, email, name}

  -- Export format
  export_format TEXT NOT NULL DEFAULT 'pdf' CHECK (export_format IN ('pdf', 'csv')),

  -- Include sections (for PDF exports)
  include_charts BOOLEAN NOT NULL DEFAULT true,
  include_insights BOOLEAN NOT NULL DEFAULT true,
  include_summary BOOLEAN NOT NULL DEFAULT true,

  -- State management
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_delivery TIMESTAMPTZ NOT NULL,
  last_delivery TIMESTAMPTZ,
  consecutive_failures SMALLINT NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_weekly_schedule CHECK (
    frequency != 'weekly' OR day_of_week IS NOT NULL
  ),
  CONSTRAINT valid_monthly_schedule CHECK (
    frequency != 'monthly' OR day_of_month IS NOT NULL
  ),
  CONSTRAINT valid_quarterly_schedule CHECK (
    frequency != 'quarterly' OR day_of_month IS NOT NULL
  ),
  CONSTRAINT valid_org_scope CHECK (
    (imo_id IS NOT NULL) OR (agency_id IS NOT NULL)
  )
);

-- 3. Create scheduled_report_deliveries table
-- Logs delivery history for audit and debugging
CREATE TABLE scheduled_report_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,

  -- Delivery details
  delivered_at TIMESTAMPTZ,
  recipients_sent JSONB NOT NULL DEFAULT '[]', -- Snapshot of recipients at time of send

  -- Report period covered
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,

  -- Email tracking
  mailgun_message_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create indexes for efficient queries
CREATE INDEX idx_scheduled_reports_owner ON scheduled_reports(owner_id);
CREATE INDEX idx_scheduled_reports_imo ON scheduled_reports(imo_id) WHERE imo_id IS NOT NULL;
CREATE INDEX idx_scheduled_reports_agency ON scheduled_reports(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX idx_scheduled_reports_next_delivery ON scheduled_reports(next_delivery) WHERE is_active = true;
CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active, next_delivery);

CREATE INDEX idx_deliveries_schedule ON scheduled_report_deliveries(schedule_id);
CREATE INDEX idx_deliveries_status ON scheduled_report_deliveries(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_deliveries_created ON scheduled_report_deliveries(created_at DESC);

-- 5. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_scheduled_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_reports_updated_at();

-- 6. Add comments for documentation
COMMENT ON TABLE scheduled_reports IS 'Configuration for automated report delivery schedules';
COMMENT ON TABLE scheduled_report_deliveries IS 'Audit log of scheduled report deliveries';

COMMENT ON COLUMN scheduled_reports.report_type IS 'Type of report to generate (must match supported report types)';
COMMENT ON COLUMN scheduled_reports.report_config IS 'JSON config for report generation (date range mode, filters)';
COMMENT ON COLUMN scheduled_reports.frequency IS 'Delivery frequency: weekly, monthly, or quarterly';
COMMENT ON COLUMN scheduled_reports.day_of_week IS 'For weekly: 0=Sunday through 6=Saturday';
COMMENT ON COLUMN scheduled_reports.day_of_month IS 'For monthly/quarterly: 1-28 to avoid month-end edge cases';
COMMENT ON COLUMN scheduled_reports.recipients IS 'Array of {user_id, email, name} - must be org members';
COMMENT ON COLUMN scheduled_reports.consecutive_failures IS 'Counter for consecutive delivery failures (auto-disable after 3)';

COMMENT ON COLUMN scheduled_report_deliveries.recipients_sent IS 'Snapshot of recipients at delivery time for audit';
COMMENT ON COLUMN scheduled_report_deliveries.mailgun_message_id IS 'Mailgun message ID for delivery tracking';
