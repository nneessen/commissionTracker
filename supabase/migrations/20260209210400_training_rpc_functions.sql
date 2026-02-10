-- supabase/migrations/20260209210400_training_rpc_functions.sql
-- Training Modules: RPC functions called by frontend services

-- ============================================================================
-- 1. complete_training_lesson
-- Called by trainingProgressService.completeLesson()
-- Returns: {xp_earned, module_completed, lesson_id}
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_training_lesson(
  p_lesson_id UUID,
  p_time_spent_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_lesson RECORD;
  v_module RECORD;
  v_imo_id UUID;
  v_agency_id UUID;
  v_xp_earned INT := 0;
  v_module_completed BOOLEAN := false;
BEGIN
  -- Get user info
  SELECT imo_id, agency_id INTO v_imo_id, v_agency_id
  FROM user_profiles WHERE id = v_user_id;

  -- Get lesson info
  SELECT tl.*, tm.xp_reward AS module_xp_reward, tm.id AS mod_id
  INTO v_lesson
  FROM training_lessons tl
  JOIN training_modules tm ON tm.id = tl.module_id
  WHERE tl.id = p_lesson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson % not found', p_lesson_id;
  END IF;

  -- Upsert progress to completed
  INSERT INTO training_progress (
    user_id, lesson_id, module_id, imo_id, agency_id,
    status, started_at, completed_at, time_spent_seconds, last_accessed_at
  )
  VALUES (
    v_user_id, p_lesson_id, v_lesson.module_id, v_imo_id, v_agency_id,
    'completed', NOW(), NOW(), p_time_spent_seconds, NOW()
  )
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    status = 'completed',
    completed_at = COALESCE(training_progress.completed_at, NOW()),
    time_spent_seconds = training_progress.time_spent_seconds + p_time_spent_seconds,
    last_accessed_at = NOW(),
    updated_at = NOW();

  -- Award lesson XP
  v_xp_earned := v_lesson.xp_reward;
  IF v_xp_earned > 0 THEN
    PERFORM award_training_xp(v_user_id, v_xp_earned, 'lesson_complete', p_lesson_id, 'Lesson completed: ' || v_lesson.title);
  END IF;

  -- Update stats: lessons_completed, total_time_spent_seconds
  INSERT INTO training_user_stats (user_id, imo_id, agency_id, lessons_completed, total_time_spent_seconds)
  VALUES (v_user_id, v_imo_id, v_agency_id, 1, p_time_spent_seconds)
  ON CONFLICT (user_id)
  DO UPDATE SET
    lessons_completed = training_user_stats.lessons_completed + 1,
    total_time_spent_seconds = training_user_stats.total_time_spent_seconds + p_time_spent_seconds,
    updated_at = NOW();

  -- Update streak
  PERFORM update_training_streak(v_user_id);

  -- Check module completion
  v_module_completed := check_module_completion(v_user_id, v_lesson.module_id);

  IF v_module_completed THEN
    -- Award module XP
    IF v_lesson.module_xp_reward > 0 THEN
      v_xp_earned := v_xp_earned + v_lesson.module_xp_reward;
      PERFORM award_training_xp(v_user_id, v_lesson.module_xp_reward, 'module_complete', v_lesson.module_id, 'Module completed');
    END IF;

    -- Update stats: modules_completed
    UPDATE training_user_stats
    SET modules_completed = modules_completed + 1, updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;

  -- Check badges
  PERFORM check_training_badges(v_user_id);

  RETURN jsonb_build_object(
    'xp_earned', v_xp_earned,
    'module_completed', v_module_completed,
    'lesson_id', p_lesson_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_training_lesson(UUID, INT) TO authenticated;

-- ============================================================================
-- 2. submit_training_quiz_attempt
-- Called by trainingQuizService.submitAttempt()
-- Returns: {score_percentage, score_points, max_points, passed, attempt_number, xp_earned, answers}
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_training_quiz_attempt(
  p_quiz_id UUID,
  p_answers JSONB,
  p_time_taken_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quiz RECORD;
  v_lesson RECORD;
  v_imo_id UUID;
  v_agency_id UUID;
  v_attempt_number INT;
  v_score_points INT := 0;
  v_max_points INT := 0;
  v_score_percentage DECIMAL;
  v_passed BOOLEAN;
  v_xp_earned INT := 0;
  v_answer RECORD;
  v_question RECORD;
  v_correct_option_ids UUID[];
  v_selected_ids UUID[];
  v_is_correct BOOLEAN;
  v_graded_answers JSONB := '[]'::JSONB;
BEGIN
  -- Get user info
  SELECT imo_id, agency_id INTO v_imo_id, v_agency_id
  FROM user_profiles WHERE id = v_user_id;

  -- Get quiz info
  SELECT tq.*, tl.module_id, tl.id AS l_id, tl.xp_reward AS lesson_xp
  INTO v_quiz
  FROM training_quizzes tq
  JOIN training_lessons tl ON tl.id = tq.lesson_id
  WHERE tq.id = p_quiz_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz % not found', p_quiz_id;
  END IF;

  -- Count existing attempts
  SELECT COALESCE(MAX(attempt_number), 0) INTO v_attempt_number
  FROM training_quiz_attempts
  WHERE quiz_id = p_quiz_id AND user_id = v_user_id;

  v_attempt_number := v_attempt_number + 1;

  -- Validate max attempts
  IF v_attempt_number > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Max attempts (%) reached for quiz %', v_quiz.max_attempts, p_quiz_id;
  END IF;

  -- Get max points
  SELECT COALESCE(SUM(points), 0) INTO v_max_points
  FROM training_quiz_questions
  WHERE quiz_id = p_quiz_id;

  -- Grade each answer
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    -- Get question
    SELECT * INTO v_question
    FROM training_quiz_questions
    WHERE id = (v_answer.value->>'question_id')::UUID;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Get correct option IDs
    SELECT ARRAY_AGG(id) INTO v_correct_option_ids
    FROM training_quiz_options
    WHERE question_id = v_question.id AND is_correct = true;

    -- Get selected option IDs
    SELECT ARRAY_AGG(val::UUID) INTO v_selected_ids
    FROM jsonb_array_elements_text(v_answer.value->'selected_option_ids') AS val;

    -- Check if correct (exact match of arrays)
    v_is_correct := (
      v_selected_ids IS NOT NULL
      AND v_correct_option_ids IS NOT NULL
      AND ARRAY_LENGTH(v_selected_ids, 1) = ARRAY_LENGTH(v_correct_option_ids, 1)
      AND v_selected_ids @> v_correct_option_ids
      AND v_correct_option_ids @> v_selected_ids
    );

    IF v_is_correct THEN
      v_score_points := v_score_points + v_question.points;
    END IF;

    -- Build graded answer
    v_graded_answers := v_graded_answers || jsonb_build_object(
      'question_id', v_question.id,
      'selected_option_ids', v_answer.value->'selected_option_ids',
      'is_correct', v_is_correct
    );
  END LOOP;

  -- Calculate percentage
  IF v_max_points > 0 THEN
    v_score_percentage := ROUND((v_score_points::DECIMAL / v_max_points::DECIMAL) * 100, 2);
  ELSE
    v_score_percentage := 0;
  END IF;

  v_passed := v_score_percentage >= v_quiz.pass_threshold;

  -- Record attempt
  INSERT INTO training_quiz_attempts (
    user_id, quiz_id, lesson_id, module_id, imo_id, agency_id,
    score_percentage, score_points, max_points, passed,
    answers, time_taken_seconds, attempt_number
  )
  VALUES (
    v_user_id, p_quiz_id, v_quiz.l_id, v_quiz.module_id, v_imo_id, v_agency_id,
    v_score_percentage, v_score_points, v_max_points, v_passed,
    v_graded_answers, p_time_taken_seconds, v_attempt_number
  );

  -- Award XP on pass
  IF v_passed THEN
    -- Lesson XP for quiz pass
    v_xp_earned := v_quiz.lesson_xp;
    IF v_xp_earned > 0 THEN
      PERFORM award_training_xp(v_user_id, v_xp_earned, 'quiz_pass', p_quiz_id, 'Quiz passed');
    END IF;

    -- Perfect score bonus
    IF v_score_percentage = 100 AND v_quiz.xp_bonus_perfect > 0 THEN
      v_xp_earned := v_xp_earned + v_quiz.xp_bonus_perfect;
      PERFORM award_training_xp(v_user_id, v_quiz.xp_bonus_perfect, 'quiz_perfect', p_quiz_id, 'Perfect quiz score');
    END IF;

    -- Update user stats
    -- Calculate running avg_quiz_score
    UPDATE training_user_stats
    SET
      quizzes_passed = quizzes_passed + 1,
      avg_quiz_score = ROUND(((avg_quiz_score * (quizzes_passed)) + v_score_percentage) / (quizzes_passed + 1), 2),
      updated_at = NOW()
    WHERE user_id = v_user_id;

    -- If no stats row exists yet
    IF NOT FOUND THEN
      INSERT INTO training_user_stats (user_id, imo_id, agency_id, quizzes_passed, avg_quiz_score)
      VALUES (v_user_id, v_imo_id, v_agency_id, 1, v_score_percentage);
    END IF;

    -- Update streak
    PERFORM update_training_streak(v_user_id);

    -- Check badges
    PERFORM check_training_badges(v_user_id);
  END IF;

  RETURN jsonb_build_object(
    'score_percentage', v_score_percentage,
    'score_points', v_score_points,
    'max_points', v_max_points,
    'passed', v_passed,
    'attempt_number', v_attempt_number,
    'xp_earned', v_xp_earned,
    'answers', v_graded_answers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_training_quiz_attempt(UUID, JSONB, INT) TO authenticated;

-- ============================================================================
-- 3. get_training_leaderboard
-- Called by trainingGamificationService.getLeaderboard()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_training_leaderboard(
  p_agency_id UUID,
  p_period TEXT DEFAULT 'all_time'
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  total_xp INT,
  modules_completed INT,
  current_streak_days INT,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    up.full_name,
    s.total_xp,
    s.modules_completed,
    s.current_streak_days,
    RANK() OVER (ORDER BY s.total_xp DESC)::BIGINT AS rank
  FROM training_user_stats s
  JOIN user_profiles up ON up.id = s.user_id
  WHERE s.agency_id = p_agency_id
  ORDER BY s.total_xp DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION get_training_leaderboard(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 4. get_skill_radar_data
-- Called by trainingGamificationService.getSkillRadarData()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_skill_radar_data(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  category TEXT,
  completed_modules INT,
  total_modules INT,
  proficiency_pct INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_imo_id UUID;
BEGIN
  SELECT imo_id INTO v_imo_id
  FROM user_profiles WHERE id = v_user_id;

  RETURN QUERY
  SELECT
    tm.category,
    COUNT(DISTINCT CASE
      WHEN check_module_completion(v_user_id, tm.id) THEN tm.id
    END)::INT AS completed_modules,
    COUNT(DISTINCT tm.id)::INT AS total_modules,
    CASE
      WHEN COUNT(DISTINCT tm.id) = 0 THEN 0
      ELSE ROUND(
        (COUNT(DISTINCT CASE WHEN check_module_completion(v_user_id, tm.id) THEN tm.id END)::DECIMAL
        / COUNT(DISTINCT tm.id)::DECIMAL) * 100
      )::INT
    END AS proficiency_pct
  FROM training_modules tm
  WHERE tm.imo_id = v_imo_id
    AND tm.is_published = true
  GROUP BY tm.category;
END;
$$;

GRANT EXECUTE ON FUNCTION get_skill_radar_data(UUID) TO authenticated;

-- ============================================================================
-- 5. get_module_progress_summary
-- Called by trainingProgressService.getModuleProgressSummary()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_module_progress_summary(
  p_module_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  lesson_id UUID,
  lesson_title TEXT,
  lesson_type TEXT,
  sort_order INT,
  is_required BOOLEAN,
  status TEXT,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  RETURN QUERY
  SELECT
    tl.id AS lesson_id,
    tl.title AS lesson_title,
    tl.lesson_type,
    tl.sort_order,
    tl.is_required,
    COALESCE(tp.status, 'not_started') AS status,
    tp.completed_at,
    COALESCE(tp.time_spent_seconds, 0) AS time_spent_seconds
  FROM training_lessons tl
  LEFT JOIN training_progress tp ON tp.lesson_id = tl.id AND tp.user_id = v_user_id
  WHERE tl.module_id = p_module_id
  ORDER BY tl.sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_module_progress_summary(UUID, UUID) TO authenticated;
