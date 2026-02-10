-- supabase/migrations/20260209205958_training_core_content.sql
-- Training Modules: Core content tables (modules, lessons, content blocks, quizzes)

-- ============================================================================
-- 1. training_modules
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  thumbnail_url TEXT,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner',
  estimated_duration_minutes INTEGER,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_imo_id ON training_modules(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_agency_id ON training_modules(agency_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_is_published ON training_modules(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_modules_created_by ON training_modules(created_by);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. training_lessons
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  lesson_type TEXT NOT NULL DEFAULT 'content',
  xp_reward INTEGER NOT NULL DEFAULT 25,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_lessons_module_id ON training_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_training_lessons_imo_id ON training_lessons(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_lessons_sort_order ON training_lessons(module_id, sort_order);

ALTER TABLE training_lessons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. training_lesson_content
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_lesson_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_lesson_content_lesson_id ON training_lesson_content(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_lesson_content_imo_id ON training_lesson_content(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_lesson_content_sort_order ON training_lesson_content(lesson_id, sort_order);

ALTER TABLE training_lesson_content ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. training_quizzes
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES training_lessons(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  pass_threshold INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  shuffle_options BOOLEAN NOT NULL DEFAULT FALSE,
  show_correct_answers BOOLEAN NOT NULL DEFAULT TRUE,
  time_limit_minutes INTEGER,
  xp_bonus_perfect INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_lesson_id ON training_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_imo_id ON training_quizzes(imo_id);

ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;

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
  sort_order INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quiz_questions_quiz_id ON training_quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_questions_imo_id ON training_quiz_questions(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_questions_sort_order ON training_quiz_questions(quiz_id, sort_order);

ALTER TABLE training_quiz_questions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. training_quiz_options
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_quiz_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES training_quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quiz_options_question_id ON training_quiz_options(question_id);

ALTER TABLE training_quiz_options ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS Policies
-- ============================================================================

-- training_modules policies
DROP POLICY IF EXISTS "Users can view published modules in their IMO" ON training_modules;
CREATE POLICY "Users can view published modules in their IMO"
ON training_modules FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND (is_published = TRUE OR created_by = auth.uid() OR is_training_hub_staff(auth.uid()))
);

DROP POLICY IF EXISTS "Managers can insert modules" ON training_modules;
CREATE POLICY "Managers can insert modules"
ON training_modules FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update modules" ON training_modules;
CREATE POLICY "Managers can update modules"
ON training_modules FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete modules" ON training_modules;
CREATE POLICY "Managers can delete modules"
ON training_modules FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_lessons policies
DROP POLICY IF EXISTS "Users can view lessons in their IMO" ON training_lessons;
CREATE POLICY "Users can view lessons in their IMO"
ON training_lessons FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can insert lessons" ON training_lessons;
CREATE POLICY "Managers can insert lessons"
ON training_lessons FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update lessons" ON training_lessons;
CREATE POLICY "Managers can update lessons"
ON training_lessons FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete lessons" ON training_lessons;
CREATE POLICY "Managers can delete lessons"
ON training_lessons FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_lesson_content policies
DROP POLICY IF EXISTS "Users can view content in their IMO" ON training_lesson_content;
CREATE POLICY "Users can view content in their IMO"
ON training_lesson_content FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can insert content" ON training_lesson_content;
CREATE POLICY "Managers can insert content"
ON training_lesson_content FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update content" ON training_lesson_content;
CREATE POLICY "Managers can update content"
ON training_lesson_content FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete content" ON training_lesson_content;
CREATE POLICY "Managers can delete content"
ON training_lesson_content FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_quizzes policies
DROP POLICY IF EXISTS "Users can view quizzes in their IMO" ON training_quizzes;
CREATE POLICY "Users can view quizzes in their IMO"
ON training_quizzes FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can insert quizzes" ON training_quizzes;
CREATE POLICY "Managers can insert quizzes"
ON training_quizzes FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update quizzes" ON training_quizzes;
CREATE POLICY "Managers can update quizzes"
ON training_quizzes FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete quizzes" ON training_quizzes;
CREATE POLICY "Managers can delete quizzes"
ON training_quizzes FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_quiz_questions policies
DROP POLICY IF EXISTS "Users can view questions in their IMO" ON training_quiz_questions;
CREATE POLICY "Users can view questions in their IMO"
ON training_quiz_questions FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can insert questions" ON training_quiz_questions;
CREATE POLICY "Managers can insert questions"
ON training_quiz_questions FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update questions" ON training_quiz_questions;
CREATE POLICY "Managers can update questions"
ON training_quiz_questions FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete questions" ON training_quiz_questions;
CREATE POLICY "Managers can delete questions"
ON training_quiz_questions FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_quiz_options policies (uses join through question for IMO scoping)
DROP POLICY IF EXISTS "Users can view options via question" ON training_quiz_options;
CREATE POLICY "Users can view options via question"
ON training_quiz_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM training_quiz_questions q
    WHERE q.id = question_id
    AND q.imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can insert options" ON training_quiz_options;
CREATE POLICY "Managers can insert options"
ON training_quiz_options FOR INSERT TO authenticated
WITH CHECK (
  is_training_hub_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_quiz_questions q
    WHERE q.id = question_id
    AND q.imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can update options" ON training_quiz_options;
CREATE POLICY "Managers can update options"
ON training_quiz_options FOR UPDATE TO authenticated
USING (
  is_training_hub_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_quiz_questions q
    WHERE q.id = question_id
    AND q.imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  is_training_hub_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_quiz_questions q
    WHERE q.id = question_id
    AND q.imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can delete options" ON training_quiz_options;
CREATE POLICY "Managers can delete options"
ON training_quiz_options FOR DELETE TO authenticated
USING (
  is_training_hub_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_quiz_questions q
    WHERE q.id = question_id
    AND q.imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  )
);

-- ============================================================================
-- 8. Updated_at triggers
-- ============================================================================
CREATE OR REPLACE TRIGGER set_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_lessons_updated_at
  BEFORE UPDATE ON training_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_lesson_content_updated_at
  BEFORE UPDATE ON training_lesson_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_quizzes_updated_at
  BEFORE UPDATE ON training_quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_quiz_questions_updated_at
  BEFORE UPDATE ON training_quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. Grants
-- ============================================================================
GRANT ALL ON training_modules TO authenticated;
GRANT ALL ON training_lessons TO authenticated;
GRANT ALL ON training_lesson_content TO authenticated;
GRANT ALL ON training_quizzes TO authenticated;
GRANT ALL ON training_quiz_questions TO authenticated;
GRANT ALL ON training_quiz_options TO authenticated;
