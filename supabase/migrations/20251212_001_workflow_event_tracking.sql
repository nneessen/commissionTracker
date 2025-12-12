-- File: /home/nneessen/projects/commissionTracker/supabase/migrations/20251212_001_workflow_event_tracking.sql
-- Migration: Add workflow event tracking infrastructure

-- Create table to track workflow event occurrences
CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  fired_at TIMESTAMPTZ DEFAULT NOW(),
  workflows_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX idx_workflow_events_event_name ON workflow_events(event_name);
CREATE INDEX idx_workflow_events_fired_at ON workflow_events(fired_at DESC);
CREATE INDEX idx_workflow_events_context_user ON workflow_events((context->>'userId')) WHERE context->>'userId' IS NOT NULL;
CREATE INDEX idx_workflow_events_context_recruit ON workflow_events((context->>'recruitId')) WHERE context->>'recruitId' IS NOT NULL;
CREATE INDEX idx_workflow_events_context_policy ON workflow_events((context->>'policyId')) WHERE context->>'policyId' IS NOT NULL;

-- Add index on workflows table for efficient event trigger lookups
CREATE INDEX IF NOT EXISTS idx_workflows_event_trigger
ON workflows((config->'trigger'->>'eventName'))
WHERE status = 'active' AND trigger_type = 'event';

-- Add index for workflow runs by trigger source
CREATE INDEX IF NOT EXISTS idx_workflow_runs_trigger_source
ON workflow_runs(trigger_source)
WHERE trigger_source LIKE 'event:%';

-- Add comments for documentation
COMMENT ON TABLE workflow_events IS 'Tracks all workflow event occurrences for audit and debugging';
COMMENT ON COLUMN workflow_events.event_name IS 'The name of the event that was fired (e.g., recruit.graduated_to_agent)';
COMMENT ON COLUMN workflow_events.context IS 'JSON context data associated with the event';
COMMENT ON COLUMN workflow_events.fired_at IS 'When the event was fired';
COMMENT ON COLUMN workflow_events.workflows_triggered IS 'Number of workflows triggered by this event';

-- Add RLS policies for workflow_events
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all workflow events (for debugging)
CREATE POLICY "Users can view workflow events" ON workflow_events
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: System can insert workflow events
CREATE POLICY "System can insert workflow events" ON workflow_events
  FOR INSERT
  WITH CHECK (true);

-- Function to clean up old workflow events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_workflow_events()
RETURNS void AS $$
BEGIN
  DELETE FROM workflow_events
  WHERE fired_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run daily at 3 AM
SELECT cron.schedule(
  'cleanup-workflow-events',
  '0 3 * * *',
  $$SELECT cleanup_old_workflow_events()$$
);

-- Grant necessary permissions
GRANT SELECT ON workflow_events TO authenticated;
GRANT INSERT ON workflow_events TO service_role;