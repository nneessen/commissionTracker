-- Revert: 20251228_002_staff_role_constraints.sql
-- This reverses the staff role constraints migration

-- Remove the CHECK constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS check_staff_no_onboarding;

-- Note: The GIN index on roles is useful and should generally be kept
-- Uncomment below if you need to remove it:
-- DROP INDEX IF EXISTS idx_user_profiles_roles;

-- Note: Data changes (setting onboarding_status to NULL for staff)
-- are NOT reverted as they represent correct business state
