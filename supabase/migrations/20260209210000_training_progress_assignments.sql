-- supabase/migrations/20260209210000_training_progress_assignments.sql
-- Training Modules: Progress tracking and assignment tables

-- ============================================================================
-- 1. training_assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL DEFAULT 'individual',
  assigned_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  module_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_module_id ON training_assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_imo_id ON training_assignments(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_agency_id ON training_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_assigned_to ON training_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status) WHERE status = 'active';

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. training_progress
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_module_id ON training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_lesson_id ON training_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_imo_id ON training_progress(imo_id);

ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. training_quiz_attempts
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  score_percentage NUMERIC NOT NULL DEFAULT 0,
  score_points INTEGER NOT NULL DEFAULT 0,
  max_points INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  answers JSONB NOT NULL DEFAULT '[]',
  time_taken_seconds INTEGER,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_user_id ON training_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_quiz_id ON training_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_module_id ON training_quiz_attempts(module_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_imo_id ON training_quiz_attempts(imo_id);

ALTER TABLE training_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- training_assignments policies
DROP POLICY IF EXISTS "Users can view their own assignments" ON training_assignments;
CREATE POLICY "Users can view their own assignments"
ON training_assignments FOR SELECT TO authenticated
USING (
  assigned_to = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can insert assignments" ON training_assignments;
CREATE POLICY "Managers can insert assignments"
ON training_assignments FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update assignments" ON training_assignments;
CREATE POLICY "Managers can update assignments"
ON training_assignments FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete assignments" ON training_assignments;
CREATE POLICY "Managers can delete assignments"
ON training_assignments FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_progress policies
DROP POLICY IF EXISTS "Users can view own progress" ON training_progress;
CREATE POLICY "Users can view own progress"
ON training_progress FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert own progress" ON training_progress;
CREATE POLICY "Users can insert own progress"
ON training_progress FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can update own progress" ON training_progress;
CREATE POLICY "Users can update own progress"
ON training_progress FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- training_quiz_attempts policies
DROP POLICY IF EXISTS "Users can view own attempts" ON training_quiz_attempts;
CREATE POLICY "Users can view own attempts"
ON training_quiz_attempts FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert own attempts" ON training_quiz_attempts;
CREATE POLICY "Users can insert own attempts"
ON training_quiz_attempts FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- ============================================================================
-- 5. Updated_at triggers
-- ============================================================================
CREATE OR REPLACE TRIGGER set_training_assignments_updated_at
  BEFORE UPDATE ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_progress_updated_at
  BEFORE UPDATE ON training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. Grants
-- ============================================================================
GRANT ALL ON training_assignments TO authenticated;
GRANT ALL ON training_progress TO authenticated;
GRANT ALL ON training_quiz_attempts TO authenticated;
