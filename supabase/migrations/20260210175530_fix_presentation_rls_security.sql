-- supabase/migrations/20260210175530_fix_presentation_rls_security.sql
-- Fix critical RLS vulnerabilities in presentation_submissions and storage policies

-- ============================================================================
-- 1. Fix INSERT policy: validate imo_id and agency_id match user's profile
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert own submissions" ON presentation_submissions;
CREATE POLICY "Users can insert own submissions"
ON presentation_submissions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
);

-- ============================================================================
-- 2. Fix storage SELECT policy: scope staff access to their own IMO
-- ============================================================================
DROP POLICY IF EXISTS "presentation_recordings_select" ON storage.objects;
CREATE POLICY "presentation_recordings_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'presentation-recordings'
  AND (
    -- Agents can view their own files
    (storage.foldername(name))[1] = auth.uid()::TEXT
    OR (
      -- Staff can view files from agents in their IMO only
      is_training_hub_staff(auth.uid())
      AND (
        SELECT imo_id FROM user_profiles WHERE id = ((storage.foldername(name))[1])::UUID
      ) = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    )
  )
);

-- ============================================================================
-- 3. Fix storage DELETE policy: scope staff access to their own IMO
-- ============================================================================
DROP POLICY IF EXISTS "presentation_recordings_delete" ON storage.objects;
CREATE POLICY "presentation_recordings_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'presentation-recordings'
  AND (
    -- Agents can delete their own files
    (storage.foldername(name))[1] = auth.uid()::TEXT
    OR (
      -- Staff can delete files from agents in their IMO only
      is_training_hub_staff(auth.uid())
      AND (
        SELECT imo_id FROM user_profiles WHERE id = ((storage.foldername(name))[1])::UUID
      ) = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
    )
  )
);

-- ============================================================================
-- 4. Add unique constraint: one submission per agent per week
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_presentation_submissions_user_week_unique
  ON presentation_submissions(user_id, week_start);

-- ============================================================================
-- 5. Fix is_elevenlabs_available RPC: validate caller belongs to the IMO
-- ============================================================================
CREATE OR REPLACE FUNCTION is_elevenlabs_available(p_imo_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM elevenlabs_config
    WHERE imo_id = p_imo_id
      AND is_active = true
      AND p_imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  );
$$;
