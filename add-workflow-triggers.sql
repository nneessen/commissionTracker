-- Add Database Triggers for Event-Driven Workflows
-- This migration creates database triggers that automatically execute workflows
-- when relevant events occur in the system

-- ============================================================================
-- PART 1: Helper function to trigger workflows based on event
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_workflows_for_event(
  event_name_param TEXT,
  context_data JSONB
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  workflow_record RECORD;
  run_id UUID;
BEGIN
  -- Find all active workflows that match this event
  FOR workflow_record IN
    SELECT *
    FROM workflows
    WHERE trigger_type = 'event'
    AND status = 'active'
    AND config->>'eventName' = event_name_param
  LOOP
    -- Create a workflow run
    INSERT INTO workflow_runs (
      workflow_id,
      status,
      context,
      started_at
    )
    VALUES (
      workflow_record.id,
      'pending',
      context_data,
      now()
    )
    RETURNING id INTO run_id;

    -- Invoke the Edge Function asynchronously (via pg_net or queue)
    -- For now, we'll rely on a separate process to pick up 'pending' runs
    -- In production, you could use pg_net extension or Supabase Realtime

    RAISE NOTICE 'Created workflow run % for workflow % (event: %)',
      run_id, workflow_record.id, event_name_param;
  END LOOP;
END;
$$;

-- ============================================================================
-- PART 2: Policy Event Triggers
-- ============================================================================

-- Trigger when a new policy is created
CREATE OR REPLACE FUNCTION public.on_policy_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM trigger_workflows_for_event(
    'policy.created',
    jsonb_build_object(
      'policyId', NEW.id,
      'policyNumber', NEW.policy_number,
      'clientId', NEW.client_id,
      'productType', NEW.product_type,
      'premium', NEW.premium,
      'effectiveDate', NEW.effective_date,
      'userId', NEW.user_id,
      'recipientId', NEW.user_id,
      'targetTable', 'policies',
      'targetId', NEW.id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_workflow_on_policy_created ON policies;
CREATE TRIGGER trigger_workflow_on_policy_created
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION on_policy_created();

-- ============================================================================
-- PART 3: Commission Event Triggers
-- ============================================================================

-- Trigger when commission is received (status changes to 'received')
CREATE OR REPLACE FUNCTION public.on_commission_received()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    PERFORM trigger_workflows_for_event(
      'commission.received',
      jsonb_build_object(
        'commissionId', NEW.id,
        'amount', NEW.amount,
        'policyId', NEW.policy_id,
        'userId', NEW.user_id,
        'recipientId', NEW.user_id,
        'receivedDate', NEW.received_date,
        'targetTable', 'commissions',
        'targetId', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_workflow_on_commission_received ON commissions;
CREATE TRIGGER trigger_workflow_on_commission_received
  AFTER INSERT OR UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION on_commission_received();

-- Trigger when a chargeback occurs
CREATE OR REPLACE FUNCTION public.on_chargeback_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  commission_user_id UUID;
BEGIN
  -- Get the user_id from the associated commission
  SELECT c.user_id INTO commission_user_id
  FROM commissions c
  WHERE c.id = NEW.commission_id;

  PERFORM trigger_workflows_for_event(
    'commission.chargeback',
    jsonb_build_object(
      'chargebackId', NEW.id,
      'commissionId', NEW.commission_id,
      'amount', NEW.chargeback_amount,
      'reason', NEW.reason,
      'userId', commission_user_id,
      'recipientId', commission_user_id,
      'chargebackDate', NEW.chargeback_date,
      'targetTable', 'chargebacks',
      'targetId', NEW.id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_workflow_on_chargeback ON chargebacks;
CREATE TRIGGER trigger_workflow_on_chargeback
  AFTER INSERT ON chargebacks
  FOR EACH ROW
  EXECUTE FUNCTION on_chargeback_created();

-- ============================================================================
-- PART 4: Recruiting Event Triggers
-- ============================================================================

-- Trigger when a recruit moves to a new phase
CREATE OR REPLACE FUNCTION public.on_recruit_phase_changed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  recruiter_user_id UUID;
BEGIN
  IF NEW.current_onboarding_phase IS DISTINCT FROM OLD.current_onboarding_phase THEN
    -- Get the recruiter's user_id
    SELECT recruiter_id INTO recruiter_user_id
    FROM user_profiles
    WHERE id = NEW.id;

    PERFORM trigger_workflows_for_event(
      'recruit.phase_changed',
      jsonb_build_object(
        'recruitId', NEW.id,
        'recruitName', NEW.first_name || ' ' || NEW.last_name,
        'recruitEmail', NEW.email,
        'oldPhase', OLD.current_onboarding_phase,
        'newPhase', NEW.current_onboarding_phase,
        'recruiterId', recruiter_user_id,
        'recipientId', recruiter_user_id,
        'targetTable', 'user_profiles',
        'targetId', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_workflow_on_recruit_phase_change ON user_profiles;
CREATE TRIGGER trigger_workflow_on_recruit_phase_change
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (OLD.current_onboarding_phase IS DISTINCT FROM NEW.current_onboarding_phase)
  EXECUTE FUNCTION on_recruit_phase_changed();

-- ============================================================================
-- PART 5: Target Event Triggers
-- ============================================================================

-- Trigger when a target milestone is reached
CREATE OR REPLACE FUNCTION public.on_target_milestone_reached()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_performance NUMERIC;
  target_value NUMERIC;
  completion_percentage NUMERIC;
BEGIN
  -- This is a simplified example - you would calculate actual performance
  -- based on your business logic (e.g., sum of commissions for the period)

  -- For demonstration, assume we track completion in a field
  -- In reality, you'd query actual data to calculate progress

  -- Example: If monthly_target is $10,000 and we just crossed $5,000 (50%)
  -- or $7,500 (75%), or $10,000 (100%), trigger the workflow

  -- This trigger would need more context about what constitutes a "milestone"
  -- For now, we'll trigger when targets are updated

  PERFORM trigger_workflows_for_event(
    'target.milestone_reached',
    jsonb_build_object(
      'targetId', NEW.id,
      'userId', NEW.user_id,
      'recipientId', NEW.user_id,
      'monthlyTarget', NEW.monthly_policies_target,
      'targetTable', 'user_targets',
      'targetId', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

-- Note: This trigger might need refinement based on your actual milestone logic
-- Commenting out for now - uncomment and customize when ready
-- DROP TRIGGER IF EXISTS trigger_workflow_on_target_milestone ON user_targets;
-- CREATE TRIGGER trigger_workflow_on_target_milestone
--   AFTER UPDATE ON user_targets
--   FOR EACH ROW
--   EXECUTE FUNCTION on_target_milestone_reached();

-- ============================================================================
-- PART 6: Scheduled Workflow Processor Function
-- ============================================================================

-- Function to process pending workflow runs
-- This should be called by a cron job or scheduled Edge Function
CREATE OR REPLACE FUNCTION public.process_pending_workflow_runs()
RETURNS TABLE(
  run_id UUID,
  workflow_id UUID,
  status TEXT,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_run RECORD;
  edge_function_url TEXT;
  request_payload JSONB;
BEGIN
  -- Get the Supabase project URL (you'll need to set this)
  edge_function_url := 'https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/process-workflow';

  -- Find pending runs that haven't been processed
  FOR pending_run IN
    SELECT wr.id, wr.workflow_id, wr.context
    FROM workflow_runs wr
    WHERE wr.status = 'pending'
    AND wr.started_at > now() - interval '1 hour' -- Only recent runs
    ORDER BY wr.started_at ASC
    LIMIT 10 -- Process in batches
  LOOP
    -- Update status to 'running'
    UPDATE workflow_runs
    SET status = 'running'
    WHERE id = pending_run.id;

    -- Return information about the run to process
    -- The actual invocation should happen from the application layer or Edge Function
    -- as pg_net extension may not be available

    RETURN QUERY SELECT
      pending_run.id,
      pending_run.workflow_id,
      'queued'::TEXT,
      'Ready for processing'::TEXT;
  END LOOP;

  RETURN;
END;
$$;

-- ============================================================================
-- PART 7: Manual Workflow Trigger Helper
-- ============================================================================

-- Function to manually trigger a workflow (used by the UI)
CREATE OR REPLACE FUNCTION public.create_workflow_run(
  workflow_id_param UUID,
  context_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  run_id UUID;
  workflow_created_by UUID;
BEGIN
  -- Verify workflow exists and user has permission
  SELECT created_by INTO workflow_created_by
  FROM workflows
  WHERE id = workflow_id_param;

  IF workflow_created_by IS NULL THEN
    RAISE EXCEPTION 'Workflow not found';
  END IF;

  -- Check if user has permission (either creator or admin)
  IF workflow_created_by != auth.uid() AND NOT can_manage_workflows(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create the run
  INSERT INTO workflow_runs (
    workflow_id,
    status,
    context,
    started_at
  )
  VALUES (
    workflow_id_param,
    'pending',
    context_param,
    now()
  )
  RETURNING id INTO run_id;

  RETURN run_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_workflow_run(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_workflow_runs() TO service_role;

-- ============================================================================
-- PART 8: Add indexes for performance
-- ============================================================================

-- Index for finding active event-based workflows
CREATE INDEX IF NOT EXISTS idx_workflows_event_trigger
  ON workflows(trigger_type, status)
  WHERE trigger_type = 'event' AND status = 'active';

-- Index for finding pending workflow runs
CREATE INDEX IF NOT EXISTS idx_workflow_runs_pending
  ON workflow_runs(status, started_at)
  WHERE status IN ('pending', 'running');

-- Index for workflow runs by workflow
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id
  ON workflow_runs(workflow_id, started_at DESC);

-- ============================================================================
-- Verification and Testing
-- ============================================================================

-- To test: Insert a test policy and check if workflows are triggered
-- INSERT INTO policies (policy_number, client_id, product_type, premium, effective_date, status, user_id)
-- VALUES ('TEST-001', '...', 'term_life', 100, CURRENT_DATE, 'active', auth.uid());

-- Check pending runs:
-- SELECT * FROM workflow_runs WHERE status = 'pending' ORDER BY started_at DESC LIMIT 5;

-- Process pending runs:
-- SELECT * FROM process_pending_workflow_runs();
