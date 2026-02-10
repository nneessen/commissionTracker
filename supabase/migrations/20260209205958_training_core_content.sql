-- supabase/migrations/20260209205958_training_core_content.sql
-- Training Modules: Core content tables (modules, lessons, content, quizzes, questions, options)

-- ============================================================================
-- 1. training_modules
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  estimated_duration_minutes INT,
  xp_reward INT NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  published_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_imo_id ON training_modules(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_imo_published ON training_modules(imo_id, is_published);
CREATE INDEX IF NOT EXISTS idx_training_modules_tags ON training_modules USING gin(tags);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to training_modules" ON training_modules;
CREATE POLICY "Staff full access to training_modules"
ON training_modules FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users view published training_modules" ON training_modules;
CREATE POLICY "Users view published training_modules"
ON training_modules FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() AND is_published = true);

GRANT ALL ON training_modules TO authenticated;

CREATE TRIGGER training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. training_lessons
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  lesson_type TEXT NOT NULL DEFAULT 'content',
  xp_reward INT NOT NULL DEFAULT 25,
  is_required BOOLEAN NOT NULL DEFAULT true,
  estimated_duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_lessons_module_sort ON training_lessons(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_training_lessons_imo_id ON training_lessons(imo_id);

ALTER TABLE training_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to training_lessons" ON training_lessons;
CREATE POLICY "Staff full access to training_lessons"
ON training_lessons FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users view lessons of published modules" ON training_lessons;
CREATE POLICY "Users view lessons of published modules"
ON training_lessons FOR SELECT
TO authenticated
USING (
  imo_id = get_my_imo_id()
  AND EXISTS (
    SELECT 1 FROM training_modules
    WHERE training_modules.id = training_lessons.module_id
      AND training_modules.is_published = true
  )
);

GRANT ALL ON training_lessons TO authenticated;

CREATE TRIGGER training_lessons_updated_at
  BEFORE UPDATE ON training_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. training_lesson_content
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_lesson_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT,
  rich_text_content TEXT,
  video_url TEXT,
  video_platform TEXT,
  document_id UUID,
  external_url TEXT,
  external_url_label TEXT,
  script_prompt_text TEXT,
  script_prompt_instructions TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_lesson_content_lesson_sort ON training_lesson_content(lesson_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_training_lesson_content_imo_id ON training_lesson_content(imo_id);

ALTER TABLE training_lesson_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to training_lesson_content" ON training_lesson_content;
CREATE POLICY "Staff full access to training_lesson_content"
ON training_lesson_content FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users view content of published modules" ON training_lesson_content;
CREATE POLICY "Users view content of published modules"
ON training_lesson_content FOR SELECT
TO authenticated
USING (
  imo_id = get_my_imo_id()
  AND EXISTS (
    SELECT 1 FROM training_lessons tl
    JOIN training_modules tm ON tm.id = tl.module_id
    WHERE tl.id = training_lesson_content.lesson_id
      AND tm.is_published = true
  )
);

GRANT ALL ON training_lesson_content TO authenticated;

CREATE TRIGGER training_lesson_content_updated_at
  BEFORE UPDATE ON training_lesson_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. training_quizzes
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES training_lessons(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  pass_threshold INT NOT NULL DEFAULT 70,
  max_attempts INT NOT NULL DEFAULT 3,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  show_correct_answers BOOLEAN NOT NULL DEFAULT true,
  time_limit_minutes INT,
  xp_bonus_perfect INT NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_imo_id ON training_quizzes(imo_id);

ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to training_quizzes" ON training_quizzes;
CREATE POLICY "Staff full access to training_quizzes"
ON training_quizzes FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users view quizzes of published modules" ON training_quizzes;
CREATE POLICY "Users view quizzes of published modules"
ON training_quizzes FOR SELECT
TO authenticated
USING (
  imo_id = get_my_imo_id()
  AND EXISTS (
    SELECT 1 FROM training_lessons tl
    JOIN training_modules tm ON tm.id = tl.module_id
    WHERE tl.id = training_quizzes.lesson_id
      AND tm.is_published = true
  )
);

GRANT ALL ON training_quizzes TO authenticated;

CREATE TRIGGER training_quizzes_updated_at
  BEFORE UPDATE ON training_quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. training_quiz_questions
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  explanation TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quiz_questions_quiz_sort ON training_quiz_questions(quiz_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_training_quiz_questions_imo_id ON training_quiz_questions(imo_id);

ALTER TABLE training_quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to training_quiz_questions" ON training_quiz_questions;
CREATE POLICY "Staff full access to training_quiz_questions"
ON training_quiz_questions FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users view questions of published modules" ON training_quiz_questions;
CREATE POLICY "Users view questions of published modules"
ON training_quiz_questions FOR SELECT
TO authenticated
USING (
  imo_id = get_my_imo_id()
  AND EXISTS (
    SELECT 1 FROM training_quizzes tq
    JOIN training_lessons tl ON tl.id = tq.lesson_id
    JOIN training_modules tm ON tm.id = tl.module_id
    WHERE tq.id = training_quiz_questions.quiz_id
      AND tm.is_published = true
  )
);

GRANT ALL ON training_quiz_questions TO authenticated;

CREATE TRIGGER training_quiz_questions_updated_at
  BEFORE UPDATE ON training_quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. training_quiz_options
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_quiz_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES training_quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quiz_options_question_sort ON training_quiz_options(question_id, sort_order);

ALTER TABLE training_quiz_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff full access to training_quiz_options" ON training_quiz_options;
CREATE POLICY "Staff full access to training_quiz_options"
ON training_quiz_options FOR ALL
TO authenticated
USING (
  is_training_hub_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_quiz_questions qq
    WHERE qq.id = training_quiz_options.question_id
      AND qq.imo_id = get_my_imo_id()
  )
)
WITH CHECK (
  is_training_hub_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_quiz_questions qq
    WHERE qq.id = training_quiz_options.question_id
      AND qq.imo_id = get_my_imo_id()
  )
);

DROP POLICY IF EXISTS "Users view options of published modules" ON training_quiz_options;
CREATE POLICY "Users view options of published modules"
ON training_quiz_options FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_quiz_questions qq
    JOIN training_quizzes tq ON tq.id = qq.quiz_id
    JOIN training_lessons tl ON tl.id = tq.lesson_id
    JOIN training_modules tm ON tm.id = tl.module_id
    WHERE qq.id = training_quiz_options.question_id
      AND tm.imo_id = get_my_imo_id()
      AND tm.is_published = true
  )
);

GRANT ALL ON training_quiz_options TO authenticated;
