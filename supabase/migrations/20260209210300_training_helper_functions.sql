-- supabase/migrations/20260209210300_training_helper_functions.sql
-- Training Modules: Helper functions (XP, streaks, badges, completion checks)

-- ============================================================================
-- 1. award_training_xp
-- Inserts XP entry and upserts user_stats.total_xp
-- ============================================================================

CREATE OR REPLACE FUNCTION award_training_xp(
  p_user_id UUID,
  p_xp_amount INT,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get user's imo_id and agency_id
  SELECT imo_id, agency_id INTO v_imo_id, v_agency_id
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User % not found or has no imo_id', p_user_id;
  END IF;

  -- Insert XP entry
  INSERT INTO training_xp_entries (user_id, imo_id, agency_id, xp_amount, source_type, source_id, description)
  VALUES (p_user_id, v_imo_id, v_agency_id, p_xp_amount, p_source_type, p_source_id, p_description);

  -- Upsert user stats with new total
  INSERT INTO training_user_stats (user_id, imo_id, agency_id, total_xp)
  VALUES (p_user_id, v_imo_id, v_agency_id, p_xp_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_xp = training_user_stats.total_xp + p_xp_amount,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION award_training_xp(UUID, INT, TEXT, UUID, TEXT) TO authenticated;

-- ============================================================================
-- 2. update_training_streak
-- Same day = no-op, yesterday = increment, older = reset to 1
-- ============================================================================

CREATE OR REPLACE FUNCTION update_training_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_agency_id UUID;
  v_last_activity DATE;
  v_today DATE := CURRENT_DATE;
  v_new_streak INT;
  v_longest INT;
BEGIN
  -- Get user info
  SELECT imo_id, agency_id INTO v_imo_id, v_agency_id
  FROM user_profiles
  WHERE id = p_user_id;

  -- Get current stats
  SELECT last_activity_date, current_streak_days, longest_streak_days
  INTO v_last_activity, v_new_streak, v_longest
  FROM training_user_stats
  WHERE user_id = p_user_id;

  -- If no stats row yet, create one
  IF NOT FOUND THEN
    INSERT INTO training_user_stats (user_id, imo_id, agency_id, current_streak_days, longest_streak_days, last_activity_date)
    VALUES (p_user_id, v_imo_id, v_agency_id, 1, 1, v_today);
    RETURN;
  END IF;

  -- Same day: no-op
  IF v_last_activity = v_today THEN
    RETURN;
  END IF;

  -- Yesterday: increment streak
  IF v_last_activity = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_new_streak + 1;
  ELSE
    -- Older: reset to 1
    v_new_streak := 1;
  END IF;

  -- Update longest if needed
  IF v_new_streak > v_longest THEN
    v_longest := v_new_streak;
  END IF;

  UPDATE training_user_stats
  SET
    current_streak_days = v_new_streak,
    longest_streak_days = v_longest,
    last_activity_date = v_today,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_training_streak(UUID) TO authenticated;

-- ============================================================================
-- 3. check_training_badges
-- Evaluates all active badge criteria, awards unearned badges + XP
-- ============================================================================

CREATE OR REPLACE FUNCTION check_training_badges(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
  v_agency_id UUID;
  v_badge RECORD;
  v_criteria JSONB;
  v_earned BOOLEAN;
  v_stats RECORD;
BEGIN
  -- Get user info
  SELECT imo_id, agency_id INTO v_imo_id, v_agency_id
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_imo_id IS NULL THEN
    RETURN;
  END IF;

  -- Get user stats
  SELECT * INTO v_stats
  FROM training_user_stats
  WHERE user_id = p_user_id;

  -- Loop through all active badges for the user's IMO that they haven't earned
  FOR v_badge IN
    SELECT b.*
    FROM training_badges b
    WHERE b.imo_id = v_imo_id
      AND b.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM training_user_badges ub
        WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
      )
  LOOP
    v_criteria := v_badge.criteria;
    v_earned := false;

    -- Evaluate criteria based on type
    CASE v_criteria->>'type'
      WHEN 'total_xp' THEN
        v_earned := COALESCE(v_stats.total_xp, 0) >= (v_criteria->>'min_xp')::INT;

      WHEN 'streak_days' THEN
        v_earned := COALESCE(v_stats.current_streak_days, 0) >= (v_criteria->>'min_days')::INT;

      WHEN 'lessons_completed' THEN
        v_earned := COALESCE(v_stats.lessons_completed, 0) >= (v_criteria->>'min_count')::INT;

      WHEN 'quizzes_passed' THEN
        v_earned := COALESCE(v_stats.quizzes_passed, 0) >= (v_criteria->>'min_count')::INT;

      WHEN 'modules_completed_in_period' THEN
        -- Count modules completed within period_days
        DECLARE
          v_count INT;
        BEGIN
          SELECT COUNT(DISTINCT tp.module_id) INTO v_count
          FROM training_progress tp
          WHERE tp.user_id = p_user_id
            AND tp.status = 'completed'
            AND tp.completed_at >= NOW() - ((v_criteria->>'period_days')::INT || ' days')::INTERVAL;
          v_earned := v_count >= (v_criteria->>'count')::INT;
        END;

      WHEN 'category_modules_complete' THEN
        DECLARE
          v_cat_count INT;
        BEGIN
          SELECT COUNT(DISTINCT tm.id) INTO v_cat_count
          FROM training_modules tm
          WHERE tm.imo_id = v_imo_id
            AND tm.category = v_criteria->>'category'
            AND tm.is_published = true
            AND EXISTS (
              SELECT 1 FROM training_progress tp
              WHERE tp.user_id = p_user_id
                AND tp.module_id = tm.id
                AND tp.status = 'completed'
            );
          v_earned := v_cat_count >= (v_criteria->>'min_count')::INT;
        END;

      WHEN 'module_complete' THEN
        v_earned := EXISTS (
          SELECT 1 FROM training_progress tp
          WHERE tp.user_id = p_user_id
            AND tp.module_id = (v_criteria->>'module_id')::UUID
            AND tp.status = 'completed'
        );

      WHEN 'quiz_avg_score' THEN
        v_earned := COALESCE(v_stats.avg_quiz_score, 0) >= (v_criteria->>'min_score')::DECIMAL
          AND COALESCE(v_stats.quizzes_passed, 0) >= (v_criteria->>'min_attempts')::INT;

      ELSE
        v_earned := false;
    END CASE;

    -- Award badge if earned
    IF v_earned THEN
      INSERT INTO training_user_badges (user_id, badge_id, imo_id, agency_id)
      VALUES (p_user_id, v_badge.id, v_imo_id, v_agency_id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      -- Award badge XP if any
      IF v_badge.xp_reward > 0 THEN
        PERFORM award_training_xp(p_user_id, v_badge.xp_reward, 'badge_earned', v_badge.id, 'Badge earned: ' || v_badge.name);
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_training_badges(UUID) TO authenticated;

-- ============================================================================
-- 4. check_module_completion
-- Returns TRUE if all required lessons in the module are completed
-- ============================================================================

CREATE OR REPLACE FUNCTION check_module_completion(p_user_id UUID, p_module_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_required INT;
  v_completed_required INT;
BEGIN
  -- Count required lessons
  SELECT COUNT(*) INTO v_total_required
  FROM training_lessons
  WHERE module_id = p_module_id AND is_required = true;

  -- If no required lessons, module is not completable
  IF v_total_required = 0 THEN
    RETURN false;
  END IF;

  -- Count completed required lessons
  SELECT COUNT(*) INTO v_completed_required
  FROM training_lessons tl
  JOIN training_progress tp ON tp.lesson_id = tl.id AND tp.user_id = p_user_id
  WHERE tl.module_id = p_module_id
    AND tl.is_required = true
    AND tp.status = 'completed';

  RETURN v_completed_required >= v_total_required;
END;
$$;

GRANT EXECUTE ON FUNCTION check_module_completion(UUID, UUID) TO authenticated;
