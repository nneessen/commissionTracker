-- supabase/migrations/20260209210100_training_gamification.sql
-- Training Modules: Gamification tables (XP, stats, badges)

-- ============================================================================
-- 1. training_xp_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_xp_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_xp_entries_user_id ON training_xp_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_training_xp_entries_imo_id ON training_xp_entries(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_xp_entries_agency_id ON training_xp_entries(agency_id);
CREATE INDEX IF NOT EXISTS idx_training_xp_entries_created_at ON training_xp_entries(created_at DESC);

ALTER TABLE training_xp_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. training_user_stats
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_user_stats (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  modules_completed INTEGER NOT NULL DEFAULT 0,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  quizzes_passed INTEGER NOT NULL DEFAULT 0,
  avg_quiz_score NUMERIC NOT NULL DEFAULT 0,
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_user_stats_imo_id ON training_user_stats(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_user_stats_agency_id ON training_user_stats(agency_id);
CREATE INDEX IF NOT EXISTS idx_training_user_stats_total_xp ON training_user_stats(total_xp DESC);

ALTER TABLE training_user_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. training_badges
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'trophy',
  color TEXT NOT NULL DEFAULT 'amber',
  badge_type TEXT NOT NULL DEFAULT 'milestone',
  criteria JSONB NOT NULL DEFAULT '{}',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_badges_imo_id ON training_badges(imo_id);
CREATE INDEX IF NOT EXISTS idx_training_badges_active ON training_badges(is_active) WHERE is_active = TRUE;

ALTER TABLE training_badges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. training_user_badges
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES training_badges(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_training_user_badges_user_id ON training_user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user_badges_badge_id ON training_user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_training_user_badges_imo_id ON training_user_badges(imo_id);

ALTER TABLE training_user_badges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

-- training_xp_entries policies
DROP POLICY IF EXISTS "Users can view own xp entries" ON training_xp_entries;
CREATE POLICY "Users can view own xp entries"
ON training_xp_entries FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "System can insert xp entries" ON training_xp_entries;
CREATE POLICY "System can insert xp entries"
ON training_xp_entries FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- training_user_stats policies
DROP POLICY IF EXISTS "Users can view own stats" ON training_user_stats;
CREATE POLICY "Users can view own stats"
ON training_user_stats FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert own stats" ON training_user_stats;
CREATE POLICY "Users can insert own stats"
ON training_user_stats FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own stats" ON training_user_stats;
CREATE POLICY "Users can update own stats"
ON training_user_stats FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- training_badges policies
DROP POLICY IF EXISTS "Users can view badges in their IMO" ON training_badges;
CREATE POLICY "Users can view badges in their IMO"
ON training_badges FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can manage badges" ON training_badges;
CREATE POLICY "Managers can manage badges"
ON training_badges FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update badges" ON training_badges;
CREATE POLICY "Managers can update badges"
ON training_badges FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete badges" ON training_badges;
CREATE POLICY "Managers can delete badges"
ON training_badges FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- training_user_badges policies
DROP POLICY IF EXISTS "Users can view own badges" ON training_user_badges;
CREATE POLICY "Users can view own badges"
ON training_user_badges FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    AND is_training_hub_staff(auth.uid())
  )
);

DROP POLICY IF EXISTS "System can insert user badges" ON training_user_badges;
CREATE POLICY "System can insert user badges"
ON training_user_badges FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. Updated_at triggers
-- ============================================================================
CREATE OR REPLACE TRIGGER set_training_user_stats_updated_at
  BEFORE UPDATE ON training_user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_badges_updated_at
  BEFORE UPDATE ON training_badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Grants
-- ============================================================================
GRANT ALL ON training_xp_entries TO authenticated;
GRANT ALL ON training_user_stats TO authenticated;
GRANT ALL ON training_badges TO authenticated;
GRANT ALL ON training_user_badges TO authenticated;
