-- Replace is_direct_downline_of_owner with full hierarchy walk.
-- Previously only checked ONE level up (immediate upline).
-- Now walks the entire ancestor chain so ANY descendant of an owner
-- at any depth gets access to granted features (including training).
DROP FUNCTION IF EXISTS is_direct_downline_of_owner(UUID);

CREATE OR REPLACE FUNCTION is_direct_downline_of_owner(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_id UUID;
  v_upline_id UUID;
  v_upline_email TEXT;
  v_owner_emails TEXT[] := ARRAY['nick@nickneessen.com', 'nickneessen@thestandardhq.com'];
  v_depth INTEGER := 0;
  v_max_depth INTEGER := 20;
BEGIN
  -- Start from the given user
  v_current_id := p_user_id;

  LOOP
    -- Get the upline of the current user
    SELECT upline_id INTO v_upline_id
    FROM user_profiles
    WHERE id = v_current_id;

    -- No upline found — reached top of chain
    IF v_upline_id IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Get the upline's email
    SELECT LOWER(email) INTO v_upline_email
    FROM user_profiles
    WHERE id = v_upline_id;

    -- Check if this ancestor is an owner
    IF v_upline_email = ANY(v_owner_emails) THEN
      RETURN TRUE;
    END IF;

    -- Move up the chain
    v_current_id := v_upline_id;
    v_depth := v_depth + 1;

    -- Safety: prevent infinite loops from circular references
    IF v_depth >= v_max_depth THEN
      RETURN FALSE;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION is_direct_downline_of_owner(UUID) TO authenticated;

COMMENT ON FUNCTION is_direct_downline_of_owner(UUID) IS
  'Check if a user is anywhere in the downline hierarchy of an owner
   (nick@nickneessen.com or nickneessen@thestandardhq.com).
   Walks the full upline chain up to 20 levels. Descendants at any depth
   get access to granted subscription features.';
