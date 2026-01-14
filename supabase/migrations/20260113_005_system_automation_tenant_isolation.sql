-- Migration: Add tenant isolation for system-level automations
-- Fixes CRITICAL cross-tenant data leak issues
--
-- Issues addressed:
-- 1. System automations had no IMO scoping
-- 2. RLS policies didn't cover system automations for IMO admins
-- 3. get_password_reminder_users RPC had no tenant filtering

-- =============================================================================
-- STEP 1: Add imo_id column to pipeline_automations for system-level scoping
-- =============================================================================
-- For phase/item automations, tenant is derived from the phase/item's template
-- For system automations (phase_id IS NULL AND checklist_item_id IS NULL),
-- we need explicit imo_id scoping

ALTER TABLE pipeline_automations
ADD COLUMN IF NOT EXISTS imo_id UUID REFERENCES imos(id) ON DELETE CASCADE;

-- Index for efficient queries on system automations by IMO
CREATE INDEX IF NOT EXISTS idx_pipeline_automations_imo_id
ON pipeline_automations (imo_id)
WHERE imo_id IS NOT NULL;

COMMENT ON COLUMN pipeline_automations.imo_id IS
'IMO scope for system-level automations. NULL for phase/item automations (they derive tenant from parent). Required for system triggers like password_not_set_*.';

-- =============================================================================
-- STEP 2: Update constraint to require imo_id for system automations
-- =============================================================================
-- Drop existing constraint and recreate with imo_id requirement
ALTER TABLE pipeline_automations DROP CONSTRAINT IF EXISTS automation_target_check;

ALTER TABLE pipeline_automations ADD CONSTRAINT automation_target_check CHECK (
  -- Phase triggers require phase_id, no imo_id needed (derived from phase)
  (trigger_type IN ('phase_enter', 'phase_complete', 'phase_stall')
   AND phase_id IS NOT NULL
   AND checklist_item_id IS NULL)
  OR
  -- Item triggers require checklist_item_id, no imo_id needed (derived from item)
  (trigger_type IN ('item_complete', 'item_approval_needed', 'item_deadline_approaching')
   AND checklist_item_id IS NOT NULL
   AND phase_id IS NULL)
  OR
  -- System triggers require imo_id for tenant scoping
  (trigger_type IN ('password_not_set_24h', 'password_not_set_12h')
   AND phase_id IS NULL
   AND checklist_item_id IS NULL
   AND imo_id IS NOT NULL)
);

-- =============================================================================
-- STEP 3: Add RLS policy for system automations
-- =============================================================================
-- IMO admins can manage system automations scoped to their IMO

CREATE POLICY "pipeline_automations_imo_admin_system"
  ON pipeline_automations
  FOR ALL
  TO authenticated
  USING (
    is_imo_admin()
    AND phase_id IS NULL
    AND checklist_item_id IS NULL
    AND imo_id = get_my_imo_id()
  )
  WITH CHECK (
    is_imo_admin()
    AND phase_id IS NULL
    AND checklist_item_id IS NULL
    AND imo_id = get_my_imo_id()
  );

COMMENT ON POLICY "pipeline_automations_imo_admin_system" ON pipeline_automations IS
'IMO admins can manage system-level automations (password reminders, etc.) scoped to their IMO';

-- =============================================================================
-- STEP 4: Update get_password_reminder_users to filter by IMO
-- =============================================================================
-- Drop and recreate with imo_id parameter

DROP FUNCTION IF EXISTS get_password_reminder_users(INT);

CREATE OR REPLACE FUNCTION get_password_reminder_users(
  hours_since_creation INT,  -- 48 for 24h-warning, 60 for 12h-warning
  filter_imo_id UUID         -- IMO to filter users by
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ,
  imo_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id AS user_id,
    up.email,
    up.phone,
    up.first_name,
    up.last_name,
    up.created_at,
    up.imo_id
  FROM user_profiles up
  WHERE up.password_set_at IS NULL
    AND up.imo_id = filter_imo_id  -- CRITICAL: Filter by IMO
    AND up.created_at <= NOW() - (hours_since_creation || ' hours')::INTERVAL
    AND up.created_at > NOW() - INTERVAL '72 hours'  -- Still within valid window
    AND up.approval_status != 'denied'  -- Skip denied users
    AND up.archived_at IS NULL;  -- Skip archived users
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_password_reminder_users(INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_password_reminder_users(INT, UUID) TO service_role;

COMMENT ON FUNCTION get_password_reminder_users(INT, UUID) IS
'Returns users who need password setup reminders, filtered by IMO for tenant isolation';

-- =============================================================================
-- STEP 5: Create helper function to get active system automations by IMO
-- =============================================================================
-- Used by edge function to get automations scoped to specific IMO

CREATE OR REPLACE FUNCTION get_active_system_automations(
  p_trigger_type TEXT,
  p_imo_id UUID
)
RETURNS TABLE (
  id UUID,
  trigger_type TEXT,
  communication_type TEXT,
  recipients JSONB,
  email_subject TEXT,
  email_body_html TEXT,
  notification_title TEXT,
  notification_message TEXT,
  sms_message TEXT,
  imo_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id,
    pa.trigger_type::TEXT,
    pa.communication_type::TEXT,
    pa.recipients,
    pa.email_subject,
    pa.email_body_html,
    pa.notification_title,
    pa.notification_message,
    pa.sms_message,
    pa.imo_id
  FROM pipeline_automations pa
  WHERE pa.trigger_type::TEXT = p_trigger_type
    AND pa.is_active = true
    AND pa.imo_id = p_imo_id
    AND pa.phase_id IS NULL
    AND pa.checklist_item_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_system_automations(TEXT, UUID) TO service_role;

COMMENT ON FUNCTION get_active_system_automations(TEXT, UUID) IS
'Returns active system automations for a specific trigger type and IMO';

-- =============================================================================
-- STEP 6: Create function to get all IMOs with active system automations
-- =============================================================================
-- Edge function needs to iterate over IMOs that have configured automations

CREATE OR REPLACE FUNCTION get_imos_with_system_automations(
  p_trigger_type TEXT
)
RETURNS TABLE (
  imo_id UUID,
  imo_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    pa.imo_id,
    i.name AS imo_name
  FROM pipeline_automations pa
  JOIN imos i ON i.id = pa.imo_id
  WHERE pa.trigger_type::TEXT = p_trigger_type
    AND pa.is_active = true
    AND pa.phase_id IS NULL
    AND pa.checklist_item_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imos_with_system_automations(TEXT) TO service_role;

COMMENT ON FUNCTION get_imos_with_system_automations(TEXT) IS
'Returns all IMOs that have active system automations for a given trigger type';
