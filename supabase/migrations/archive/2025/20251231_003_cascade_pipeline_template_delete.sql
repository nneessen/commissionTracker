-- supabase/migrations/20251231_003_cascade_pipeline_template_delete.sql
-- Fix: Pipeline template deletion fails due to FK constraint violations
-- Solution: Add CASCADE delete to recruit_phase_progress and SET NULL to user_profiles

-- 1. recruit_phase_progress.template_id -> CASCADE DELETE
-- When a template is deleted, all progress records for that template are also deleted
ALTER TABLE recruit_phase_progress
DROP CONSTRAINT IF EXISTS recruit_phase_progress_template_id_fkey;

ALTER TABLE recruit_phase_progress
ADD CONSTRAINT recruit_phase_progress_template_id_fkey
FOREIGN KEY (template_id) REFERENCES pipeline_templates(id) ON DELETE CASCADE;

-- 2. user_profiles.pipeline_template_id -> SET NULL
-- When a template is deleted, users are un-enrolled but preserved
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_pipeline_template_id_fkey;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_pipeline_template_id_fkey
FOREIGN KEY (pipeline_template_id) REFERENCES pipeline_templates(id) ON DELETE SET NULL;

-- Document the cascade behavior
COMMENT ON CONSTRAINT recruit_phase_progress_template_id_fkey ON recruit_phase_progress IS
  'Cascades deletion when template is deleted - all progress records are removed';

COMMENT ON CONSTRAINT user_profiles_pipeline_template_id_fkey ON user_profiles IS
  'Sets to NULL when template is deleted - users are preserved but unassigned from template';
