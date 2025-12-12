-- Migration: Add indexes and functions for workflow recipient resolution
-- Date: 2025-12-11
-- NOTE: Do NOT add recipient_config column to workflows table
-- Recipient config is stored per-action in the actions JSONB column

-- Index for role-based queries (GIN for array contains)
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles_gin
ON user_profiles USING GIN(roles);

-- Index for pipeline phase lookups
CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_phase_status
ON recruit_phase_progress(phase_id, status);

-- Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_upline_active
ON user_profiles(upline_id)
WHERE upline_id IS NOT NULL AND is_deleted = false;

-- Function to get upline chain with depth limit
CREATE OR REPLACE FUNCTION get_upline_chain(p_user_id uuid, p_max_depth int DEFAULT 10)
RETURNS TABLE(id uuid, email text, depth int) AS $$
  WITH RECURSIVE upline_tree AS (
    -- Base case: start user's direct upline
    SELECT
      up.upline_id as id,
      (SELECT email FROM user_profiles WHERE id = up.upline_id) as email,
      1 as depth
    FROM user_profiles up
    WHERE up.id = p_user_id AND up.upline_id IS NOT NULL

    UNION ALL

    -- Recursive case: go up the chain
    SELECT
      up.upline_id,
      (SELECT email FROM user_profiles WHERE id = up.upline_id),
      ut.depth + 1
    FROM user_profiles up
    INNER JOIN upline_tree ut ON up.id = ut.id
    WHERE up.upline_id IS NOT NULL
      AND ut.depth < p_max_depth
  )
  SELECT * FROM upline_tree WHERE id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get downline with emails (uses existing get_downline_ids)
CREATE OR REPLACE FUNCTION get_downline_with_emails(p_user_id uuid, p_max_count int DEFAULT 50)
RETURNS TABLE(id uuid, email text) AS $$
  SELECT up.id, up.email
  FROM user_profiles up
  WHERE up.id IN (SELECT downline_id FROM get_downline_ids(p_user_id))
    AND up.id != p_user_id  -- Exclude self
    AND up.is_deleted = false
    AND up.email IS NOT NULL
  LIMIT p_max_count;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_upline_chain TO authenticated;
GRANT EXECUTE ON FUNCTION get_downline_with_emails TO authenticated;
