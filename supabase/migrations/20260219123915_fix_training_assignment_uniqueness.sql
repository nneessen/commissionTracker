-- supabase/migrations/20260219123915_fix_training_assignment_uniqueness.sql

-- Delete ALL existing assignments (duplicates exist in production)
DELETE FROM training_assignments;

-- Enforce: one individual assignment per (module, user) — forever (no status filter)
-- Even revoked assignments block re-assignment. To re-enable, update status to 'active'.
CREATE UNIQUE INDEX uq_training_assignments_module_user
  ON training_assignments (module_id, assigned_to)
  WHERE assigned_to IS NOT NULL;

-- Enforce: one agency-wide assignment per (module, agency)
CREATE UNIQUE INDEX uq_training_assignments_module_agency
  ON training_assignments (module_id, agency_id)
  WHERE assigned_to IS NULL;
