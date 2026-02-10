-- supabase/migrations/20260209210200_training_certs_challenges.sql
-- Training Modules: Certifications and challenges tables

-- ============================================================================
-- 1. training_certifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  required_module_ids UUID[] DEFAULT '{}',
  validity_months INTEGER,
  badge_id UUID REFERENCES training_badges(id) ON DELETE SET NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_certifications_imo_id ON training_certifications(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_certifications_active ON training_certifications(is_active) WHERE is_active = TRUE;

ALTER TABLE training_certifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. training_user_certifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_user_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES training_certifications(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(user_id, certification_id)
);

CREATE INDEX IF NOT EXISTS idx_training_user_certs_user_id ON training_user_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user_certs_cert_id ON training_user_certifications(certification_id);
CREATE INDEX IF NOT EXISTS idx_training_user_certs_imo_id ON training_user_certifications(imo_id);

ALTER TABLE training_user_certifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. training_challenges
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'complete_modules',
  target_value INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  badge_id UUID REFERENCES training_badges(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_challenges_imo_id ON training_challenges(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_challenges_agency_id ON training_challenges(agency_id);
CREATE INDEX IF NOT EXISTS idx_training_challenges_active ON training_challenges(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_challenges_dates ON training_challenges(start_date, end_date);

ALTER TABLE training_challenges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. training_challenge_participants
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES training_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_training_challenge_parts_challenge_id ON training_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_training_challenge_parts_user_id ON training_challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_training_challenge_parts_imo_id ON training_challenge_participants(imo_id);

ALTER TABLE training_challenge_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

-- training_certifications policies
DROP POLICY IF EXISTS "Users can view certifications in their IMO" ON training_certifications;
CREATE POLICY "Users can view certifications in their IMO"
ON training_certifications FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can insert certifications" ON training_certifications;
CREATE POLICY "Managers can insert certifications"
ON training_certifications FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update certifications" ON training_certifications;
CREATE POLICY "Managers can update certifications"
ON training_certifications FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete certifications" ON training_certifications;
CREATE POLICY "Managers can delete certifications"
ON training_certifications FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_user_certifications policies
DROP POLICY IF EXISTS "Users can view own certifications" ON training_user_certifications;
CREATE POLICY "Users can view own certifications"
ON training_user_certifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "System can insert user certifications" ON training_user_certifications;
CREATE POLICY "System can insert user certifications"
ON training_user_certifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- training_challenges policies
DROP POLICY IF EXISTS "Users can view challenges in their IMO" ON training_challenges;
CREATE POLICY "Users can view challenges in their IMO"
ON training_challenges FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can insert challenges" ON training_challenges;
CREATE POLICY "Managers can insert challenges"
ON training_challenges FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update challenges" ON training_challenges;
CREATE POLICY "Managers can update challenges"
ON training_challenges FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete challenges" ON training_challenges;
CREATE POLICY "Managers can delete challenges"
ON training_challenges FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_challenge_participants policies
DROP POLICY IF EXISTS "Users can view own challenge participation" ON training_challenge_participants;
CREATE POLICY "Users can view own challenge participation"
ON training_challenge_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can join challenges" ON training_challenge_participants;
CREATE POLICY "Users can join challenges"
ON training_challenge_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own participation" ON training_challenge_participants;
CREATE POLICY "Users can update own participation"
ON training_challenge_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. Updated_at triggers
-- ============================================================================
CREATE OR REPLACE TRIGGER set_training_certifications_updated_at
  BEFORE UPDATE ON training_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_challenges_updated_at
  BEFORE UPDATE ON training_challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Grants
-- ============================================================================
GRANT ALL ON training_certifications TO authenticated;
GRANT ALL ON training_user_certifications TO authenticated;
GRANT ALL ON training_challenges TO authenticated;
GRANT ALL ON training_challenge_participants TO authenticated;
