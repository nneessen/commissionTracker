-- Migration: Unify user_profiles.id with auth.users.id
-- Date: 2024-12-13
--
-- Problem: user_profiles had two UUID columns:
--   - id: the profile's primary key
--   - user_id: foreign key to auth.users.id
-- These could be different, causing bugs in delete operations.
--
-- Solution:
--   - user_profiles.id SHALL BE auth.users.id (same UUID)
--   - Drop the redundant user_id column
--   - Update all RLS policies to use id instead of user_id
--   - Update all related functions

-- Step 1: Verify all users have matching IDs (safety check)
DO $$
DECLARE
  v_mismatched int;
BEGIN
  SELECT COUNT(*) INTO v_mismatched
  FROM user_profiles
  WHERE id != user_id AND user_id IS NOT NULL;

  IF v_mismatched > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: % users have mismatched id/user_id. Fix data first.', v_mismatched;
  END IF;

  RAISE NOTICE 'All user IDs verified matching. Proceeding with migration.';
END $$;

-- Step 2: Drop views that depend on user_id
DROP VIEW IF EXISTS active_user_profiles CASCADE;
DROP VIEW IF EXISTS user_management_view CASCADE;

-- Step 3: Drop RLS policies that depend on user_id
-- user_profiles policies
DROP POLICY IF EXISTS user_profiles_select_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON user_profiles;

-- recruit_phase_progress policies
DROP POLICY IF EXISTS "Users can view their own phase progress" ON recruit_phase_progress;
DROP POLICY IF EXISTS "Recruiters can view their recruits' phase progress" ON recruit_phase_progress;
DROP POLICY IF EXISTS "Recruiters can update their recruits' phase progress" ON recruit_phase_progress;

-- recruit_checklist_progress policies
DROP POLICY IF EXISTS "Users can view their own checklist progress" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Recruiters can view their recruits' checklist progress" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Users can update their own checklist progress" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Recruiters can update their recruits' checklist progress" ON recruit_checklist_progress;

-- message_threads policies
DROP POLICY IF EXISTS "Users can view their threads" ON message_threads;
DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
DROP POLICY IF EXISTS "Users can update their threads" ON message_threads;

-- messages policies
DROP POLICY IF EXISTS "Users can view thread messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update thread messages" ON messages;

-- user_email_oauth_tokens policies
DROP POLICY IF EXISTS "Users can view own OAuth tokens" ON user_email_oauth_tokens;
DROP POLICY IF EXISTS "Users can insert own OAuth tokens" ON user_email_oauth_tokens;
DROP POLICY IF EXISTS "Users can update own OAuth tokens" ON user_email_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete own OAuth tokens" ON user_email_oauth_tokens;

-- email_quota_tracking policies
DROP POLICY IF EXISTS "Users can view own quota" ON email_quota_tracking;

-- email_watch_subscriptions policies
DROP POLICY IF EXISTS "Users can view own watch subscriptions" ON email_watch_subscriptions;

-- email_triggers policies
DROP POLICY IF EXISTS "Admins can manage triggers" ON email_triggers;

-- email_templates policies
DROP POLICY IF EXISTS email_templates_insert ON email_templates;
DROP POLICY IF EXISTS email_templates_update ON email_templates;
DROP POLICY IF EXISTS email_templates_delete ON email_templates;

-- Step 4: Drop the user_id column
ALTER TABLE user_profiles DROP COLUMN user_id;

-- Step 5: Recreate RLS policies using auth.uid() = id instead of user_id

-- user_profiles policies (now auth.uid() = id since id IS the auth user id)
CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY user_profiles_insert_own ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- recruit_phase_progress policies
CREATE POLICY "Users can view their own phase progress" ON recruit_phase_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can view their recruits' phase progress" ON recruit_phase_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
        AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update their recruits' phase progress" ON recruit_phase_progress
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
        AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- recruit_checklist_progress policies
CREATE POLICY "Users can view their own checklist progress" ON recruit_checklist_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can view their recruits' checklist progress" ON recruit_checklist_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
        AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own checklist progress" ON recruit_checklist_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can update their recruits' checklist progress" ON recruit_checklist_progress
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
        AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- message_threads policies
CREATE POLICY "Users can view their threads" ON message_threads
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create threads" ON message_threads
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their threads" ON message_threads
  FOR UPDATE USING (auth.uid() = created_by);

-- messages policies
CREATE POLICY "Users can view thread messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_threads
      WHERE message_threads.id = messages.thread_id
        AND message_threads.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update thread messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- user_email_oauth_tokens policies
CREATE POLICY "Users can view own OAuth tokens" ON user_email_oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth tokens" ON user_email_oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth tokens" ON user_email_oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth tokens" ON user_email_oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- email_quota_tracking policies
CREATE POLICY "Users can view own quota" ON email_quota_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- email_watch_subscriptions policies
CREATE POLICY "Users can view own watch subscriptions" ON email_watch_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- email_triggers policies
CREATE POLICY "Admins can manage triggers" ON email_triggers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- email_templates policies
CREATE POLICY email_templates_insert ON email_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY email_templates_update ON email_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY email_templates_delete ON email_templates
  FOR DELETE USING (auth.uid() = created_by);

-- Step 6: Recreate views without user_id
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
FROM user_profiles;

-- Step 7: Update handle_new_user trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;

  -- Create profile with id = auth.users.id (they are the same!)
  INSERT INTO user_profiles (
    id,
    email,
    approval_status,
    is_admin,
    approved_at,
    upline_id,
    roles
  )
  VALUES (
    NEW.id,  -- Profile ID = Auth User ID
    NEW.email,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN 'approved' ELSE 'pending' END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN true ELSE false END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN NOW() ELSE NULL END,
    NULL,
    ARRAY['agent']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated profile for auth user % (ID: %)', NEW.email, NEW.id;

  RETURN NEW;
END;
$$;

-- Step 8: Update admin_deleteuser function
CREATE OR REPLACE FUNCTION admin_deleteuser(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_admin boolean;
  v_result jsonb;
  v_deleted_count int := 0;
  v_table_counts jsonb := '{}';
  v_user_exists boolean;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Verify target user exists (check both tables)
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = target_user_id
    UNION
    SELECT 1 FROM auth.users WHERE id = target_user_id
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User % not found', target_user_id;
  END IF;

  -- Delete in correct order (children before parents)

  -- Workflow related
  DELETE FROM workflow_email_tracking WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('workflow_email_tracking', v_deleted_count);

  DELETE FROM workflow_rate_limits WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('workflow_rate_limits', v_deleted_count);

  -- Activity and audit logs
  DELETE FROM user_activity_log WHERE user_id = target_user_id OR performed_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_activity_log', v_deleted_count);

  DELETE FROM system_audit_log WHERE performed_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('system_audit_log', v_deleted_count);

  -- Documents and files
  DELETE FROM user_documents WHERE user_id = target_user_id OR uploaded_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_documents', v_deleted_count);

  -- Email related
  DELETE FROM user_emails WHERE user_id = target_user_id OR sender_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_emails', v_deleted_count);

  DELETE FROM user_email_oauth_tokens WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_email_oauth_tokens', v_deleted_count);

  DELETE FROM email_watch_subscriptions WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_watch_subscriptions', v_deleted_count);

  DELETE FROM email_quota_tracking WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_quota_tracking', v_deleted_count);

  DELETE FROM email_queue WHERE recipient_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_queue', v_deleted_count);

  DELETE FROM email_triggers WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_triggers', v_deleted_count);

  DELETE FROM email_templates WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_templates', v_deleted_count);

  -- Messaging
  DELETE FROM messages WHERE sender_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('messages', v_deleted_count);

  DELETE FROM message_threads WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('message_threads', v_deleted_count);

  -- Notifications
  DELETE FROM notifications WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('notifications', v_deleted_count);

  -- Recruiting progress
  DELETE FROM recruit_checklist_progress
  WHERE user_id = target_user_id
     OR completed_by = target_user_id
     OR verified_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('recruit_checklist_progress', v_deleted_count);

  DELETE FROM recruit_phase_progress WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('recruit_phase_progress', v_deleted_count);

  DELETE FROM onboarding_phases WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('onboarding_phases', v_deleted_count);

  -- Hierarchy
  DELETE FROM hierarchy_invitations
  WHERE inviter_id = target_user_id
     OR invitee_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('hierarchy_invitations', v_deleted_count);

  -- Commissions
  DELETE FROM override_commissions
  WHERE base_agent_id = target_user_id
     OR override_agent_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('override_commissions', v_deleted_count);

  DELETE FROM commissions WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('commissions', v_deleted_count);

  -- Policies and clients
  DELETE FROM policies WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('policies', v_deleted_count);

  DELETE FROM clients WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('clients', v_deleted_count);

  -- Expenses
  DELETE FROM expenses WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('expenses', v_deleted_count);

  DELETE FROM expense_templates WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('expense_templates', v_deleted_count);

  DELETE FROM expense_categories WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('expense_categories', v_deleted_count);

  -- User settings and targets
  DELETE FROM settings WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('settings', v_deleted_count);

  DELETE FROM user_targets WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_targets', v_deleted_count);

  -- Pipeline templates
  DELETE FROM pipeline_templates WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('pipeline_templates', v_deleted_count);

  -- Handle user_profiles self-references
  UPDATE user_profiles SET recruiter_id = NULL WHERE recruiter_id = target_user_id;
  UPDATE user_profiles SET upline_id = NULL WHERE upline_id = target_user_id;
  UPDATE user_profiles SET archived_by = NULL WHERE archived_by = target_user_id;

  -- Delete the user profile
  DELETE FROM user_profiles WHERE id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_profiles', v_deleted_count);

  -- Delete from auth.users (same ID now!)
  DELETE FROM auth.users WHERE id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('auth_users', v_deleted_count);

  -- Build success result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'deleted_from_tables', v_table_counts,
    'message', 'User and all related data successfully deleted'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Step 9: Fix log_user_profile_changes function (also referenced user_id)
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_performed_by UUID;
  v_details JSONB;
BEGIN
  -- Get current authenticated user (id IS the auth user id now)
  v_performed_by := auth.uid();

  -- Build details JSON with before/after values
  v_details := jsonb_build_object(
    'before', row_to_json(OLD),
    'after', row_to_json(NEW),
    'changed_fields', (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
    )
  );

  -- Log significant changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (NEW.id, v_performed_by, 'created', v_details);

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log onboarding status changes
    IF OLD.onboarding_status IS DISTINCT FROM NEW.onboarding_status THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.id, v_performed_by, 'status_changed', jsonb_build_object(
        'field', 'onboarding_status',
        'old_value', OLD.onboarding_status,
        'new_value', NEW.onboarding_status
      ));
    END IF;

    -- Log phase changes
    IF OLD.current_onboarding_phase IS DISTINCT FROM NEW.current_onboarding_phase THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.id, v_performed_by, 'phase_changed', jsonb_build_object(
        'old_phase', OLD.current_onboarding_phase,
        'new_phase', NEW.current_onboarding_phase
      ));
    END IF;

    -- Log general updates (if something changed)
    IF v_details->'changed_fields' != '{}'::jsonb THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.id, v_performed_by, 'updated', v_details);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 10: Add comments documenting the design
COMMENT ON TABLE user_profiles IS
'User profile data. The id column IS the auth.users.id (same UUID).
There is no separate user_id column - use id for all auth-related operations.';

COMMENT ON FUNCTION admin_deleteuser(uuid) IS
'Hard deletes a user from user_profiles and auth.users.
The target_user_id is both the profile ID and auth user ID (they are the same).';

COMMENT ON FUNCTION handle_new_user() IS
'Trigger function that creates a user_profile when an auth user is created.
The profile.id is set to auth.users.id (same UUID).';
