-- File: /home/nneessen/projects/commissionTracker/supabase/migrations/20251209_002_automation_workflows.sql
-- Migration for Email Automation Workflows (Phase 4)

-- =====================================================
-- 1. WORKFLOW TABLES
-- =====================================================

-- Main workflow definition table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'email', -- 'email', 'recruiting', 'commission', 'general'
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'
  trigger_type TEXT NOT NULL, -- 'manual', 'schedule', 'event', 'webhook'

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '[]', -- Array of condition objects
  actions JSONB NOT NULL DEFAULT '[]', -- Array of action objects

  -- Execution settings
  max_runs_per_day INTEGER,
  max_runs_per_recipient INTEGER,
  cooldown_minutes INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 50, -- 1-100, higher = more priority

  -- Metadata
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_modified_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT workflows_name_unique UNIQUE (name, created_by)
);

-- Workflow execution history
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_source TEXT, -- What triggered this run
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'

  -- Execution details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Context and results
  context JSONB DEFAULT '{}', -- Runtime variables and context
  actions_executed JSONB DEFAULT '[]', -- Which actions ran
  error_message TEXT,
  error_details JSONB,

  -- Performance metrics
  emails_sent INTEGER DEFAULT 0,
  actions_completed INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow triggers - more detailed than email_triggers
CREATE TABLE IF NOT EXISTS workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'time', 'recruit_phase_change', 'policy_created', 'commission_received', etc.

  -- Trigger configuration based on type
  schedule_config JSONB, -- For time-based triggers (cron expression, timezone)
  event_config JSONB, -- For event-based triggers (event name, filters)
  webhook_config JSONB, -- For webhook triggers (endpoint, auth)

  -- Execution control
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  next_trigger_at TIMESTAMPTZ, -- For scheduled triggers

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow actions - what the workflow does
CREATE TABLE IF NOT EXISTS workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  action_order INTEGER NOT NULL, -- Execution order
  action_type TEXT NOT NULL, -- 'send_email', 'update_field', 'create_task', 'webhook', etc.

  -- Action configuration
  config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '[]', -- Conditions for this specific action

  -- Delays and timing
  delay_minutes INTEGER DEFAULT 0,
  retry_on_failure BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT workflow_actions_unique_order UNIQUE (workflow_id, action_order)
);

-- Workflow templates - pre-built workflows users can copy
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT,

  -- Template definition
  workflow_config JSONB NOT NULL, -- Complete workflow configuration

  -- Visibility
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ENHANCED EMAIL QUEUE (update existing)
-- =====================================================

-- Add workflow tracking to email_queue
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS workflow_action_id UUID REFERENCES workflow_actions(id) ON DELETE SET NULL;

-- =====================================================
-- 3. TRIGGER EVENT TYPES
-- =====================================================

-- Define available trigger types
CREATE TABLE IF NOT EXISTS trigger_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  available_variables JSONB, -- What variables are available for this event
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert standard trigger types
INSERT INTO trigger_event_types (event_name, category, description, available_variables) VALUES
  ('recruit.phase_changed', 'recruiting', 'Triggered when a recruit moves to a new phase',
   '{"recruit_name": "string", "old_phase": "string", "new_phase": "string", "phase_date": "date"}'),

  ('recruit.document_uploaded', 'recruiting', 'Triggered when a recruit uploads a document',
   '{"recruit_name": "string", "document_name": "string", "document_type": "string"}'),

  ('recruit.checklist_completed', 'recruiting', 'Triggered when a recruit completes their checklist',
   '{"recruit_name": "string", "completion_date": "date", "items_completed": "number"}'),

  ('policy.created', 'policies', 'Triggered when a new policy is created',
   '{"policy_number": "string", "client_name": "string", "premium": "number", "carrier": "string"}'),

  ('policy.renewal_upcoming', 'policies', 'Triggered X days before policy renewal',
   '{"policy_number": "string", "client_name": "string", "renewal_date": "date", "days_until": "number"}'),

  ('commission.received', 'commissions', 'Triggered when commission is received',
   '{"amount": "number", "policy_number": "string", "carrier": "string", "month": "string"}'),

  ('commission.chargeback', 'commissions', 'Triggered when a chargeback occurs',
   '{"amount": "number", "policy_number": "string", "reason": "string"}'),

  ('target.milestone_reached', 'targets', 'Triggered when reaching a target milestone',
   '{"target_name": "string", "milestone": "string", "percentage": "number", "amount": "number"}'),

  ('time.daily', 'schedule', 'Triggered daily at specified time',
   '{"current_date": "date", "day_of_week": "string", "month": "string"}'),

  ('time.weekly', 'schedule', 'Triggered weekly on specified day',
   '{"current_date": "date", "week_number": "number", "month": "string"}'),

  ('time.monthly', 'schedule', 'Triggered monthly on specified day',
   '{"current_date": "date", "month": "string", "year": "number"}')
ON CONFLICT (event_name) DO NOTHING;

-- =====================================================
-- 4. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_started ON workflow_runs(started_at);

CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow ON workflow_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_active ON workflow_triggers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_next ON workflow_triggers(next_trigger_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_workflow_actions_workflow ON workflow_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_order ON workflow_actions(workflow_id, action_order);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_event_types ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view own workflows" ON workflows
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create workflows" ON workflows
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own workflows" ON workflows
  FOR DELETE USING (auth.uid() = created_by);

-- Workflow runs policies
CREATE POLICY "Users can view runs for own workflows" ON workflow_runs
  FOR SELECT USING (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

-- Workflow triggers policies
CREATE POLICY "Users can manage triggers for own workflows" ON workflow_triggers
  FOR ALL USING (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

-- Workflow actions policies
CREATE POLICY "Users can manage actions for own workflows" ON workflow_actions
  FOR ALL USING (
    workflow_id IN (SELECT id FROM workflows WHERE created_by = auth.uid())
  );

-- Workflow templates policies
CREATE POLICY "Users can view public templates" ON workflow_templates
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create templates" ON workflow_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" ON workflow_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" ON workflow_templates
  FOR DELETE USING (auth.uid() = created_by);

-- Trigger event types - everyone can view
CREATE POLICY "Everyone can view trigger types" ON trigger_event_types
  FOR SELECT USING (true);

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

-- Function to process workflow triggers
CREATE OR REPLACE FUNCTION process_workflow_trigger(
  p_event_name TEXT,
  p_context JSONB
) RETURNS void AS $$
DECLARE
  v_workflow RECORD;
  v_run_id UUID;
BEGIN
  -- Find active workflows with matching triggers
  FOR v_workflow IN
    SELECT w.*, wt.id as trigger_id
    FROM workflows w
    JOIN workflow_triggers wt ON wt.workflow_id = w.id
    WHERE w.status = 'active'
      AND wt.is_active = true
      AND wt.event_config->>'event_name' = p_event_name
  LOOP
    -- Check conditions
    -- TODO: Implement condition checking logic

    -- Create workflow run
    INSERT INTO workflow_runs (
      workflow_id,
      trigger_source,
      context,
      status
    ) VALUES (
      v_workflow.id,
      p_event_name,
      p_context,
      'running'
    ) RETURNING id INTO v_run_id;

    -- Process workflow actions (would be handled by edge function)
    -- This is just a placeholder
    UPDATE workflow_runs
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_run_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if workflow can run
CREATE OR REPLACE FUNCTION can_workflow_run(
  p_workflow_id UUID,
  p_recipient_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_workflow RECORD;
  v_runs_today INTEGER;
  v_runs_for_recipient INTEGER;
  v_last_run TIMESTAMPTZ;
BEGIN
  -- Get workflow settings
  SELECT * INTO v_workflow
  FROM workflows
  WHERE id = p_workflow_id;

  IF NOT FOUND OR v_workflow.status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check daily limit
  IF v_workflow.max_runs_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_runs_today
    FROM workflow_runs
    WHERE workflow_id = p_workflow_id
      AND started_at >= CURRENT_DATE;

    IF v_runs_today >= v_workflow.max_runs_per_day THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check per-recipient limit
  IF p_recipient_id IS NOT NULL AND v_workflow.max_runs_per_recipient IS NOT NULL THEN
    SELECT COUNT(*) INTO v_runs_for_recipient
    FROM workflow_runs
    WHERE workflow_id = p_workflow_id
      AND context->>'recipient_id' = p_recipient_id::TEXT;

    IF v_runs_for_recipient >= v_workflow.max_runs_per_recipient THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check cooldown
  IF v_workflow.cooldown_minutes > 0 THEN
    SELECT MAX(started_at) INTO v_last_run
    FROM workflow_runs
    WHERE workflow_id = p_workflow_id
      AND status = 'completed';

    IF v_last_run IS NOT NULL AND
       v_last_run + (v_workflow.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update timestamps
CREATE TRIGGER trigger_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_workflow_triggers_updated_at
  BEFORE UPDATE ON workflow_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_workflow_actions_updated_at
  BEFORE UPDATE ON workflow_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 8. SAMPLE WORKFLOW TEMPLATES
-- =====================================================

-- Welcome sequence template
INSERT INTO workflow_templates (
  name,
  category,
  description,
  is_public,
  is_featured,
  workflow_config
) VALUES (
  'New Recruit Welcome Sequence',
  'recruiting',
  'Automated 7-day welcome email sequence for new recruits',
  true,
  true,
  '{
    "name": "New Recruit Welcome",
    "trigger_type": "event",
    "triggers": [{
      "type": "recruit.phase_changed",
      "conditions": [{"field": "new_phase", "operator": "equals", "value": "Application Review"}]
    }],
    "actions": [
      {
        "type": "send_email",
        "template": "welcome_recruit",
        "delay_minutes": 0
      },
      {
        "type": "send_email",
        "template": "getting_started",
        "delay_minutes": 1440
      },
      {
        "type": "send_email",
        "template": "next_steps",
        "delay_minutes": 4320
      }
    ]
  }'
) ON CONFLICT DO NOTHING;

-- Policy renewal reminder template
INSERT INTO workflow_templates (
  name,
  category,
  description,
  is_public,
  is_featured,
  workflow_config
) VALUES (
  'Policy Renewal Reminders',
  'policies',
  'Send renewal reminders 30, 15, and 7 days before policy expires',
  true,
  true,
  '{
    "name": "Renewal Reminders",
    "trigger_type": "event",
    "triggers": [{
      "type": "policy.renewal_upcoming",
      "conditions": [{"field": "days_until", "operator": "in", "value": [30, 15, 7]}]
    }],
    "actions": [
      {
        "type": "send_email",
        "template": "renewal_reminder",
        "variables": {
          "days_remaining": "{{days_until}}",
          "policy_number": "{{policy_number}}",
          "client_name": "{{client_name}}"
        }
      }
    ]
  }'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE workflows IS 'Main workflow definitions for automation';
COMMENT ON TABLE workflow_runs IS 'Execution history for workflows';
COMMENT ON TABLE workflow_triggers IS 'Trigger configurations for workflows';
COMMENT ON TABLE workflow_actions IS 'Actions to execute in workflows';
COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates';
COMMENT ON TABLE trigger_event_types IS 'Available event types for triggers';