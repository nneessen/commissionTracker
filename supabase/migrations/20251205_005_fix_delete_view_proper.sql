-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251205_005_fix_delete_view_proper.sql
-- Fix the user_delete_dependencies view by dropping and recreating

-- Drop the old view first
DROP VIEW IF EXISTS user_delete_dependencies CASCADE;

-- Recreate the view to include ALL users
CREATE VIEW user_delete_dependencies AS
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

-- Grant permissions
GRANT SELECT ON user_delete_dependencies TO authenticated;

DO $$
BEGIN
    RAISE NOTICE 'Fixed user_delete_dependencies view - now includes all users';
END $$;