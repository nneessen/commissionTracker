-- supabase/migrations/20260211125320_lock_agent_update_to_rpc.sql
-- Security fix: Restrict agent updates to title/description only via RPC.
-- Removes the agent UPDATE RLS policy so agents cannot PATCH arbitrary columns.
-- Staff UPDATE policy remains for reviews.

-- ============================================================================
-- 1. Drop the agent UPDATE policy (agents should not UPDATE via REST at all)
-- ============================================================================
DROP POLICY IF EXISTS "Agents can update own pending submissions" ON presentation_submissions;

-- ============================================================================
-- 2. Create RPC for agents to update only title/description on pending submissions
-- ============================================================================
CREATE OR REPLACE FUNCTION update_own_presentation(
  p_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_submission RECORD;
BEGIN
  -- Fetch the submission and verify ownership + status
  SELECT id, user_id, status
  INTO v_submission
  FROM presentation_submissions
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  IF v_submission.user_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to update this submission';
  END IF;

  IF v_submission.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot update a submission that has already been reviewed';
  END IF;

  -- Update only the allowed columns
  UPDATE presentation_submissions
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description)
  WHERE id = p_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION update_own_presentation(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 3. Remove audio/webm from storage bucket allowed_mime_types (Issue 3.5)
-- ============================================================================
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/webm', 'video/mp4', 'video/quicktime']
WHERE id = 'presentation-recordings';
