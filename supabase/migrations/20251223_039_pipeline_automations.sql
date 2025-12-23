-- supabase/migrations/20251223_039_pipeline_automations.sql
-- Pipeline automation communications system

-- Automation trigger types
CREATE TYPE pipeline_automation_trigger AS ENUM (
  'phase_enter',              -- When recruit enters a phase
  'phase_complete',           -- When recruit completes a phase
  'phase_stall',              -- When recruit is stuck in phase for X days
  'item_complete',            -- When checklist item is completed
  'item_approval_needed',     -- When item needs upline approval
  'item_deadline_approaching' -- X days before item deadline
);

-- Recipient types
CREATE TYPE automation_recipient_type AS ENUM (
  'recruit',              -- The recruit themselves
  'upline',               -- The recruit's upline/recruiter
  'trainer',              -- Assigned trainer from key_contacts
  'contracting_manager',  -- Contracting manager from key_contacts
  'custom_email'          -- Custom email address(es)
);

-- Communication type
CREATE TYPE automation_communication_type AS ENUM (
  'email',
  'notification',
  'both'
);

-- Main automations table
CREATE TABLE pipeline_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to phase OR checklist item (one must be set)
  phase_id UUID REFERENCES pipeline_phases(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES phase_checklist_items(id) ON DELETE CASCADE,

  -- Configuration
  trigger_type pipeline_automation_trigger NOT NULL,
  communication_type automation_communication_type DEFAULT 'both',

  -- Timing (for stall/deadline triggers)
  delay_days INTEGER, -- Days after trigger condition before sending

  -- Recipients (JSONB array of recipient configs)
  -- Example: [{"type": "recruit"}, {"type": "upline"}, {"type": "custom_email", "emails": ["manager@example.com"]}]
  recipients JSONB NOT NULL DEFAULT '[]',

  -- Email content
  email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  email_subject TEXT,
  email_body_html TEXT,

  -- Notification content
  notification_title TEXT,
  notification_message TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints: must have exactly one target (phase OR checklist item)
  CONSTRAINT automation_target_check CHECK (
    (phase_id IS NOT NULL AND checklist_item_id IS NULL) OR
    (phase_id IS NULL AND checklist_item_id IS NOT NULL)
  ),

  -- Ensure trigger type matches target type
  CONSTRAINT trigger_type_target_check CHECK (
    (trigger_type IN ('phase_enter', 'phase_complete', 'phase_stall') AND phase_id IS NOT NULL) OR
    (trigger_type IN ('item_complete', 'item_approval_needed', 'item_deadline_approaching') AND checklist_item_id IS NOT NULL)
  )
);

-- Indexes for efficient lookups
CREATE INDEX idx_pipeline_automations_phase_id ON pipeline_automations(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_pipeline_automations_checklist_item_id ON pipeline_automations(checklist_item_id) WHERE checklist_item_id IS NOT NULL;
CREATE INDEX idx_pipeline_automations_trigger_type ON pipeline_automations(trigger_type);
CREATE INDEX idx_pipeline_automations_active ON pipeline_automations(is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER update_pipeline_automations_updated_at
  BEFORE UPDATE ON pipeline_automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Execution log table (for tracking and preventing duplicates)
CREATE TABLE pipeline_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES pipeline_automations(id) ON DELETE CASCADE,
  recruit_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  -- Computed column for deduplication (stores date in UTC)
  triggered_date DATE GENERATED ALWAYS AS ((triggered_at AT TIME ZONE 'UTC')::date) STORED,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  metadata JSONB -- Store sent email/notification IDs, context data
);

-- Unique index on computed column for daily deduplication
CREATE UNIQUE INDEX unique_daily_automation
  ON pipeline_automation_logs(automation_id, recruit_id, triggered_date);

-- Indexes for log lookups
CREATE INDEX idx_automation_logs_automation_id ON pipeline_automation_logs(automation_id);
CREATE INDEX idx_automation_logs_recruit_id ON pipeline_automation_logs(recruit_id);
CREATE INDEX idx_automation_logs_status ON pipeline_automation_logs(status);
CREATE INDEX idx_automation_logs_triggered_at ON pipeline_automation_logs(triggered_at);

-- Comments for documentation
COMMENT ON TABLE pipeline_automations IS 'Stores automation rules for pipeline phase and checklist item events';
COMMENT ON TABLE pipeline_automation_logs IS 'Tracks execution of automations for auditing and duplicate prevention';
COMMENT ON COLUMN pipeline_automations.recipients IS 'JSONB array of recipient configs. Example: [{"type": "recruit"}, {"type": "custom_email", "emails": ["a@b.com"]}]';
COMMENT ON COLUMN pipeline_automations.delay_days IS 'For stall/deadline triggers: number of days before/after to send';
