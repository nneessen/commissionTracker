-- supabase/migrations/20260210171547_elevenlabs_config.sql
-- ElevenLabs TTS configuration table (one per IMO)

-- ============================================================================
-- 1. elevenlabs_config table
-- ============================================================================
CREATE TABLE IF NOT EXISTS elevenlabs_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imo_id UUID NOT NULL UNIQUE REFERENCES imos(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  default_voice_id TEXT,
  default_voice_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. RLS
-- ============================================================================
ALTER TABLE elevenlabs_config ENABLE ROW LEVEL SECURITY;

-- Only training hub staff can view config for their IMO
DROP POLICY IF EXISTS "Staff can view elevenlabs config" ON elevenlabs_config;
CREATE POLICY "Staff can view elevenlabs config"
ON elevenlabs_config FOR SELECT TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- Only training hub staff can insert
DROP POLICY IF EXISTS "Staff can insert elevenlabs config" ON elevenlabs_config;
CREATE POLICY "Staff can insert elevenlabs config"
ON elevenlabs_config FOR INSERT TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- Only training hub staff can update
DROP POLICY IF EXISTS "Staff can update elevenlabs config" ON elevenlabs_config;
CREATE POLICY "Staff can update elevenlabs config"
ON elevenlabs_config FOR UPDATE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- Only training hub staff can delete
DROP POLICY IF EXISTS "Staff can delete elevenlabs config" ON elevenlabs_config;
CREATE POLICY "Staff can delete elevenlabs config"
ON elevenlabs_config FOR DELETE TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND is_training_hub_staff(auth.uid())
);

-- ============================================================================
-- 2b. RPC for learners to check TTS availability (avoids exposing api_key)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_elevenlabs_available(p_imo_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM elevenlabs_config
    WHERE imo_id = p_imo_id AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION is_elevenlabs_available(UUID) TO authenticated;

-- ============================================================================
-- 3. Updated_at trigger
-- ============================================================================
CREATE OR REPLACE TRIGGER set_elevenlabs_config_updated_at
  BEFORE UPDATE ON elevenlabs_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Grants
-- ============================================================================
GRANT ALL ON elevenlabs_config TO authenticated;
