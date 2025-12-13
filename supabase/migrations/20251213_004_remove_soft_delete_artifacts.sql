-- Migration: Remove soft delete artifacts
-- Date: 2024-12-13
-- Description: Removes legacy soft delete functions and column that are not used
--              The system uses admin_deleteuser for hard deletes only
--
-- This migration removes:
-- 1. soft_delete_user function (was setting is_deleted = true instead of deleting)
-- 2. restore_deleted_user function (was for restoring soft-deleted users)
-- 3. is_deleted column from user_profiles (no longer needed with hard deletes)
-- 4. Related views that depend on is_deleted

-- First, verify no soft-deleted users exist
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_profiles
  WHERE is_deleted = true;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove is_deleted column: % users are soft-deleted. These need to be handled first.', v_count;
  END IF;
END $$;

-- Drop the soft_delete_user function
DROP FUNCTION IF EXISTS soft_delete_user(uuid, uuid, text);

-- Drop the restore_deleted_user function
DROP FUNCTION IF EXISTS restore_deleted_user(uuid, uuid);

-- Drop the user_delete_dependencies view if it exists (used by soft_delete_user)
DROP VIEW IF EXISTS user_delete_dependencies;

-- Drop views that depend on is_deleted column (will be recreated without it)
DROP VIEW IF EXISTS active_user_profiles;
DROP VIEW IF EXISTS user_management_view;

-- Remove the is_deleted column from user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS is_deleted;

-- Recreate active_user_profiles view (without is_deleted filter - all users are active since we hard delete)
CREATE VIEW active_user_profiles AS
SELECT
    id,
    email,
    approval_status,
    is_admin,
    approved_by,
    approved_at,
    denied_at,
    denial_reason,
    created_at,
    updated_at,
    upline_id,
    hierarchy_path,
    hierarchy_depth,
    contract_level,
    onboarding_status,
    current_onboarding_phase,
    recruiter_id,
    onboarding_started_at,
    onboarding_completed_at,
    referral_source,
    instagram_username,
    instagram_url,
    linkedin_username,
    linkedin_url,
    user_id,
    first_name,
    last_name,
    phone,
    profile_photo_url,
    roles,
    custom_permissions,
    street_address,
    city,
    state,
    zip,
    date_of_birth,
    license_number,
    npn,
    license_expiration,
    facebook_handle,
    personal_website,
    resident_state,
    agent_status,
    pipeline_template_id,
    licensing_info,
    archived_at,
    archived_by,
    archive_reason
FROM user_profiles;

-- Recreate user_management_view (without is_deleted filter)
CREATE VIEW user_management_view AS
SELECT
    id,
    email,
    approval_status,
    is_admin,
    approved_by,
    approved_at,
    denied_at,
    denial_reason,
    created_at,
    updated_at,
    upline_id,
    hierarchy_path,
    hierarchy_depth,
    contract_level,
    onboarding_status,
    current_onboarding_phase,
    recruiter_id,
    onboarding_started_at,
    onboarding_completed_at,
    referral_source,
    instagram_username,
    instagram_url,
    linkedin_username,
    linkedin_url,
    user_id,
    first_name,
    last_name,
    phone,
    profile_photo_url,
    roles,
    custom_permissions,
    street_address,
    city,
    state,
    zip,
    date_of_birth,
    license_number,
    npn,
    license_expiration,
    facebook_handle,
    personal_website,
    resident_state,
    agent_status,
    pipeline_template_id,
    licensing_info,
    archived_at,
    archived_by,
    archive_reason,
    is_super_admin,
    CASE
        WHEN 'admin'::text = ANY (roles) THEN 'admin'::text
        WHEN 'active_agent'::text = ANY (roles) THEN 'active_agent'::text
        WHEN 'agent'::text = ANY (roles) THEN 'agent'::text
        WHEN 'recruit'::text = ANY (roles) THEN 'recruit'::text
        ELSE 'other'::text
    END AS primary_role,
    CASE
        WHEN onboarding_status IS NOT NULL AND NOT (('active_agent'::text = ANY (roles)) OR ('admin'::text = ANY (roles))) THEN true
        ELSE false
    END AS in_recruiting_pipeline,
    CASE
        WHEN ('active_agent'::text = ANY (roles)) OR ('agent'::text = ANY (roles)) OR is_admin = true THEN true
        ELSE false
    END AS in_users_list
FROM user_profiles up;

-- Add comment documenting that we only use hard deletes
COMMENT ON FUNCTION admin_deleteuser(uuid) IS
'Hard deletes a user and all related data. Only callable by admins.
This is the ONLY delete method - no soft deletes are used in this system.';
