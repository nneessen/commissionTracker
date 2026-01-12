-- File: /home/nneessen/projects/commissionTracker/supabase/migrations/20251212_003_complete_workflow_tables.sql
-- Complete workflow system tables with all required infrastructure

-- Create trigger_event_types table for dynamic event management
CREATE TABLE IF NOT EXISTS trigger_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  available_variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflows table if not exists
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'schedule', 'event', 'webhook')),
  config JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  category TEXT,
  priority INTEGER DEFAULT 0,
  cooldown_minutes INTEGER,
  max_runs_per_day INTEGER,
  max_runs_per_recipient INTEGER,
  created_by UUID REFERENCES user_profiles(id),
  last_modified_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow_runs table for tracking executions
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_source TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  context JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trigger_event_types_active ON trigger_event_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trigger_event_types_category ON trigger_event_types(category);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);

-- Seed default event types
INSERT INTO trigger_event_types (event_name, category, description, available_variables) VALUES
  -- Recruit events
  ('recruit.created', 'recruit', 'Triggered when a new recruit is created',
    '{"recruitId": "UUID", "recruitName": "string", "recruitEmail": "string", "pipelineId": "UUID"}'::jsonb),
  ('recruit.phase_changed', 'recruit', 'Triggered when recruit moves to a new phase',
    '{"recruitId": "UUID", "oldPhase": "string", "newPhase": "string", "phaseName": "string"}'::jsonb),
  ('recruit.graduated_to_agent', 'recruit', 'Triggered when recruit graduates to agent',
    '{"recruitId": "UUID", "agentId": "UUID", "recruitName": "string", "graduationDate": "date"}'::jsonb),
  ('recruit.dropped_out', 'recruit', 'Triggered when recruit is marked as dropped out',
    '{"recruitId": "UUID", "recruitName": "string", "dropReason": "string"}'::jsonb),

  -- Policy events
  ('policy.created', 'policy', 'Triggered when a new policy is created',
    '{"policyId": "UUID", "policyNumber": "string", "clientName": "string", "premium": "number"}'::jsonb),
  ('policy.approved', 'policy', 'Triggered when a policy is approved',
    '{"policyId": "UUID", "policyNumber": "string", "approvedBy": "UUID", "approvalDate": "date"}'::jsonb),
  ('policy.cancelled', 'policy', 'Triggered when a policy is cancelled',
    '{"policyId": "UUID", "policyNumber": "string", "cancellationDate": "date", "reason": "string"}'::jsonb),
  ('policy.renewed', 'policy', 'Triggered when a policy is renewed',
    '{"policyId": "UUID", "policyNumber": "string", "renewalDate": "date", "newPremium": "number"}'::jsonb),

  -- Commission events
  ('commission.earned', 'commission', 'Triggered when commission is earned',
    '{"commissionId": "UUID", "agentId": "UUID", "amount": "number", "policyId": "UUID"}'::jsonb),
  ('commission.paid', 'commission', 'Triggered when commission is paid out',
    '{"commissionId": "UUID", "agentId": "UUID", "amount": "number", "paymentDate": "date"}'::jsonb),
  ('commission.chargeback', 'commission', 'Triggered when a chargeback occurs',
    '{"chargebackId": "UUID", "originalCommissionId": "UUID", "amount": "number", "reason": "string"}'::jsonb),

  -- User events
  ('user.login', 'user', 'Triggered when user logs in',
    '{"userId": "UUID", "userEmail": "string", "loginTime": "timestamp"}'::jsonb),
  ('user.role_changed', 'user', 'Triggered when user role is changed',
    '{"userId": "UUID", "oldRole": "string", "newRole": "string", "changedBy": "UUID"}'::jsonb),

  -- Email events
  ('email.sent', 'email', 'Triggered when an email is successfully sent',
    '{"emailId": "UUID", "recipient": "string", "subject": "string", "templateId": "UUID"}'::jsonb),
  ('email.failed', 'email', 'Triggered when email sending fails',
    '{"emailId": "UUID", "recipient": "string", "error": "string", "retryCount": "number"}'::jsonb)
ON CONFLICT (event_name) DO UPDATE SET
  description = EXCLUDED.description,
  available_variables = EXCLUDED.available_variables,
  is_active = EXCLUDED.is_active;

-- Enable RLS
ALTER TABLE trigger_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trigger_event_types (read-only for users, full access for admins)
CREATE POLICY "Users can view active event types"
  ON trigger_event_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage event types"
  ON trigger_event_types FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- RLS Policies for workflows (users manage own, admins see all)
CREATE POLICY "Users can view their workflows"
  ON workflows FOR SELECT
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Users can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their workflows"
  ON workflows FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their workflows"
  ON workflows FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for workflow_runs (view own runs)
CREATE POLICY "Users can view runs of their workflows"
  ON workflow_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflows
    WHERE workflows.id = workflow_runs.workflow_id
    AND workflows.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Grant permissions
GRANT ALL ON trigger_event_types TO authenticated;
GRANT ALL ON workflows TO authenticated;
GRANT ALL ON workflow_runs TO authenticated;

-- Comments
COMMENT ON TABLE trigger_event_types IS 'Dynamic event type registry for workflow triggers';
COMMENT ON TABLE workflows IS 'Workflow definitions for automation';
COMMENT ON TABLE workflow_runs IS 'Execution history of workflows';