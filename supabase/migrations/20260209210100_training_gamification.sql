-- supabase/migrations/20260209210100_training_gamification.sql
-- Training Modules: Gamification tables (XP, stats, badges)

-- ============================================================================
-- 1. training_xp_entries (immutable log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_xp_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  xp_amount INT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_xp_entries_user_created ON training_xp_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_xp_entries_imo_id ON training_xp_entries(imo_id);

ALTER TABLE training_xp_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own xp_entries" ON training_xp_entries;
CREATE POLICY "Users view own xp_entries"
ON training_xp_entries FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view all xp_entries in IMO" ON training_xp_entries;
CREATE POLICY "Staff view all xp_entries in IMO"
ON training_xp_entries FOR SELECT
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

-- INSERT handled via SECURITY DEFINER functions
DROP POLICY IF EXISTS "System insert xp_entries" ON training_xp_entries;
CREATE POLICY "System insert xp_entries"
ON training_xp_entries FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

GRANT ALL ON training_xp_entries TO authenticated;

-- ============================================================================
-- 2. training_user_stats (user_id is PK, not a generated UUID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_user_stats (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  modules_completed INT NOT NULL DEFAULT 0,
  lessons_completed INT NOT NULL DEFAULT 0,
  quizzes_passed INT NOT NULL DEFAULT 0,
  avg_quiz_score DECIMAL NOT NULL DEFAULT 0,
  current_streak_days INT NOT NULL DEFAULT 0,
  longest_streak_days INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_time_spent_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_user_stats_agency_xp ON training_user_stats(agency_id, total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_training_user_stats_imo_id ON training_user_stats(imo_id);

ALTER TABLE training_user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own stats" ON training_user_stats;
CREATE POLICY "Users view own stats"
ON training_user_stats FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view all stats in IMO" ON training_user_stats;
CREATE POLICY "Staff view all stats in IMO"
ON training_user_stats FOR SELECT
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

-- Upserts handled via SECURITY DEFINER functions
DROP POLICY IF EXISTS "Users manage own stats" ON training_user_stats;
CREATE POLICY "Users manage own stats"
ON training_user_stats FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT ALL ON training_user_stats TO authenticated;

CREATE TRIGGER training_user_stats_updated_at
  BEFORE UPDATE ON training_user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. training_badges
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'trophy',
  color TEXT NOT NULL DEFAULT '#71717a',
  badge_type TEXT NOT NULL,
  criteria JSONB NOT NULL,
  xp_reward INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_badges_imo_active ON training_badges(imo_id, is_active);

ALTER TABLE training_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage training_badges" ON training_badges;
CREATE POLICY "Staff manage training_badges"
ON training_badges FOR ALL
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id())
WITH CHECK (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

DROP POLICY IF EXISTS "Authenticated view active badges" ON training_badges;
CREATE POLICY "Authenticated view active badges"
ON training_badges FOR SELECT
TO authenticated
USING (imo_id = get_my_imo_id() AND is_active = true);

GRANT ALL ON training_badges TO authenticated;

CREATE TRIGGER training_badges_updated_at
  BEFORE UPDATE ON training_badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. training_user_badges
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES training_badges(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_training_user_badges_user ON training_user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user_badges_imo_id ON training_user_badges(imo_id);

ALTER TABLE training_user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own badges" ON training_user_badges;
CREATE POLICY "Users view own badges"
ON training_user_badges FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view all badges in IMO" ON training_user_badges;
CREATE POLICY "Staff view all badges in IMO"
ON training_user_badges FOR SELECT
TO authenticated
USING (is_training_hub_staff(auth.uid()) AND imo_id = get_my_imo_id());

-- INSERT handled via SECURITY DEFINER functions
DROP POLICY IF EXISTS "System insert user_badges" ON training_user_badges;
CREATE POLICY "System insert user_badges"
ON training_user_badges FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

GRANT ALL ON training_user_badges TO authenticated;
