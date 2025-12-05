-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251205_004_fix_delete_view_and_function.sql
-- Fix the user_delete_dependencies view and soft_delete_user function

-- ============================================
-- 1. Fix the view to include ALL users (not just active ones)
-- ============================================
CREATE OR REPLACE VIEW user_delete_dependencies AS
SELECT
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    up.is_deleted,
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
        WHEN up.is_deleted = TRUE THEN FALSE -- Already deleted
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE upline_id = up.id AND (is_deleted = FALSE OR is_deleted IS NULL))
        THEN FALSE
        ELSE TRUE
    END as can_delete,
    -- Generate deletion warnings
    CASE
        WHEN up.is_deleted = TRUE THEN 'User is already deleted'
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE upline_id = up.id AND (is_deleted = FALSE OR is_deleted IS NULL))
        THEN 'Has active downlines - reassign them first'
        WHEN EXISTS (SELECT 1 FROM policies WHERE user_id = up.id)
        THEN 'Has policies - consider archiving instead'
        WHEN EXISTS (SELECT 1 FROM commissions WHERE user_id = up.id)
        THEN 'Has commission records - consider archiving instead'
        ELSE NULL
    END as deletion_warning
FROM user_profiles up;

-- ============================================
-- 2. Fix soft_delete_user to use LEFT JOIN
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_user(
    p_user_id UUID,
    p_deleted_by UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    -- Check if user exists and get deletion status
    SELECT
        up.*,
        COALESCE(deps.can_delete, FALSE) as can_delete,
        deps.deletion_warning,
        COALESCE(deps.downline_count, 0) as downline_count,
        COALESCE(deps.policy_count, 0) as policy_count,
        COALESCE(deps.commission_count, 0) as commission_count
    INTO v_user_record
    FROM user_profiles up
    LEFT JOIN user_delete_dependencies deps ON deps.id = up.id
    WHERE up.id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Check if already deleted
    IF v_user_record.is_deleted = TRUE THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is already deleted'
        );
    END IF;

    -- Check if deletion is blocked by downlines
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

-- ============================================
-- 3. Also fix hard_delete_user to use LEFT JOIN
-- ============================================
CREATE OR REPLACE FUNCTION hard_delete_user(
    p_user_id UUID,
    p_deleted_by UUID,
    p_confirm_text TEXT
) RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
    v_deleted_data JSON;
    v_self_delete BOOLEAN;
BEGIN
    -- Safety check - require exact confirmation text
    IF p_confirm_text != 'PERMANENTLY DELETE USER' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Confirmation text must be: PERMANENTLY DELETE USER'
        );
    END IF;

    -- Check if this is a self-deletion
    v_self_delete := (p_user_id = p_deleted_by);

    -- Get user details before deletion
    SELECT
        up.*,
        COALESCE(deps.downline_count, 0) as downline_count,
        COALESCE(deps.email_count, 0) as email_count,
        COALESCE(deps.document_count, 0) as document_count,
        COALESCE(deps.activity_count, 0) as activity_count,
        COALESCE(deps.checklist_count, 0) as checklist_count
    INTO v_user_record
    FROM user_profiles up
    LEFT JOIN user_delete_dependencies deps ON deps.id = up.id
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
        'deleted_activities', v_user_record.activity_count + 1, -- +1 for the deletion log itself
        'deleted_checklist_items', v_user_record.checklist_count,
        'deleted_by', p_deleted_by,
        'self_delete', v_self_delete
    );

    -- Delete in correct order (handle foreign key constraints)
    DELETE FROM recruit_checklist_progress WHERE user_id = p_user_id;
    DELETE FROM user_activity_log WHERE user_id = p_user_id OR performed_by = p_user_id;
    DELETE FROM user_email_attachments WHERE email_id IN (
        SELECT id FROM user_emails WHERE user_id = p_user_id
    );
    DELETE FROM user_emails WHERE user_id = p_user_id;
    DELETE FROM user_documents WHERE user_id = p_user_id;
    DELETE FROM onboarding_phases WHERE user_id = p_user_id;
    DELETE FROM recruit_phase_progress WHERE user_id = p_user_id;

    -- Finally delete the user profile
    DELETE FROM user_profiles WHERE id = p_user_id;

    -- Log the hard deletion (to a system audit table if exists)
    IF NOT v_self_delete THEN
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
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'User permanently deleted',
        'deleted_data', v_deleted_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Reset any Test Recruit that might be stuck as deleted
-- ============================================
UPDATE user_profiles
SET is_deleted = FALSE,
    archived_at = NULL,
    archived_by = NULL,
    archive_reason = NULL
WHERE email = 'test@test.com'
   OR (first_name = 'Test' AND last_name = 'Recruit');

-- Grant permissions
GRANT SELECT ON user_delete_dependencies TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION hard_delete_user TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Fixed delete view and functions:';
    RAISE NOTICE '  - View now includes all users (not filtered by is_deleted)';
    RAISE NOTICE '  - Functions use LEFT JOIN to handle missing view records';
    RAISE NOTICE '  - Reset any Test Recruit records';
END $$;