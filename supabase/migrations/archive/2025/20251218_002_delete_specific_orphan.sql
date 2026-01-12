-- supabase/migrations/20251218_002_delete_specific_orphan.sql
-- Delete the specific orphaned identity for nick@nickneessen.com

-- First verify the orphan exists
DO $$
DECLARE
  identity_exists boolean;
  user_exists boolean;
BEGIN
  -- Check if identity exists
  SELECT EXISTS(
    SELECT 1 FROM auth.identities
    WHERE id = 'd86eb973-201a-47c7-b019-5dbcf8bbf79e'
  ) INTO identity_exists;

  -- Check if user exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE id = 'd0d3edea-af6d-4990-80b8-1765ba829896'
  ) INTO user_exists;

  RAISE NOTICE 'Identity exists: %, User exists: %', identity_exists, user_exists;

  -- Delete if identity exists but user doesn't
  IF identity_exists AND NOT user_exists THEN
    DELETE FROM auth.identities WHERE id = 'd86eb973-201a-47c7-b019-5dbcf8bbf79e';
    RAISE NOTICE 'Deleted orphaned identity for nick@nickneessen.com';
  ELSIF identity_exists AND user_exists THEN
    RAISE NOTICE 'User exists, not deleting identity';
  ELSE
    RAISE NOTICE 'Identity not found, nothing to delete';
  END IF;
END $$;
