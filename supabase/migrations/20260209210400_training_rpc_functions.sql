-- supabase/migrations/20260209210400_training_rpc_functions.sql
-- Training Modules: RPC functions for lesson completion, quiz grading, leaderboard, etc.

-- ============================================================================
-- 1. complete_training_lesson
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_training_lesson(
  p_lesson_id UUID,
  p_time_spent_seconds INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_lesson RECORD;
  v_module RECORD;
  v_progress RECORD;
  v_xp_earned INTEGER := 0;
  v_module_completed BOOLEAN := FALSE;
  v_all_required_done BOOLEAN;
  v_user_profile RECORD;
BEGIN
  -- Get lesson info
  SELECT l.*, m.xp_reward AS module_xp, m.id AS mod_id, m.imo_id AS mod_imo_id
  INTO v_lesson
  FROM training_lessons l
  JOIN training_modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id;

  IF v_lesson IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  -- Get user profile for imo_id and agency_id
  SELECT imo_id, agency_id INTO v_user_profile FROM user_profiles WHERE id = v_user_id;

  -- Update progress to completed
  INSERT INTO training_progress (user_id, lesson_id, module_id, imo_id, agency_id, status, started_at, completed_at, time_spent_seconds, last_accessed_at)
  VALUES (v_user_id, p_lesson_id, v_lesson.module_id, v_user_profile.imo_id, v_user_profile.agency_id, 'completed', NOW(), NOW(), p_time_spent_seconds, NOW())
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    status = 'completed',
    completed_at = NOW(),
    time_spent_seconds = training_progress.time_spent_seconds + p_time_spent_seconds,
    last_accessed_at = NOW();

  -- Award lesson XP
  v_xp_earned := v_lesson.xp_reward;
  INSERT INTO training_xp_entries (user_id, imo_id, agency_id, xp_amount, source_type, source_id, description)
  VALUES (v_user_id, v_user_profile.imo_id, v_user_profile.agency_id, v_xp_earned, 'lesson_complete', p_lesson_id, 'Completed lesson: ' || v_lesson.title);

  -- Check if all required lessons in the module are completed
  SELECT NOT EXISTS (
    SELECT 1 FROM training_lessons tl
    WHERE tl.module_id = v_lesson.module_id
    AND tl.is_required = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM training_progress tp
      WHERE tp.lesson_id = tl.id
      AND tp.user_id = v_user_id
      AND tp.status = 'completed'
    )
  ) INTO v_all_required_done;

  -- If all required lessons done, mark module assignment as completed and award module XP
  IF v_all_required_done THEN
    v_module_completed := TRUE;

    -- Update assignment status
    UPDATE training_assignments
    SET status = 'completed', completed_at = NOW()
    WHERE module_id = v_lesson.module_id
    AND assigned_to = v_user_id
    AND status = 'active';

    -- Award module completion XP
    INSERT INTO training_xp_entries (user_id, imo_id, agency_id, xp_amount, source_type, source_id, description)
    VALUES (v_user_id, v_user_profile.imo_id, v_user_profile.agency_id, v_lesson.module_xp, 'module_complete', v_lesson.module_id, 'Completed module');

    v_xp_earned := v_xp_earned + v_lesson.module_xp;
  END IF;

  -- Update time spent in user stats
  UPDATE training_user_stats
  SET total_time_spent_seconds = total_time_spent_seconds + p_time_spent_seconds
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'xp_earned', v_xp_earned,
    'module_completed', v_module_completed,
    'lesson_id', p_lesson_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. submit_training_quiz_attempt
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_training_quiz_attempt(
  p_quiz_id UUID,
  p_answers JSONB,
  p_time_taken_seconds INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quiz RECORD;
  v_lesson RECORD;
  v_user_profile RECORD;
  v_answer RECORD;
  v_question RECORD;
  v_correct_option_ids UUID[];
  v_selected_ids UUID[];
  v_is_correct BOOLEAN;
  v_score_points INTEGER := 0;
  v_max_points INTEGER := 0;
  v_score_percentage NUMERIC;
  v_passed BOOLEAN;
  v_attempt_number INTEGER;
  v_xp_earned INTEGER := 0;
  v_graded_answers JSONB := '[]'::JSONB;
BEGIN
  -- Get quiz info
  SELECT q.*, l.module_id, l.xp_reward AS lesson_xp, l.title AS lesson_title
  INTO v_quiz
  FROM training_quizzes q
  JOIN training_lessons l ON l.id = q.lesson_id
  WHERE q.id = p_quiz_id;

  IF v_quiz IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  -- Get user profile
  SELECT imo_id, agency_id INTO v_user_profile FROM user_profiles WHERE id = v_user_id;

  -- Get attempt number
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
  FROM training_quiz_attempts
  WHERE quiz_id = p_quiz_id AND user_id = v_user_id;

  -- Check max attempts
  IF v_attempt_number > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Maximum attempts exceeded';
  END IF;

  -- Grade each answer
  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    -- Get question
    SELECT * INTO v_question
    FROM training_quiz_questions
    WHERE id = (v_answer.value->>'question_id')::UUID;

    IF v_question IS NULL THEN CONTINUE; END IF;

    v_max_points := v_max_points + v_question.points;

    -- Get correct option IDs for this question
    SELECT ARRAY_AGG(id) INTO v_correct_option_ids
    FROM training_quiz_options
    WHERE question_id = v_question.id AND is_correct = TRUE;

    -- Get selected option IDs from answer
    SELECT ARRAY_AGG(elem::UUID) INTO v_selected_ids
    FROM jsonb_array_elements_text(v_answer.value->'selected_option_ids') AS elem;

    -- Check if answer is correct (exact match of selected vs correct)
    v_is_correct := (v_selected_ids IS NOT NULL AND v_correct_option_ids IS NOT NULL
      AND v_selected_ids @> v_correct_option_ids AND v_correct_option_ids @> v_selected_ids);

    IF v_is_correct THEN
      v_score_points := v_score_points + v_question.points;
    END IF;

    -- Add graded answer
    v_graded_answers := v_graded_answers || jsonb_build_object(
      'question_id', v_question.id,
      'selected_option_ids', v_answer.value->'selected_option_ids',
      'is_correct', v_is_correct
    );
  END LOOP;

  -- Calculate score percentage
  v_score_percentage := CASE WHEN v_max_points > 0 THEN ROUND((v_score_points::NUMERIC / v_max_points) * 100, 1) ELSE 0 END;
  v_passed := v_score_percentage >= v_quiz.pass_threshold;

  -- Insert quiz attempt
  INSERT INTO training_quiz_attempts (
    user_id, quiz_id, lesson_id, module_id, imo_id, agency_id,
    score_percentage, score_points, max_points, passed, answers,
    time_taken_seconds, attempt_number, completed_at
  ) VALUES (
    v_user_id, p_quiz_id, v_quiz.lesson_id, v_quiz.module_id,
    v_user_profile.imo_id, v_user_profile.agency_id,
    v_score_percentage, v_score_points, v_max_points, v_passed,
    v_graded_answers, p_time_taken_seconds, v_attempt_number, NOW()
  );

  -- Award XP if passed
  IF v_passed THEN
    v_xp_earned := v_quiz.lesson_xp;
    INSERT INTO training_xp_entries (user_id, imo_id, agency_id, xp_amount, source_type, source_id, description)
    VALUES (v_user_id, v_user_profile.imo_id, v_user_profile.agency_id, v_xp_earned, 'quiz_pass', p_quiz_id, 'Passed quiz: ' || v_quiz.lesson_title);

    -- Perfect score bonus
    IF v_score_percentage = 100 THEN
      INSERT INTO training_xp_entries (user_id, imo_id, agency_id, xp_amount, source_type, source_id, description)
      VALUES (v_user_id, v_user_profile.imo_id, v_user_profile.agency_id, v_quiz.xp_bonus_perfect, 'quiz_perfect', p_quiz_id, 'Perfect score bonus');
      v_xp_earned := v_xp_earned + v_quiz.xp_bonus_perfect;
    END IF;

    -- Mark lesson progress as completed
    INSERT INTO training_progress (user_id, lesson_id, module_id, imo_id, agency_id, status, completed_at, time_spent_seconds, last_accessed_at)
    VALUES (v_user_id, v_quiz.lesson_id, v_quiz.module_id, v_user_profile.imo_id, v_user_profile.agency_id, 'completed', NOW(), p_time_taken_seconds, NOW())
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET
      status = 'completed',
      completed_at = NOW(),
      time_spent_seconds = training_progress.time_spent_seconds + p_time_taken_seconds,
      last_accessed_at = NOW();
  END IF;

  RETURN json_build_object(
    'score_percentage', v_score_percentage,
    'score_points', v_score_points,
    'max_points', v_max_points,
    'passed', v_passed,
    'attempt_number', v_attempt_number,
    'xp_earned', v_xp_earned,
    'answers', v_graded_answers
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. get_training_leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_training_leaderboard(
  p_agency_id UUID,
  p_period TEXT DEFAULT 'all_time'
)
RETURNS SETOF JSON AS $$
BEGIN
  IF p_period = 'all_time' THEN
    RETURN QUERY
    SELECT json_build_object(
      'user_id', s.user_id,
      'full_name', CONCAT(up.first_name, ' ', up.last_name),
      'total_xp', s.total_xp,
      'modules_completed', s.modules_completed,
      'current_streak_days', s.current_streak_days,
      'rank', ROW_NUMBER() OVER (ORDER BY s.total_xp DESC)
    )
    FROM training_user_stats s
    JOIN user_profiles up ON up.id = s.user_id
    WHERE s.agency_id = p_agency_id
    ORDER BY s.total_xp DESC
    LIMIT 50;
  ELSE
    -- Period-based: aggregate XP from xp_entries within the time window
    RETURN QUERY
    SELECT json_build_object(
      'user_id', xe.user_id,
      'full_name', CONCAT(up.first_name, ' ', up.last_name),
      'total_xp', SUM(xe.xp_amount),
      'modules_completed', COALESCE(s.modules_completed, 0),
      'current_streak_days', COALESCE(s.current_streak_days, 0),
      'rank', ROW_NUMBER() OVER (ORDER BY SUM(xe.xp_amount) DESC)
    )
    FROM training_xp_entries xe
    JOIN user_profiles up ON up.id = xe.user_id
    LEFT JOIN training_user_stats s ON s.user_id = xe.user_id
    WHERE xe.agency_id = p_agency_id
    AND xe.created_at >= CASE
      WHEN p_period = 'week' THEN NOW() - INTERVAL '7 days'
      WHEN p_period = 'month' THEN NOW() - INTERVAL '30 days'
      ELSE '1970-01-01'::TIMESTAMPTZ
    END
    GROUP BY xe.user_id, up.first_name, up.last_name, s.modules_completed, s.current_streak_days
    ORDER BY SUM(xe.xp_amount) DESC
    LIMIT 50;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 4. get_module_progress_summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_module_progress_summary(
  p_module_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS SETOF JSON AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'lesson_id', l.id,
    'lesson_title', l.title,
    'lesson_type', l.lesson_type,
    'sort_order', l.sort_order,
    'is_required', l.is_required,
    'status', COALESCE(p.status, 'not_started'),
    'completed_at', p.completed_at,
    'time_spent_seconds', COALESCE(p.time_spent_seconds, 0)
  )
  FROM training_lessons l
  LEFT JOIN training_progress p ON p.lesson_id = l.id AND p.user_id = p_user_id
  WHERE l.module_id = p_module_id
  ORDER BY l.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 5. get_skill_radar_data
-- ============================================================================
CREATE OR REPLACE FUNCTION get_skill_radar_data(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS SETOF JSON AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'category', m.category,
    'completed_modules', COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.module_id END),
    'total_modules', COUNT(DISTINCT m.id),
    'proficiency_pct', CASE
      WHEN COUNT(DISTINCT m.id) > 0
      THEN ROUND((COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.module_id END)::NUMERIC / COUNT(DISTINCT m.id)) * 100)
      ELSE 0
    END
  )
  FROM training_modules m
  LEFT JOIN training_assignments a ON a.module_id = m.id AND a.assigned_to = p_user_id
  WHERE m.is_published = TRUE
  AND m.imo_id = (SELECT imo_id FROM user_profiles WHERE id = p_user_id)
  GROUP BY m.category
  ORDER BY m.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
