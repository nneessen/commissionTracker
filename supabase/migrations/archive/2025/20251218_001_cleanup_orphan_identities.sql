-- supabase/migrations/20251218_001_cleanup_orphan_identities.sql
-- Clean up orphaned auth.identities entries that block user creation

-- Function to check if an email exists in auth.identities
CREATE OR REPLACE FUNCTION public.check_auth_identity(check_email text)
RETURNS TABLE(id uuid, user_id uuid, provider text, email text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    i.id,
    i.user_id,
    i.provider,
    i.identity_data->>'email' as email,
    i.created_at
  FROM auth.identities i
  WHERE lower(i.identity_data->>'email') = lower(check_email);
$$;

-- Function to delete orphaned identity (only if no matching user exists)
CREATE OR REPLACE FUNCTION public.delete_orphan_identity(del_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  identity_record RECORD;
  user_exists boolean;
  deleted_count int := 0;
BEGIN
  -- Find identities with this email
  FOR identity_record IN
    SELECT i.id, i.user_id
    FROM auth.identities i
    WHERE lower(i.identity_data->>'email') = lower(del_email)
  LOOP
    -- Check if the user exists
    SELECT EXISTS(SELECT 1 FROM auth.users u WHERE u.id = identity_record.user_id) INTO user_exists;

    -- If user doesn't exist, delete the orphaned identity
    IF NOT user_exists THEN
      DELETE FROM auth.identities WHERE id = identity_record.id;
      deleted_count := deleted_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('deleted', deleted_count, 'email', del_email);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_auth_identity(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_orphan_identity(text) TO service_role;

-- Now clean up the specific orphaned email
SELECT public.delete_orphan_identity('nick@nickneessen.com');
