-- /home/nneessen/projects/commissionTracker/supabase/migrations/20241213_006_fix_admin_deleteuser_function.sql
-- Fix admin_deleteuser function with correct table names

-- Drop the broken function
DROP FUNCTION IF EXISTS public.admin_deleteuser(uuid);

-- Create the corrected admin_deleteuser function
CREATE OR REPLACE FUNCTION public.admin_deleteuser(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run with creator privileges
AS $$
DECLARE
    v_result json;
    v_deleted_count int;
    v_user_email text;
BEGIN
    -- Check if caller is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND 'admin' = ANY(roles)
    ) THEN
        RAISE EXCEPTION 'Only admin users can delete other users';
    END IF;

    -- Prevent self-deletion
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete yourself';
    END IF;

    -- Get user email before deletion
    SELECT email INTO v_user_email
    FROM user_profiles
    WHERE id = target_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Start transaction for cleanup
    BEGIN
        -- Delete related data first (using correct table names from schema)

        -- Recruiting related
        DELETE FROM recruit_checklist_progress WHERE user_id = target_user_id;
        DELETE FROM recruit_phase_progress WHERE recruit_id = target_user_id;

        -- Workflow related
        DELETE FROM workflow_runs WHERE user_id = target_user_id;
        DELETE FROM workflow_email_tracking WHERE user_id = target_user_id;

        -- Email related
        DELETE FROM user_emails WHERE user_id = target_user_id;
        DELETE FROM user_email_attachments WHERE user_id = target_user_id;
        DELETE FROM user_email_oauth_tokens WHERE user_id = target_user_id;
        DELETE FROM email_templates WHERE user_id = target_user_id;
        DELETE FROM email_queue WHERE recipient_user_id = target_user_id;

        -- Expense related
        DELETE FROM expenses WHERE user_id = target_user_id;
        DELETE FROM expense_templates WHERE user_id = target_user_id;

        -- Commission related
        DELETE FROM commissions WHERE agent_id = target_user_id;
        DELETE FROM override_commissions WHERE override_agent_id = target_user_id OR original_agent_id = target_user_id;

        -- Policy related
        DELETE FROM policies WHERE user_id = target_user_id;

        -- Hierarchy related
        DELETE FROM hierarchy_invitations WHERE sender_id = target_user_id OR recipient_id = target_user_id;

        -- User activity and settings
        DELETE FROM user_activity_log WHERE user_id = target_user_id;
        DELETE FROM user_targets WHERE user_id = target_user_id;
        DELETE FROM user_documents WHERE user_id = target_user_id;

        -- Notifications
        DELETE FROM notifications WHERE user_id = target_user_id;

        -- Messages (if user is involved)
        DELETE FROM messages WHERE sender_id = target_user_id;
        DELETE FROM message_threads WHERE created_by = target_user_id;

        -- Update any users who have this user as upline (set to NULL)
        UPDATE user_profiles
        SET upline_id = NULL
        WHERE upline_id = target_user_id;

        -- Finally, delete the user profile
        DELETE FROM user_profiles WHERE id = target_user_id;

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

        IF v_deleted_count = 0 THEN
            RAISE EXCEPTION 'Failed to delete user profile';
        END IF;

        -- Note: We cannot delete from auth.users directly from a function
        -- This needs to be done via Supabase Admin API or Dashboard

        v_result := json_build_object(
            'success', true,
            'message', format('Successfully deleted user %s', v_user_email),
            'deleted_user_id', target_user_id,
            'deleted_email', v_user_email,
            'note', 'User data deleted. Auth user must be deleted via Supabase Admin API or Dashboard.'
        );

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        RAISE;
    END;

END;
$$;

-- Grant execute permission to authenticated users (RLS will check admin role)
GRANT EXECUTE ON FUNCTION public.admin_deleteuser(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.admin_deleteuser(uuid) IS 'Admin function to delete a user and all related data. Only admins can execute this function. Uses correct table names from current schema.';