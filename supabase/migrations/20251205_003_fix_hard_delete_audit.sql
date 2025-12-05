-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251205_003_fix_hard_delete_audit.sql
-- Fix hard delete function to handle audit logging properly

CREATE OR REPLACE FUNCTION hard_delete_user(
    p_user_id UUID,
    p_deleted_by UUID,
    p_confirm_text TEXT
) RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
    v_deleted_data JSON;
BEGIN
    -- Safety check - require exact confirmation text
    IF p_confirm_text != 'PERMANENTLY DELETE USER' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Confirmation text must be: PERMANENTLY DELETE USER'
        );
    END IF;

    -- Get user details before deletion
    SELECT
        up.*,
        deps.downline_count,
        deps.email_count,
        deps.document_count,
        deps.activity_count,
        deps.checklist_count
    INTO v_user_record
    FROM user_profiles up
    JOIN user_delete_dependencies deps ON deps.id = up.id
    WHERE up.id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Block if has downlines
    IF v_user_record.downline_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot delete user with active downlines',
            'downline_count', v_user_record.downline_count
        );
    END IF;

    -- Store deletion details
    v_deleted_data := json_build_object(
        'user_id', p_user_id,
        'email', v_user_record.email,
        'name', CONCAT(v_user_record.first_name, ' ', v_user_record.last_name),
        'deleted_emails', v_user_record.email_count,
        'deleted_documents', v_user_record.document_count,
        'deleted_activities', v_user_record.activity_count,
        'deleted_checklist_items', v_user_record.checklist_count,
        'deleted_by', p_deleted_by,
        'self_delete', p_user_id = p_deleted_by
    );

    -- Log the hard deletion BEFORE deleting the user
    -- Use NULL for performed_by if it's a self-delete to avoid foreign key constraint
    INSERT INTO system_audit_log (
        action,
        table_name,
        record_id,
        data,
        performed_by,
        performed_at
    ) VALUES (
        'hard_delete',
        'user_profiles',
        p_user_id,
        v_deleted_data,
        CASE WHEN p_user_id = p_deleted_by THEN NULL ELSE p_deleted_by END,
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Delete in correct order (handle foreign key constraints)
    DELETE FROM recruit_checklist_progress WHERE user_id = p_user_id;
    DELETE FROM user_activity_log WHERE user_id = p_user_id;
    DELETE FROM user_email_attachments WHERE email_id IN (
        SELECT id FROM user_emails WHERE user_id = p_user_id
    );
    DELETE FROM user_emails WHERE user_id = p_user_id;
    DELETE FROM user_documents WHERE user_id = p_user_id;
    DELETE FROM onboarding_phases WHERE user_id = p_user_id;

    -- Finally delete the user profile
    DELETE FROM user_profiles WHERE id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'User permanently deleted',
        'deleted_data', v_deleted_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also, let's allow NULL in the performed_by column for audit log
ALTER TABLE system_audit_log
ALTER COLUMN performed_by DROP NOT NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Fixed hard delete audit logging to handle self-deletion';
END $$;