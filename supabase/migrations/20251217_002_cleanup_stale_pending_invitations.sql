-- supabase/migrations/20251217_002_cleanup_stale_pending_invitations.sql
-- One-time cleanup: Mark stale pending invitations as cancelled
-- These are invitations where the invitee already joined a hierarchy

-- Cancel pending invitations where invitee already has an upline
UPDATE hierarchy_invitations hi
SET
  status = 'cancelled',
  updated_at = NOW()
FROM user_profiles up
WHERE hi.invitee_id = up.id
  AND hi.status = 'pending'
  AND up.upline_id IS NOT NULL;

-- Also cancel invitations by matching email for users who joined via different invitation
UPDATE hierarchy_invitations hi
SET
  status = 'cancelled',
  updated_at = NOW()
FROM user_profiles up
WHERE hi.invitee_email = up.email
  AND hi.status = 'pending'
  AND up.upline_id IS NOT NULL
  AND hi.invitee_id IS NULL;

-- Log how many invitations were cleaned up (for reference)
DO $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cancelled_count
  FROM hierarchy_invitations
  WHERE status = 'cancelled'
    AND updated_at > NOW() - INTERVAL '1 minute';

  RAISE NOTICE 'Cleaned up % stale pending invitations', cancelled_count;
END $$;
