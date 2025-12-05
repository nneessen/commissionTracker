-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251205_002_recruiting_fix_and_reapply.sql
-- Fix and re-apply migration after initial errors

-- ============================================
-- Drop existing objects if they exist (clean slate)
-- ============================================
DROP VIEW IF EXISTS user_delete_dependencies CASCADE;
DROP FUNCTION IF EXISTS soft_delete_user CASCADE;
DROP FUNCTION IF EXISTS hard_delete_user CASCADE;
DROP FUNCTION IF EXISTS restore_deleted_user CASCADE;
DROP VIEW IF EXISTS active_user_profiles CASCADE;

-- ============================================
-- Re-create aggregated view with correct column names
-- ============================================
CREATE OR REPLACE VIEW user_delete_dependencies AS
SELECT
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    -- Count related data
    (SELECT COUNT(*) FROM user_emails WHERE user_id = up.id) as email_count,
    (SELECT COUNT(*) FROM user_documents WHERE user_id = up.id) as document_count,
    (SELECT COUNT(*) FROM user_activity_log WHERE user_id = up.id) as activity_count,
    (SELECT COUNT(*) FROM recruit_checklist_progress WHERE user_id = up.id) as checklist_count,
    (SELECT COUNT(*) FROM user_profiles WHERE upline_id = up.id AND (is_deleted = FALSE OR is_deleted IS NULL)) as downline_count,
    (SELECT COUNT(*) FROM policies WHERE user_id = up.id) as policy_count,
    (SELECT COUNT(*) FROM commissions WHERE user_id = up.id) as commission_count,
    -- Check if user can be deleted
    CASE
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE upline_id = up.id AND (is_deleted = FALSE OR is_deleted IS NULL))
        THEN FALSE
        ELSE TRUE
    END as can_delete,
    -- Generate deletion warnings
    CASE
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE upline_id = up.id AND (is_deleted = FALSE OR is_deleted IS NULL))
        THEN 'Has active downlines - reassign them first'
        WHEN EXISTS (SELECT 1 FROM policies WHERE user_id = up.id)
        THEN 'Has policies - consider archiving instead'
        WHEN EXISTS (SELECT 1 FROM commissions WHERE user_id = up.id)
        THEN 'Has commission records - consider archiving instead'
        ELSE NULL
    END as deletion_warning
FROM user_profiles up
WHERE up.is_deleted = FALSE OR up.is_deleted IS NULL;

-- ============================================
-- Re-create functions with correct references
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_user(
    p_user_id UUID,
    p_deleted_by UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_user_record RECORD;
    v_can_delete BOOLEAN;
    v_warning TEXT;
BEGIN
    -- Check if user exists and get deletion status
    SELECT
        up.*,
        deps.can_delete,
        deps.deletion_warning,
        deps.downline_count,
        deps.policy_count,
        deps.commission_count
    INTO v_user_record
    FROM user_profiles up
    JOIN user_delete_dependencies deps ON deps.id = up.id
    WHERE up.id = p_user_id
    AND (up.is_deleted = FALSE OR up.is_deleted IS NULL);

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found or already deleted'
        );
    END IF;

    -- Check if deletion is blocked
    IF v_user_record.downline_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot delete user with active downlines',
            'downline_count', v_user_record.downline_count,
            'suggestion', 'Reassign downlines before deletion'
        );
    END IF;

    -- Perform soft delete
    UPDATE user_profiles
    SET
        is_deleted = TRUE,
        archived_at = NOW(),
        archived_by = p_deleted_by,
        archive_reason = p_reason
    WHERE id = p_user_id;

    -- Log the deletion
    INSERT INTO user_activity_log (
        user_id,
        action_type,
        details,
        created_at,
        performed_by
    ) VALUES (
        p_user_id,
        'deleted',
        json_build_object(
            'deleted_by', p_deleted_by,
            'reason', p_reason,
            'had_policies', v_user_record.policy_count > 0,
            'had_commissions', v_user_record.commission_count > 0,
            'type', 'soft_delete'
        ),
        NOW(),
        p_deleted_by
    );

    RETURN json_build_object(
        'success', true,
        'message', 'User soft deleted successfully',
        'user_id', p_user_id,
        'archived_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        'deleted_checklist_items', v_user_record.checklist_count
    );

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

    -- Log the hard deletion (to a system audit table if exists)
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
        p_deleted_by,
        NOW()
    ) ON CONFLICT DO NOTHING;

    RETURN json_build_object(
        'success', true,
        'message', 'User permanently deleted',
        'deleted_data', v_deleted_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION restore_deleted_user(
    p_user_id UUID,
    p_restored_by UUID
) RETURNS JSON AS $$
BEGIN
    -- Check if user is soft deleted
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = p_user_id
        AND is_deleted = TRUE
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found or not deleted'
        );
    END IF;

    -- Restore user
    UPDATE user_profiles
    SET
        is_deleted = FALSE,
        archived_at = NULL,
        archived_by = NULL,
        archive_reason = NULL
    WHERE id = p_user_id;

    -- Log restoration (handle the fact that 'restore' might not be a valid action_type)
    INSERT INTO user_activity_log (
        user_id,
        action_type,
        details,
        created_at,
        performed_by
    ) VALUES (
        p_user_id,
        'updated', -- Use 'updated' as 'restore' might not be a valid action_type
        json_build_object(
            'type', 'restore',
            'restored_by', p_restored_by,
            'restored_at', NOW()
        ),
        NOW(),
        p_restored_by
    );

    RETURN json_build_object(
        'success', true,
        'message', 'User restored successfully',
        'user_id', p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Create view for active users only
-- ============================================
CREATE OR REPLACE VIEW active_user_profiles AS
SELECT * FROM user_profiles
WHERE is_deleted = FALSE OR is_deleted IS NULL;

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON user_delete_dependencies TO authenticated;
GRANT SELECT ON active_user_profiles TO authenticated;

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Fixed recruiting migration applied successfully';
    RAISE NOTICE 'All functions and views recreated with correct column references';
END $$;