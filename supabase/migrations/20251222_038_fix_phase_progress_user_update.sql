-- Fix missing UPDATE policy for users on their own phase progress
-- Users need to be able to update their own progress when completing checklist items

-- Add UPDATE policy for users to update their own phase progress
CREATE POLICY "Users can update their own phase progress"
ON recruit_phase_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Also need to add same for recruit_checklist_progress if not exists
-- Check if user can update their own checklist items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recruit_checklist_progress'
    AND policyname = 'Users can update their own checklist progress'
  ) THEN
    CREATE POLICY "Users can update their own checklist progress"
    ON recruit_checklist_progress FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
