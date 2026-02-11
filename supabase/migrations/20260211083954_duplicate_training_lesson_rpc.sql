-- supabase/migrations/20260211083954_duplicate_training_lesson_rpc.sql
-- Deep-copies a training lesson including content blocks, quiz, questions, and options.
-- Returns the newly created lesson row.

CREATE OR REPLACE FUNCTION public.duplicate_training_lesson(p_lesson_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source training_lessons%ROWTYPE;
  v_new_lesson_id uuid;
  v_new_sort_order int;
  v_new_quiz_id uuid;
  v_question record;
  v_new_question_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Fetch the source lesson
  SELECT * INTO v_source
  FROM training_lessons
  WHERE id = p_lesson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found: %', p_lesson_id;
  END IF;

  -- 2. Determine new sort_order (append to end of module)
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_new_sort_order
  FROM training_lessons
  WHERE module_id = v_source.module_id;

  -- 3. Insert new lesson
  INSERT INTO training_lessons (
    module_id, imo_id, title, description, sort_order,
    lesson_type, xp_reward, is_required, estimated_duration_minutes
  ) VALUES (
    v_source.module_id,
    v_source.imo_id,
    v_source.title || ' (Copy)',
    v_source.description,
    v_new_sort_order,
    v_source.lesson_type,
    v_source.xp_reward,
    v_source.is_required,
    v_source.estimated_duration_minutes
  ) RETURNING id INTO v_new_lesson_id;

  -- 4. Copy all content blocks
  INSERT INTO training_lesson_content (
    lesson_id, imo_id, content_type, sort_order, title,
    rich_text_content, video_url, video_platform, document_id,
    external_url, external_url_label, script_prompt_text,
    script_prompt_instructions, metadata
  )
  SELECT
    v_new_lesson_id, imo_id, content_type, sort_order, title,
    rich_text_content, video_url, video_platform, document_id,
    external_url, external_url_label, script_prompt_text,
    script_prompt_instructions, metadata
  FROM training_lesson_content
  WHERE lesson_id = p_lesson_id
  ORDER BY sort_order;

  -- 5. If quiz lesson, copy quiz → questions → options
  IF v_source.lesson_type = 'quiz' THEN
    -- Copy the quiz
    INSERT INTO training_quizzes (
      lesson_id, imo_id, pass_threshold, max_attempts,
      shuffle_questions, shuffle_options, show_correct_answers,
      time_limit_minutes, xp_bonus_perfect
    )
    SELECT
      v_new_lesson_id, imo_id, pass_threshold, max_attempts,
      shuffle_questions, shuffle_options, show_correct_answers,
      time_limit_minutes, xp_bonus_perfect
    FROM training_quizzes
    WHERE lesson_id = p_lesson_id
    RETURNING id INTO v_new_quiz_id;

    -- Copy questions and their options
    IF v_new_quiz_id IS NOT NULL THEN
      FOR v_question IN
        SELECT id, imo_id, question_text, question_type, explanation, sort_order, points
        FROM training_quiz_questions
        WHERE quiz_id = (SELECT id FROM training_quizzes WHERE lesson_id = p_lesson_id)
        ORDER BY sort_order
      LOOP
        INSERT INTO training_quiz_questions (
          quiz_id, imo_id, question_text, question_type, explanation, sort_order, points
        ) VALUES (
          v_new_quiz_id,
          v_question.imo_id,
          v_question.question_text,
          v_question.question_type,
          v_question.explanation,
          v_question.sort_order,
          v_question.points
        ) RETURNING id INTO v_new_question_id;

        -- Copy options for this question
        INSERT INTO training_quiz_options (
          question_id, option_text, is_correct, sort_order
        )
        SELECT
          v_new_question_id, option_text, is_correct, sort_order
        FROM training_quiz_options
        WHERE question_id = v_question.id
        ORDER BY sort_order;
      END LOOP;
    END IF;
  END IF;

  -- 6. Return the new lesson as JSON
  SELECT to_jsonb(l) INTO v_result
  FROM training_lessons l
  WHERE l.id = v_new_lesson_id;

  RETURN v_result;
END;
$$;
