-- /home/nneessen/projects/commissionTracker/supabase/migrations/20241213_005_admin_deleteuser_function.sql
-- Create admin_deleteuser function for deleting users with proper cleanup

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.admin_deleteuser(uuid);

-- Create the admin_deleteuser function
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
        -- Delete related data first (cascade should handle most of this)

        -- Delete recruiting checklist items
        DELETE FROM recruiting_checklists WHERE recruit_id = target_user_id;

        -- Delete recruiting pipeline entries
        DELETE FROM recruiting_pipeline WHERE recruit_id = target_user_id;

        -- Delete workflow instances
        DELETE FROM workflow_instances WHERE user_id = target_user_id;

        -- Delete workflow participants
        DELETE FROM workflow_participants WHERE user_id = target_user_id;

        -- Delete expenses
        DELETE FROM expenses WHERE user_id = target_user_id;

        -- Delete expense templates
        DELETE FROM expense_templates WHERE user_id = target_user_id;

        -- Delete bank connections
        DELETE FROM bank_connections WHERE user_id = target_user_id;

        -- Delete commissions
        DELETE FROM commissions WHERE agent_id = target_user_id;

        -- Delete policies
        DELETE FROM policies WHERE user_id = target_user_id;

        -- Delete policy notes
        DELETE FROM policy_notes WHERE agent_id = target_user_id;

        -- Delete training progress
        DELETE FROM training_progress WHERE user_id = target_user_id;

        -- Delete certificates
        DELETE FROM certificates WHERE user_id = target_user_id;

        -- Delete schedule items
        DELETE FROM schedule_items WHERE user_id = target_user_id;

        -- Delete user targets
        DELETE FROM user_targets WHERE user_id = target_user_id;

        -- Delete user activity
        DELETE FROM user_activity WHERE user_id = target_user_id;

        -- Delete email templates
        DELETE FROM email_templates WHERE user_id = target_user_id;

        -- Delete emails
        DELETE FROM emails WHERE user_id = target_user_id;

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
COMMENT ON FUNCTION public.admin_deleteuser(uuid) IS 'Admin function to delete a user and all related data. Only admins can execute this function.';