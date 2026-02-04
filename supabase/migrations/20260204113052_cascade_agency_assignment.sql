-- supabase/migrations/20260204113052_cascade_agency_assignment.sql
-- Cascade agency assignment function for assigning an owner and all their
-- downline hierarchy to a new agency in a single atomic operation.

-- ============================================================================
-- Function: cascade_agency_assignment
-- Purpose: Atomically assigns an owner and all their hierarchy downlines to a new agency
-- Returns: JSONB with success status, counts, and details
-- ============================================================================

CREATE OR REPLACE FUNCTION cascade_agency_assignment(
  p_agency_id uuid,
  p_owner_id uuid,
  p_imo_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_path TEXT;
  v_affected_count INTEGER;
  v_owner_first_name TEXT;
  v_owner_last_name TEXT;
BEGIN
  -- Validate inputs
  IF p_agency_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Agency ID is required'
    );
  END IF;

  IF p_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Owner ID is required'
    );
  END IF;

  IF p_imo_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'IMO ID is required'
    );
  END IF;

  -- Get the owner's hierarchy_path and name
  SELECT hierarchy_path, first_name, last_name
  INTO v_owner_path, v_owner_first_name, v_owner_last_name
  FROM user_profiles
  WHERE id = p_owner_id;

  -- Check if owner exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Owner not found'
    );
  END IF;

  -- If owner has no hierarchy_path, just assign them alone
  IF v_owner_path IS NULL OR v_owner_path = '' THEN
    UPDATE user_profiles
    SET
      agency_id = p_agency_id,
      imo_id = p_imo_id,
      updated_at = now()
    WHERE id = p_owner_id;

    RETURN jsonb_build_object(
      'success', true,
      'owner_updated', true,
      'downlines_updated', 0,
      'total_updated', 1,
      'owner_name', COALESCE(
        NULLIF(TRIM(COALESCE(v_owner_first_name, '') || ' ' || COALESCE(v_owner_last_name, '')), ''),
        'Unknown'
      )
    );
  END IF;

  -- Update owner + all downlines in a single UPDATE
  -- Pattern: id = owner_id OR hierarchy_path starts with owner_path followed by a dot
  UPDATE user_profiles
  SET
    agency_id = p_agency_id,
    imo_id = p_imo_id,
    updated_at = now()
  WHERE
    id = p_owner_id  -- Owner themselves
    OR hierarchy_path LIKE v_owner_path || '.%';  -- All downlines

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'owner_updated', true,
    'downlines_updated', GREATEST(v_affected_count - 1, 0),  -- Subtract 1 for owner
    'total_updated', v_affected_count,
    'owner_name', COALESCE(
      NULLIF(TRIM(COALESCE(v_owner_first_name, '') || ' ' || COALESCE(v_owner_last_name, '')), ''),
      'Unknown'
    ),
    'owner_hierarchy_path', v_owner_path
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION cascade_agency_assignment IS
'Atomically assigns an owner and all their hierarchy downlines to a new agency.
Used when creating an agency with an owner to cascade the assignment through the hierarchy.
Parameters:
  - p_agency_id: The UUID of the agency to assign users to
  - p_owner_id: The UUID of the hierarchy owner/leader
  - p_imo_id: The UUID of the IMO (for setting user imo_id)
Returns JSONB with:
  - success: boolean indicating operation success
  - owner_updated: boolean
  - downlines_updated: count of downline users updated
  - total_updated: total users updated (owner + downlines)
  - owner_name: display name of the owner
  - error: error message if failed';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cascade_agency_assignment TO authenticated;
