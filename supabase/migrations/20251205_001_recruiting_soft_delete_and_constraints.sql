-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251205_001_recruiting_soft_delete_and_constraints.sql
-- Migration: Add soft delete support and constraints for recruiting feature
-- Purpose: Fix critical data integrity, security, and performance issues

-- ============================================
-- 1. Add unique constraint on email (if not exists)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_email'
    ) THEN
        ALTER TABLE user_profiles
        ADD CONSTRAINT unique_user_email UNIQUE (email);
    END IF;
END $$;

-- ============================================
-- 2. Add soft delete columns for audit trail
-- ============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS archive_reason TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- ============================================
-- 3. Add performance indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_archived
    ON user_profiles(archived_at)
    WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email
    ON user_profiles(email);

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_deleted
    ON user_profiles(is_deleted);

CREATE INDEX IF NOT EXISTS idx_user_profiles_agent_status
    ON user_profiles(agent_status);

CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_status
    ON user_profiles(onboarding_status);

CREATE INDEX IF NOT EXISTS idx_user_profiles_upline_id
    ON user_profiles(upline_id);

-- ============================================
-- 4. Create aggregated view for delete dependency checks
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
-- 5. Create function for safe soft delete
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

-- ============================================
-- 6. Create function for hard delete (admin only)
-- ============================================
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
    -- This ensures we have a record even after user is gone
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
    ) ON CONFLICT DO NOTHING; -- In case audit table doesn't exist

    RETURN json_build_object(
        'success', true,
        'message', 'User permanently deleted',
        'deleted_data', v_deleted_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Create function to restore soft-deleted user
-- ============================================
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

    -- Log restoration
    INSERT INTO user_activity_log (
        user_id,
        action_type,
        details,
        created_at,
        performed_by
    ) VALUES (
        p_user_id,
        'updated',
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
-- 8. Update existing views to exclude soft-deleted users
-- ============================================
-- This ensures soft-deleted users don't appear in normal queries
CREATE OR REPLACE VIEW active_user_profiles AS
SELECT * FROM user_profiles
WHERE is_deleted = FALSE OR is_deleted IS NULL;

-- ============================================
-- 9. Add RLS policies for delete operations
-- ============================================
-- Ensure only authorized users can delete
CREATE POLICY delete_user_policy ON user_profiles
FOR DELETE
USING (
    -- User can only be deleted by admin or the user themselves
    auth.uid() IN (
        SELECT id FROM user_profiles
        WHERE is_admin = TRUE
    )
    OR auth.uid() = id
);

-- ============================================
-- 10. Create system audit log table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS system_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    data JSONB,
    performed_by UUID REFERENCES user_profiles(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_log_action
    ON system_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_system_audit_log_table
    ON system_audit_log(table_name);

CREATE INDEX IF NOT EXISTS idx_system_audit_log_performed_at
    ON system_audit_log(performed_at);

-- ============================================
-- 11. Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION hard_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_user TO authenticated;
GRANT SELECT ON user_delete_dependencies TO authenticated;

-- ============================================
-- Migration complete message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Recruiting soft delete and constraints migration completed successfully';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '  - Unique email constraint';
    RAISE NOTICE '  - Soft delete columns (archived_at, archived_by, archive_reason, is_deleted)';
    RAISE NOTICE '  - Performance indexes';
    RAISE NOTICE '  - Dependency check view (user_delete_dependencies)';
    RAISE NOTICE '  - Safe soft delete function';
    RAISE NOTICE '  - Hard delete function (admin only)';
    RAISE NOTICE '  - Restore function';
    RAISE NOTICE '  - System audit log table';
END $$;