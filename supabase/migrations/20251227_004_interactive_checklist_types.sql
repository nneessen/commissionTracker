-- supabase/migrations/20251227_004_interactive_checklist_types.sql
-- Add support for interactive checklist item types: boolean_question, acknowledgment,
-- text_response, multiple_choice, file_download, external_link, quiz

-- =============================================================================
-- 1. Add response_data column to store recruit responses
-- =============================================================================
-- This stores the recruit's actual response to interactive items (answers, selections, etc.)
-- Kept separate from the admin-configured 'metadata' column

ALTER TABLE recruit_checklist_progress
ADD COLUMN IF NOT EXISTS response_data JSONB DEFAULT NULL;

COMMENT ON COLUMN recruit_checklist_progress.response_data IS
  'Stores recruit responses for interactive checklist items (boolean answers, text responses, quiz answers, multiple choice selections, etc.). Structure depends on item_type.';

-- =============================================================================
-- 2. Add completion_details column for tracking completion metadata
-- =============================================================================
-- Stores metadata about how the item was completed (quiz scores, download timestamps, etc.)

ALTER TABLE recruit_checklist_progress
ADD COLUMN IF NOT EXISTS completion_details JSONB DEFAULT NULL;

COMMENT ON COLUMN recruit_checklist_progress.completion_details IS
  'Stores metadata about completion (quiz score, attempt count, download timestamp, acknowledgment timestamp, etc.)';

-- =============================================================================
-- 3. Add indexes for efficient querying
-- =============================================================================

-- Index for querying by response data (e.g., finding all "yes" answers)
CREATE INDEX IF NOT EXISTS idx_checklist_progress_response_data
ON recruit_checklist_progress USING GIN (response_data)
WHERE response_data IS NOT NULL;

-- Index for querying by completion details
CREATE INDEX IF NOT EXISTS idx_checklist_progress_completion_details
ON recruit_checklist_progress USING GIN (completion_details)
WHERE completion_details IS NOT NULL;

-- =============================================================================
-- 4. Create helper function for quiz scoring
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_quiz_score(
  p_answers JSONB,           -- { "question_id": ["option_id", ...], ... }
  p_questions JSONB          -- Array of question objects with correct answers
) RETURNS JSONB AS $$
DECLARE
  v_total_questions INT;
  v_correct_count INT := 0;
  v_question JSONB;
  v_question_id TEXT;
  v_selected_options JSONB;
  v_correct_options JSONB;
  v_score_percent NUMERIC;
BEGIN
  v_total_questions := jsonb_array_length(p_questions);

  IF v_total_questions = 0 THEN
    RETURN jsonb_build_object(
      'total_questions', 0,
      'correct_count', 0,
      'score_percent', 0
    );
  END IF;

  -- Iterate through each question
  FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    v_question_id := v_question->>'id';
    v_selected_options := p_answers->v_question_id;

    -- Get correct option IDs for this question
    SELECT jsonb_agg(opt->>'id')
    INTO v_correct_options
    FROM jsonb_array_elements(v_question->'options') AS opt
    WHERE (opt->>'is_correct')::boolean = true;

    -- Check if selected options match correct options exactly
    IF v_selected_options IS NOT NULL AND v_correct_options IS NOT NULL THEN
      -- Sort both arrays and compare
      IF (SELECT jsonb_agg(x ORDER BY x) FROM jsonb_array_elements_text(v_selected_options) x) =
         (SELECT jsonb_agg(x ORDER BY x) FROM jsonb_array_elements_text(v_correct_options) x) THEN
        v_correct_count := v_correct_count + 1;
      END IF;
    END IF;
  END LOOP;

  v_score_percent := ROUND((v_correct_count::NUMERIC / v_total_questions) * 100, 2);

  RETURN jsonb_build_object(
    'total_questions', v_total_questions,
    'correct_count', v_correct_count,
    'score_percent', v_score_percent
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_quiz_score IS
  'Calculates quiz score given answers and question definitions. Returns total_questions, correct_count, and score_percent.';

-- =============================================================================
-- 5. Verify migration
-- =============================================================================

DO $$
DECLARE
  v_has_response_data BOOLEAN;
  v_has_completion_details BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recruit_checklist_progress'
    AND column_name = 'response_data'
  ) INTO v_has_response_data;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recruit_checklist_progress'
    AND column_name = 'completion_details'
  ) INTO v_has_completion_details;

  IF v_has_response_data AND v_has_completion_details THEN
    RAISE NOTICE 'Migration successful: response_data and completion_details columns added';
  ELSE
    RAISE EXCEPTION 'Migration failed: columns not created properly';
  END IF;
END $$;
