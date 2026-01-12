-- ============================================================================
-- Migration: Add Google Meet to scheduling_integrations
-- Author: Claude Code
-- Date: 2025-12-27
-- ============================================================================
--
-- Description:
--   Adds Google Meet as a 4th scheduling integration type alongside
--   Calendly, Google Calendar, and Zoom.
--
-- Changes:
--   - Updates CHECK constraint to include 'google_meet'
--   - Updates column comment to document new integration type
--   - No new columns needed (existing fields support Google Meet)
--
-- ============================================================================

-- Drop existing CHECK constraint
ALTER TABLE scheduling_integrations
DROP CONSTRAINT IF EXISTS scheduling_integrations_integration_type_check;

-- Add updated CHECK constraint with google_meet
ALTER TABLE scheduling_integrations
ADD CONSTRAINT scheduling_integrations_integration_type_check
CHECK (integration_type IN ('calendly', 'google_calendar', 'zoom', 'google_meet'));

-- Update column comment to document google_meet
COMMENT ON COLUMN scheduling_integrations.integration_type IS
'Type of scheduling integration. Allowed values:
  - calendly: Calendly scheduling link
  - google_calendar: Google Calendar appointment scheduling link
  - zoom: Zoom meeting link with optional passcode
  - google_meet: Google Meet video conference link';

-- Update table comment to reflect new integration type
COMMENT ON TABLE scheduling_integrations IS
'Stores user scheduling integrations for recruiting pipeline.
Supports: Calendly, Google Calendar, Zoom, and Google Meet.

Each user can have one active integration per type.
Booking URLs are captured here and stored in checklist item metadata
at configuration time so recruits can access without RLS complexity.';
