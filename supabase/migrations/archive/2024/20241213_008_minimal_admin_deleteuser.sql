-- /home/nneessen/projects/commissionTracker/supabase/migrations/20241213_008_minimal_admin_deleteuser.sql
-- Minimal admin_deleteuser that only deletes from confirmed existing tables

DROP FUNCTION IF EXISTS public.admin_deleteuser(uuid);

CREATE OR REPLACE FUNCTION public.admin_deleteuser(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
    v_user_email text;
    v_error_msg text;
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

    -- Delete from tables we KNOW exist, using dynamic SQL to handle missing tables gracefully
    BEGIN
        -- Update users who have this user as upline
        UPDATE user_profiles SET upline_id = NULL WHERE upline_id = target_user_id;

        -- Core tables that definitely exist
        DELETE FROM policies WHERE user_id = target_user_id;
        DELETE FROM commissions WHERE agent_id = target_user_id;
        DELETE FROM expenses WHERE user_id = target_user_id;

        -- Try to delete from recruiting tables if they exist
        BEGIN
            EXECUTE 'DELETE FROM recruit_checklist_progress WHERE user_id = $1' USING target_user_id;
        EXCEPTION WHEN undefined_table THEN
            -- Table doesn't exist, skip
            NULL;
        END;

        BEGIN
            EXECUTE 'DELETE FROM recruit_phase_progress WHERE user_id = $1' USING target_user_id;
        EXCEPTION WHEN undefined_table THEN
            -- Table doesn't exist, skip
            NULL;
        END;

        -- Try hierarchy invitations
        BEGIN
            EXECUTE 'DELETE FROM hierarchy_invitations WHERE sender_id = $1 OR recipient_id = $1' USING target_user_id;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;

        -- Finally delete the user profile
        DELETE FROM user_profiles WHERE id = target_user_id;

        v_result := json_build_object(
            'success', true,
            'message', format('Successfully deleted user %s', v_user_email),
            'deleted_user_id', target_user_id,
            'deleted_email', v_user_email
        );

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        -- Capture the actual error
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        RAISE EXCEPTION 'Delete failed: %', v_error_msg;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_deleteuser(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_deleteuser(uuid) IS 'Minimal admin delete function that gracefully handles missing tables';