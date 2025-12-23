-- supabase/migrations/20251223_042_automation_scheduled_functions.sql
-- Helper functions for scheduled automation triggers (phase_stall, item_deadline_approaching)

-- Get recruits who have been in a phase longer than X days (for phase_stall triggers)
-- Returns recruits where an active phase_stall automation exists with delay_days <= days_in_phase
CREATE OR REPLACE FUNCTION get_stale_phase_recruits()
RETURNS TABLE (
  recruit_id uuid,
  phase_id uuid,
  days_in_phase integer,
  automation_delay_days integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    rpp.user_id AS recruit_id,
    rpp.phase_id,
    EXTRACT(DAY FROM (NOW() - rpp.started_at))::integer AS days_in_phase,
    pa.delay_days AS automation_delay_days
  FROM recruit_phase_progress rpp
  JOIN pipeline_automations pa ON pa.phase_id = rpp.phase_id
  JOIN user_profiles up ON up.id = rpp.user_id
  WHERE
    rpp.status = 'in_progress'
    AND rpp.started_at IS NOT NULL
    AND pa.trigger_type = 'phase_stall'
    AND pa.is_active = true
    -- Only return if they've been in the phase longer than the automation's delay
    AND EXTRACT(DAY FROM (NOW() - rpp.started_at)) >= pa.delay_days
    -- Exclude already graduated/completed recruits
    AND up.onboarding_status NOT IN ('completed', 'graduated')
  ORDER BY days_in_phase DESC;
$$;

-- Get checklist items with approaching deadlines (for item_deadline_approaching triggers)
-- Note: This requires a deadline field on checklist items or progress
-- For now, we'll use the phase's estimated_days as a proxy for deadline
CREATE OR REPLACE FUNCTION get_approaching_deadline_items()
RETURNS TABLE (
  recruit_id uuid,
  checklist_item_id uuid,
  days_until_deadline integer,
  automation_delay_days integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    rcp.user_id AS recruit_id,
    rcp.checklist_item_id,
    -- Calculate days until deadline based on phase start + estimated_days
    GREATEST(0, (
      pp.estimated_days - EXTRACT(DAY FROM (NOW() - rpp.started_at))::integer
    ))::integer AS days_until_deadline,
    pa.delay_days AS automation_delay_days
  FROM recruit_checklist_progress rcp
  JOIN phase_checklist_items pci ON pci.id = rcp.checklist_item_id
  JOIN pipeline_phases pp ON pp.id = pci.phase_id
  JOIN recruit_phase_progress rpp ON rpp.phase_id = pp.id AND rpp.user_id = rcp.user_id
  JOIN pipeline_automations pa ON pa.checklist_item_id = rcp.checklist_item_id
  JOIN user_profiles up ON up.id = rcp.user_id
  WHERE
    rcp.status NOT IN ('completed', 'approved')  -- Item not done
    AND rpp.status = 'in_progress'  -- Phase is active
    AND rpp.started_at IS NOT NULL
    AND pp.estimated_days IS NOT NULL
    AND pa.trigger_type = 'item_deadline_approaching'
    AND pa.is_active = true
    -- Only if deadline is within the automation's delay days
    AND (pp.estimated_days - EXTRACT(DAY FROM (NOW() - rpp.started_at))::integer) <= pa.delay_days
    AND (pp.estimated_days - EXTRACT(DAY FROM (NOW() - rpp.started_at))::integer) >= 0
    -- Exclude already graduated/completed recruits
    AND up.onboarding_status NOT IN ('completed', 'graduated')
  ORDER BY days_until_deadline ASC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_stale_phase_recruits() TO service_role;
GRANT EXECUTE ON FUNCTION get_approaching_deadline_items() TO service_role;

COMMENT ON FUNCTION get_stale_phase_recruits() IS
  'Returns recruits who have been in a phase longer than the configured stall threshold. Used by process-automation-reminders Edge Function.';

COMMENT ON FUNCTION get_approaching_deadline_items() IS
  'Returns checklist items with approaching deadlines based on phase estimated_days. Used by process-automation-reminders Edge Function.';
