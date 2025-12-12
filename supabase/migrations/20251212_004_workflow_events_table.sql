-- File: /home/nneessen/projects/commissionTracker/supabase/migrations/20251212_004_workflow_events_table.sql
-- Create workflow_events table for tracking all workflow-related events

-- Create workflow_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  fired_at TIMESTAMPTZ DEFAULT NOW(),
  workflows_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add error column to workflow_runs if it doesn't exist
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS error TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workflow_events_event_name ON workflow_events(event_name);
CREATE INDEX IF NOT EXISTS idx_workflow_events_fired_at ON workflow_events(fired_at DESC);

-- Enable RLS
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_events
CREATE POLICY "Users can view workflow events"
  ON workflow_events FOR SELECT
  USING (
    -- Users can see events related to their workflows
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.created_by = auth.uid()
    )
    OR
    -- Admins can see all events
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow authenticated users to insert events (for event emitter)
CREATE POLICY "Authenticated users can create workflow events"
  ON workflow_events FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON workflow_events TO authenticated;

-- Comments
COMMENT ON TABLE workflow_events IS 'Audit log of all workflow events fired in the system';
COMMENT ON COLUMN workflow_events.event_name IS 'Name of the event (e.g., recruit.created)';
COMMENT ON COLUMN workflow_events.context IS 'Event context data passed to workflows';
COMMENT ON COLUMN workflow_events.fired_at IS 'When the event was fired';
COMMENT ON COLUMN workflow_events.workflows_triggered IS 'Number of workflows triggered by this event';