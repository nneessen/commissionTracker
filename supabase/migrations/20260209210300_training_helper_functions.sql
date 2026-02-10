-- supabase/migrations/20260209210300_training_helper_functions.sql
-- Training Modules: Helper functions for RLS and triggers

-- ============================================================================
-- 1. is_training_module_manager - Check if user can manage training modules
-- ============================================================================
-- Returns true if user is super_admin, has admin role, or has staff role (trainer, contracting_manager)
-- Used in RLS policies for module management and by frontend permission checks
CREATE OR REPLACE FUNCTION is_training_module_manager(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_roles TEXT[];
  v_is_super_admin BOOLEAN;
BEGIN
  SELECT roles, is_super_admin INTO v_roles, v_is_super_admin
  FROM user_profiles WHERE id = p_user_id;

  IF v_is_super_admin = TRUE THEN RETURN TRUE; END IF;

  RETURN v_roles && ARRAY['admin', 'trainer', 'contracting_manager']::TEXT[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. update_training_user_stats - Trigger to auto-update stats on XP insert
-- ============================================================================
CREATE OR REPLACE FUNCTION update_training_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Upsert user stats: increment total_xp, update last_activity_date
  INSERT INTO training_user_stats (user_id, imo_id, agency_id, total_xp, last_activity_date, updated_at)
  VALUES (NEW.user_id, NEW.imo_id, NEW.agency_id, NEW.xp_amount, CURRENT_DATE, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_xp = training_user_stats.total_xp + NEW.xp_amount,
    last_activity_date = CURRENT_DATE,
    -- Update streak: if last activity was yesterday, increment; if today, keep; otherwise reset to 1
    current_streak_days = CASE
      WHEN training_user_stats.last_activity_date = CURRENT_DATE THEN training_user_stats.current_streak_days
      WHEN training_user_stats.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN training_user_stats.current_streak_days + 1
      ELSE 1
    END,
    longest_streak_days = GREATEST(
      training_user_stats.longest_streak_days,
      CASE
        WHEN training_user_stats.last_activity_date = CURRENT_DATE THEN training_user_stats.current_streak_days
        WHEN training_user_stats.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN training_user_stats.current_streak_days + 1
        ELSE 1
      END
    ),
    -- Increment counters based on source_type
    lessons_completed = training_user_stats.lessons_completed + CASE WHEN NEW.source_type = 'lesson_complete' THEN 1 ELSE 0 END,
    modules_completed = training_user_stats.modules_completed + CASE WHEN NEW.source_type = 'module_complete' THEN 1 ELSE 0 END,
    quizzes_passed = training_user_stats.quizzes_passed + CASE WHEN NEW.source_type = 'quiz_pass' THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to training_xp_entries
CREATE OR REPLACE TRIGGER training_xp_entries_update_stats
  AFTER INSERT ON training_xp_entries
  FOR EACH ROW EXECUTE FUNCTION update_training_user_stats();
