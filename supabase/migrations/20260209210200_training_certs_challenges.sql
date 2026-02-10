-- supabase/migrations/20260209210200_training_certs_challenges.sql
-- Training Modules: Certifications & Challenges tables

-- ============================================================================
-- 1. training_certifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  required_module_ids UUID[] DEFAULT '{}',
  validity_months INT,
  badge_id UUID REFERENCES training_badges(id) ON DELETE SET NULL,
  xp_reward INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_certifications_imo_id ON training_certifications(imo_id);

ALTER TABLE training_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage training_certifications" ON training_certifications;
CREATE POLICY "Staff manage training_certifications"
ON training_certifications FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Authenticated view active certifications" ON training_certifications;
CREATE POLICY "Authenticated view active certifications"
ON training_certifications FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() AND is_active = true);

GRANT ALL ON training_certifications TO authenticated;

CREATE TRIGGER training_certifications_updated_at
  BEFORE UPDATE ON training_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. training_user_certifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_user_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES training_certifications(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(user_id, certification_id)
);

CREATE INDEX IF NOT EXISTS idx_training_user_certs_user ON training_user_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user_certs_imo_id ON training_user_certifications(imo_id);

ALTER TABLE training_user_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own certifications" ON training_user_certifications;
CREATE POLICY "Users view own certifications"
ON training_user_certifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view all certifications in IMO" ON training_user_certifications;
CREATE POLICY "Staff view all certifications in IMO"
ON training_user_certifications FOR SELECT
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Staff manage user_certifications" ON training_user_certifications;
CREATE POLICY "Staff manage user_certifications"
ON training_user_certifications FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

GRANT ALL ON training_user_certifications TO authenticated;

-- ============================================================================
-- 3. training_challenges
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  xp_reward INT NOT NULL DEFAULT 0,
  badge_id UUID REFERENCES training_badges(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_challenges_imo_id ON training_challenges(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_challenges_agency_id ON training_challenges(agency_id);

ALTER TABLE training_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage training_challenges" ON training_challenges;
CREATE POLICY "Staff manage training_challenges"
ON training_challenges FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Authenticated view active challenges" ON training_challenges;
CREATE POLICY "Authenticated view active challenges"
ON training_challenges FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() AND is_active = true);

GRANT ALL ON training_challenges TO authenticated;

CREATE TRIGGER training_challenges_updated_at
  BEFORE UPDATE ON training_challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. training_challenge_participants
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES training_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  current_value INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_training_challenge_participants_challenge ON training_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_training_challenge_participants_user ON training_challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_training_challenge_participants_imo_id ON training_challenge_participants(imo_id);

ALTER TABLE training_challenge_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own challenge participation" ON training_challenge_participants;
CREATE POLICY "Users view own challenge participation"
ON training_challenge_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users join challenges" ON training_challenge_participants;
CREATE POLICY "Users join challenges"
ON training_challenge_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view all participants in IMO" ON training_challenge_participants;
CREATE POLICY "Staff view all participants in IMO"
ON training_challenge_participants FOR SELECT
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

GRANT ALL ON training_challenge_participants TO authenticated;
