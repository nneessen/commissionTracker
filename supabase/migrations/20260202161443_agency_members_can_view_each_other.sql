-- supabase/migrations/20260202161443_agency_members_can_view_each_other.sql
-- Allow users to view other members of their same agency

-- RLS Policy: Agency members can view other members in the same agency
CREATE POLICY "agency_members_can_view_same_agency" ON user_profiles
  FOR SELECT
  USING (
    -- Must be in the same agency
    agency_id IS NOT NULL
    AND agency_id = get_my_agency_id()
    -- Only view approved and non-archived users
    AND approval_status = 'approved'
    AND archived_at IS NULL
  );
