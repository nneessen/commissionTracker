-- Fix Workflow Automation System: RLS Policies and Missing Tables
-- This migration adds comprehensive RLS policies for all workflow-related tables
-- and creates the email_queue table needed by the process-workflow Edge Function

-- ============================================================================
-- PART 1: Create missing email_queue table
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  variables JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status IN ('pending', 'sending');
CREATE INDEX IF NOT EXISTS idx_email_queue_recipient ON email_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at DESC);

-- ============================================================================
-- PART 2: Enable RLS on all workflow tables
-- ============================================================================
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Helper function to check if user has workflow permissions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_manage_workflows(user_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_roles TEXT[];
  has_permission BOOLEAN;
BEGIN
  -- Get user roles
  SELECT roles INTO user_roles
  FROM user_profiles
  WHERE id = user_id_param;

  -- Check if user has admin, trainer, or manager role
  has_permission := user_roles && ARRAY['admin', 'trainer', 'manager']::TEXT[];

  RETURN COALESCE(has_permission, FALSE);
END;
$$;

-- ============================================================================
-- PART 4: RLS Policies for workflows table
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workflows they created" ON workflows;
DROP POLICY IF EXISTS "Admins/trainers can view all workflows" ON workflows;
DROP POLICY IF EXISTS "Users can create workflows if they have permission" ON workflows;
DROP POLICY IF EXISTS "Users can update their own workflows" ON workflows;
DROP POLICY IF EXISTS "Admins/trainers can update all workflows" ON workflows;
DROP POLICY IF EXISTS "Users can delete their own workflows" ON workflows;
DROP POLICY IF EXISTS "Admins/trainers can delete all workflows" ON workflows;

-- SELECT policies
CREATE POLICY "Users can view workflows they created"
  ON workflows FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins/trainers can view all workflows"
  ON workflows FOR SELECT
  USING (can_manage_workflows(auth.uid()));

-- INSERT policies
CREATE POLICY "Users can create workflows if they have permission"
  ON workflows FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    can_manage_workflows(auth.uid())
  );

-- UPDATE policies
CREATE POLICY "Users can update their own workflows"
  ON workflows FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins/trainers can update all workflows"
  ON workflows FOR UPDATE
  USING (can_manage_workflows(auth.uid()))
  WITH CHECK (can_manage_workflows(auth.uid()));

-- DELETE policies
CREATE POLICY "Users can delete their own workflows"
  ON workflows FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Admins/trainers can delete all workflows"
  ON workflows FOR DELETE
  USING (can_manage_workflows(auth.uid()));

-- ============================================================================
-- PART 5: RLS Policies for workflow_runs table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view runs for their workflows" ON workflow_runs;
DROP POLICY IF EXISTS "Admins/trainers can view all workflow runs" ON workflow_runs;
DROP POLICY IF EXISTS "System can create workflow runs" ON workflow_runs;
DROP POLICY IF EXISTS "System can update workflow runs" ON workflow_runs;

-- SELECT policies
CREATE POLICY "Users can view runs for their workflows"
  ON workflow_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_runs.workflow_id
      AND workflows.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins/trainers can view all workflow runs"
  ON workflow_runs FOR SELECT
  USING (can_manage_workflows(auth.uid()));

-- INSERT policies (allow service role and workflow creators)
CREATE POLICY "System can create workflow runs"
  ON workflow_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_runs.workflow_id
      AND workflows.created_by = auth.uid()
    )
    OR can_manage_workflows(auth.uid())
  );

-- UPDATE policies (allow service role to update run status)
CREATE POLICY "System can update workflow runs"
  ON workflow_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_runs.workflow_id
      AND workflows.created_by = auth.uid()
    )
    OR can_manage_workflows(auth.uid())
  );

-- ============================================================================
-- PART 6: RLS Policies for workflow_actions table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view actions for their workflows" ON workflow_actions;
DROP POLICY IF EXISTS "Admins/trainers can view all workflow actions" ON workflow_actions;
DROP POLICY IF EXISTS "Users can manage actions for their workflows" ON workflow_actions;
DROP POLICY IF EXISTS "Admins/trainers can manage all workflow actions" ON workflow_actions;

-- SELECT policies
CREATE POLICY "Users can view actions for their workflows"
  ON workflow_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_actions.workflow_id
      AND workflows.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins/trainers can view all workflow actions"
  ON workflow_actions FOR SELECT
  USING (can_manage_workflows(auth.uid()));

-- INSERT/UPDATE/DELETE policies
CREATE POLICY "Users can manage actions for their workflows"
  ON workflow_actions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_actions.workflow_id
      AND workflows.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins/trainers can manage all workflow actions"
  ON workflow_actions FOR ALL
  USING (can_manage_workflows(auth.uid()));

-- ============================================================================
-- PART 7: RLS Policies for trigger_event_types table
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can view trigger event types" ON trigger_event_types;
DROP POLICY IF EXISTS "Only admins can manage trigger event types" ON trigger_event_types;

-- SELECT policies (read-only for all authenticated users)
CREATE POLICY "Anyone authenticated can view trigger event types"
  ON trigger_event_types FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE policies (only admins)
CREATE POLICY "Only admins can manage trigger event types"
  ON trigger_event_types FOR ALL
  USING (can_manage_workflows(auth.uid()))
  WITH CHECK (can_manage_workflows(auth.uid()));

-- ============================================================================
-- PART 8: RLS Policies for email_queue table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their queued emails" ON email_queue;
DROP POLICY IF EXISTS "Admins can view all queued emails" ON email_queue;
DROP POLICY IF EXISTS "System can manage email queue" ON email_queue;

-- SELECT policies
CREATE POLICY "Users can view their queued emails"
  ON email_queue FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Admins can view all queued emails"
  ON email_queue FOR SELECT
  USING (can_manage_workflows(auth.uid()));

-- INSERT/UPDATE/DELETE policies (service role + workflow execution)
CREATE POLICY "System can manage email queue"
  ON email_queue FOR ALL
  USING (can_manage_workflows(auth.uid()))
  WITH CHECK (can_manage_workflows(auth.uid()));

-- ============================================================================
-- PART 9: Grant necessary permissions
-- ============================================================================

-- Grant authenticated users access to workflow tables
GRANT SELECT ON workflows TO authenticated;
GRANT SELECT ON workflow_runs TO authenticated;
GRANT SELECT ON workflow_actions TO authenticated;
GRANT SELECT ON trigger_event_types TO authenticated;
GRANT SELECT ON email_queue TO authenticated;

-- Grant insert/update/delete based on RLS policies
GRANT INSERT, UPDATE, DELETE ON workflows TO authenticated;
GRANT INSERT, UPDATE ON workflow_runs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON workflow_actions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON email_queue TO authenticated;

-- Grant service_role full access (for Edge Functions)
GRANT ALL ON workflows TO service_role;
GRANT ALL ON workflow_runs TO service_role;
GRANT ALL ON workflow_actions TO service_role;
GRANT ALL ON trigger_event_types TO service_role;
GRANT ALL ON email_queue TO service_role;

-- ============================================================================
-- PART 10: Add updated_at trigger for email_queue
-- ============================================================================

CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_queue_updated_at ON email_queue;
CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- ============================================================================
-- Verification Queries (run these manually to verify setup)
-- ============================================================================

-- Check that RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename IN ('workflows', 'workflow_runs', 'workflow_actions', 'trigger_event_types', 'email_queue');

-- Check policies exist
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('workflows', 'workflow_runs', 'workflow_actions', 'trigger_event_types', 'email_queue')
-- ORDER BY tablename, policyname;
