-- supabase/migrations/20260103_001_fix_slack_unique_constraint.sql
-- Fix: Drop the old UNIQUE(team_id) constraint that was never removed
--
-- Background:
-- - Migration 20251225_001 created constraint "slack_integrations_team_unique" with UNIQUE(team_id)
-- - Migration 20251226_002 tried to drop "slack_integrations_team_id_key" (wrong name!)
-- - This left the old constraint in place alongside the new composite constraint
-- - Result: Re-authorization fails with "save_failed" because duplicate team_id not allowed

-- Drop the old UNIQUE(team_id) constraint that was never removed
-- This constraint blocks multi-agency workspace connections and re-authorization
ALTER TABLE slack_integrations
  DROP CONSTRAINT IF EXISTS slack_integrations_team_unique;

-- The composite constraint slack_integrations_team_agency_unique already exists
-- and correctly allows same workspace to be connected to different agencies
-- No need to recreate it.

-- Verify: After this migration, only these constraints should exist:
-- - slack_integrations_pkey (PRIMARY KEY)
-- - slack_integrations_team_agency_unique (UNIQUE on team_id, agency_id)
