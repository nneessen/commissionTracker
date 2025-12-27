-- supabase/migrations/20251227_006_fix_signature_fk_constraints.sql
-- Fix FK constraints on signature tables to allow user deletion

-- =============================================================================
-- 1. Fix signature_submissions.target_user_id FK
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE signature_submissions
DROP CONSTRAINT IF EXISTS signature_submissions_target_user_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE signature_submissions
ADD CONSTRAINT signature_submissions_target_user_id_fkey
FOREIGN KEY (target_user_id)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

-- =============================================================================
-- 2. Fix signature_submissions.initiated_by FK
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE signature_submissions
DROP CONSTRAINT IF EXISTS signature_submissions_initiated_by_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE signature_submissions
ADD CONSTRAINT signature_submissions_initiated_by_fkey
FOREIGN KEY (initiated_by)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

-- =============================================================================
-- 3. Fix signature_submissions.voided_by FK
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE signature_submissions
DROP CONSTRAINT IF EXISTS signature_submissions_voided_by_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE signature_submissions
ADD CONSTRAINT signature_submissions_voided_by_fkey
FOREIGN KEY (voided_by)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

-- =============================================================================
-- 4. Fix signature_submitters.user_id FK
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE signature_submitters
DROP CONSTRAINT IF EXISTS signature_submitters_user_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE signature_submitters
ADD CONSTRAINT signature_submitters_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

-- =============================================================================
-- 5. Fix signature_templates.created_by FK
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE signature_templates
DROP CONSTRAINT IF EXISTS signature_templates_created_by_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE signature_templates
ADD CONSTRAINT signature_templates_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES user_profiles(id)
ON DELETE SET NULL;
