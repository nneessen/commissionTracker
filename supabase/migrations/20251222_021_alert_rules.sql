-- Migration: Alert Rules Infrastructure
-- Phase 10: Notifications & Alerts System
-- Creates tables for configurable alert thresholds and evaluation tracking

-- 1. Create enum for alert metrics
CREATE TYPE alert_metric AS ENUM (
  'policy_lapse_warning',      -- Policy approaching lapse date
  'target_miss_risk',          -- Pacing behind production target
  'commission_threshold',      -- Commission below threshold
  'new_policy_count',          -- New policies below expected count
  'recruit_stall',             -- Recruit stuck in onboarding phase
  'override_change',           -- Override commission amount changed
  'team_production_drop',      -- Team production decreased
  'persistency_warning',       -- Persistency rate below threshold
  'license_expiration'         -- License approaching expiration
);

-- 2. Create enum for comparison operators
CREATE TYPE alert_comparison AS ENUM (
  'lt',   -- less than
  'lte',  -- less than or equal
  'gt',   -- greater than
  'gte',  -- greater than or equal
  'eq'    -- equal
);

-- 3. Create alert_rules table
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Org scoping (determines visibility and who the rule applies to)
  imo_id UUID REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Rule definition
  name TEXT NOT NULL,
  description TEXT,
  metric alert_metric NOT NULL,
  comparison alert_comparison NOT NULL,
  threshold_value NUMERIC NOT NULL CHECK (threshold_value >= 0),
  threshold_unit TEXT, -- 'days', 'percent', 'count', 'currency'

  -- Scope filters - who this alert applies to
  applies_to_self BOOLEAN NOT NULL DEFAULT true,
  applies_to_downlines BOOLEAN NOT NULL DEFAULT false,
  applies_to_team BOOLEAN NOT NULL DEFAULT false, -- All in IMO/Agency

  -- Notification settings
  notify_in_app BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT false,
  cooldown_hours INTEGER NOT NULL DEFAULT 24 CHECK (cooldown_hours >= 1),

  -- State management
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  consecutive_triggers INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At least one org scope must be set
  CONSTRAINT valid_org_scope CHECK (
    imo_id IS NOT NULL OR agency_id IS NOT NULL
  ),
  -- At least one notification method enabled
  CONSTRAINT valid_notification_method CHECK (
    notify_in_app = true OR notify_email = true
  ),
  -- At least one scope target enabled
  CONSTRAINT valid_scope_target CHECK (
    applies_to_self = true OR applies_to_downlines = true OR applies_to_team = true
  )
);

-- 4. Create alert_rule_evaluations table for audit log
CREATE TABLE alert_rule_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,

  -- Evaluation result
  triggered BOOLEAN NOT NULL,
  current_value NUMERIC,
  threshold_value NUMERIC NOT NULL,
  comparison alert_comparison NOT NULL,

  -- Context about what triggered (if any)
  affected_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  affected_entity_type TEXT, -- 'policy', 'recruit', 'commission', 'target'
  affected_entity_id UUID,

  -- Notification created (if triggered)
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,

  -- Evaluation metadata
  evaluation_context JSONB DEFAULT '{}',
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create indexes for efficient queries
CREATE INDEX idx_alert_rules_owner ON alert_rules(owner_id);
CREATE INDEX idx_alert_rules_imo ON alert_rules(imo_id) WHERE imo_id IS NOT NULL;
CREATE INDEX idx_alert_rules_agency ON alert_rules(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_alert_rules_metric ON alert_rules(metric);
CREATE INDEX idx_alert_rules_last_triggered ON alert_rules(last_triggered_at)
  WHERE is_active = true;

CREATE INDEX idx_evaluations_rule ON alert_rule_evaluations(rule_id);
CREATE INDEX idx_evaluations_triggered ON alert_rule_evaluations(triggered, evaluated_at DESC)
  WHERE triggered = true;
CREATE INDEX idx_evaluations_user ON alert_rule_evaluations(affected_user_id)
  WHERE affected_user_id IS NOT NULL;
CREATE INDEX idx_evaluations_date ON alert_rule_evaluations(evaluated_at DESC);

-- 6. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_rules_updated_at();

-- 7. Add new notification types to support alerts
-- First check if the type column allows these values
COMMENT ON TABLE alert_rules IS 'Configurable alert rules for monitoring business metrics';
COMMENT ON TABLE alert_rule_evaluations IS 'Audit log of alert rule evaluations';

COMMENT ON COLUMN alert_rules.metric IS 'The business metric to monitor';
COMMENT ON COLUMN alert_rules.comparison IS 'How to compare current value to threshold';
COMMENT ON COLUMN alert_rules.threshold_value IS 'The threshold value for comparison';
COMMENT ON COLUMN alert_rules.threshold_unit IS 'Unit of the threshold (days, percent, count, currency)';
COMMENT ON COLUMN alert_rules.applies_to_self IS 'Alert applies to the rule owner';
COMMENT ON COLUMN alert_rules.applies_to_downlines IS 'Alert applies to owner downlines';
COMMENT ON COLUMN alert_rules.applies_to_team IS 'Alert applies to all in IMO/Agency';
COMMENT ON COLUMN alert_rules.cooldown_hours IS 'Minimum hours between repeat alerts for same condition';
COMMENT ON COLUMN alert_rules.consecutive_triggers IS 'Count of consecutive evaluations that triggered';

-- 8. Create table for tracking notification digest sends
CREATE TABLE notification_digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Digest details
  notification_count INTEGER NOT NULL,
  notification_ids UUID[] NOT NULL,

  -- Email tracking
  email_sent_to TEXT NOT NULL,
  email_message_id TEXT, -- From email provider

  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,

  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_digest_log_user ON notification_digest_log(user_id);
CREATE INDEX idx_digest_log_sent ON notification_digest_log(sent_at DESC);

COMMENT ON TABLE notification_digest_log IS 'Tracks email digest deliveries for notifications';

-- 9. Add last_digest_sent_at to notification_preferences if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
    AND column_name = 'last_digest_sent_at'
  ) THEN
    ALTER TABLE notification_preferences
    ADD COLUMN last_digest_sent_at TIMESTAMPTZ;
  END IF;
END $$;
