-- supabase/migrations/20260211121625_fix_presentation_agent_update_rls.sql
-- Fix: Agent UPDATE RLS must validate imo_id/agency_id immutability (cross-tenant protection)
-- Fix: Server-side enforcement of reviewed_at and reviewed_by

-- ============================================================================
-- 1. Fix agent UPDATE policy: enforce imo_id + agency_id immutability
-- ============================================================================
-- Without this, a malicious client could PATCH imo_id/agency_id to another
-- tenant's values, leaking submissions into other IMOs' staff views.

DROP POLICY IF EXISTS "Agents can update own pending submissions" ON presentation_submissions;
CREATE POLICY "Agents can update own pending submissions"
ON presentation_submissions FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND status = 'pending'
  AND NOT is_training_hub_staff(auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
  AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  AND NOT is_training_hub_staff(auth.uid())
);

-- ============================================================================
-- 2. Trigger: enforce reviewed_at = NOW() and reviewed_by = auth.uid()
--    whenever status changes from 'pending' to a review status
-- ============================================================================
CREATE OR REPLACE FUNCTION set_presentation_review_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When status changes from 'pending' to a reviewed state, enforce server-side values
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'needs_improvement') THEN
    NEW.reviewed_at := NOW();
    NEW.reviewed_by := auth.uid();
  END IF;

  -- When status is NOT changing to a reviewed state, prevent tampering with review fields
  IF NEW.status = 'pending' THEN
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_presentation_review_metadata ON presentation_submissions;
CREATE TRIGGER trg_set_presentation_review_metadata
  BEFORE UPDATE ON presentation_submissions
  FOR EACH ROW EXECUTE FUNCTION set_presentation_review_metadata();
