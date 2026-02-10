-- supabase/migrations/20260209210000_training_progress_assignments.sql
-- Training Modules: Progress tracking & assignment tables

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
  assigned_by UUID NOT NULL REFERENCES user_profiles(id),
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  module_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_assigned_to_status ON training_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_module_id ON training_assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_imo_id ON training_assignments(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_agency_id ON training_assignments(agency_id);

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage training_assignments" ON training_assignments;
CREATE POLICY "Staff manage training_assignments"
ON training_assignments FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users view own training_assignments" ON training_assignments;
CREATE POLICY "Users view own training_assignments"
ON training_assignments FOR SELECT
TO authenticated
USING (
  imo_id = get_my_imo_id()
  AND (assigned_to = auth.uid() OR assigned_to IS NULL)
);

GRANT ALL ON training_assignments TO authenticated;

CREATE TRIGGER training_assignments_updated_at
  BEFORE UPDATE ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  time_spent_seconds INT NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_training_progress_user_module ON training_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_user_lesson ON training_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_imo_id ON training_progress(imo_id);

ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view all training_progress in IMO" ON training_progress;
CREATE POLICY "Staff view all training_progress in IMO"
ON training_progress FOR SELECT
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users manage own training_progress" ON training_progress;
CREATE POLICY "Users manage own training_progress"
ON training_progress FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT ALL ON training_progress TO authenticated;

CREATE TRIGGER training_progress_updated_at
  BEFORE UPDATE ON training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  score_percentage DECIMAL NOT NULL DEFAULT 0,
  score_points INT NOT NULL DEFAULT 0,
  max_points INT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]',
  time_taken_seconds INT,
  attempt_number INT NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_user_quiz ON training_quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_imo_id ON training_quiz_attempts(imo_id);

ALTER TABLE training_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view all quiz_attempts in IMO" ON training_quiz_attempts;
CREATE POLICY "Staff view all quiz_attempts in IMO"
ON training_quiz_attempts FOR SELECT
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Users view own quiz_attempts" ON training_quiz_attempts;
CREATE POLICY "Users view own quiz_attempts"
ON training_quiz_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT handled via RPC (SECURITY DEFINER), not direct insert
DROP POLICY IF EXISTS "Users insert own quiz_attempts" ON training_quiz_attempts;
CREATE POLICY "Users insert own quiz_attempts"
ON training_quiz_attempts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

GRANT ALL ON training_quiz_attempts TO authenticated;
