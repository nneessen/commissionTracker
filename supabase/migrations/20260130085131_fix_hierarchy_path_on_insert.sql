-- supabase/migrations/20260130085131_fix_hierarchy_path_on_insert.sql
-- Fix: Set hierarchy_path on INSERT (not just UPDATE)
--
-- Problem: The handle_new_user trigger doesn't set hierarchy_path.
-- The update_hierarchy_path_on_upline_change trigger only fires on UPDATE of upline_id.
-- This means users created with an upline_id already set (or set in the same transaction)
-- may have NULL hierarchy_path, breaking downward hierarchy counts.
--
-- Solution:
-- 1. Add a BEFORE INSERT trigger to set hierarchy_path if upline_id is provided
-- 2. Fix any existing users with NULL or incorrect hierarchy_path

-- ============================================================================
-- 1. Create function to set hierarchy_path on INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION set_hierarchy_path_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_upline_path TEXT;
  v_upline_depth INT;
BEGIN
  -- If no upline, user is a root (path = their own ID)
  IF NEW.upline_id IS NULL THEN
    NEW.hierarchy_path := NEW.id::TEXT;
    NEW.hierarchy_depth := 0;
    RETURN NEW;
  END IF;

  -- Get upline's hierarchy_path and depth
  SELECT hierarchy_path, COALESCE(hierarchy_depth, 0)
  INTO v_upline_path, v_upline_depth
  FROM user_profiles
  WHERE id = NEW.upline_id;

  -- If upline not found or has no path, use upline's ID as their path
  IF v_upline_path IS NULL THEN
    v_upline_path := NEW.upline_id::TEXT;
    v_upline_depth := 0;
  END IF;

  -- Set user's path as upline's path + their own ID
  NEW.hierarchy_path := v_upline_path || '.' || NEW.id::TEXT;
  NEW.hierarchy_depth := v_upline_depth + 1;

  RAISE NOTICE 'set_hierarchy_path_on_insert: User % with upline %: path=%, depth=%',
    NEW.id, NEW.upline_id, NEW.hierarchy_path, NEW.hierarchy_depth;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Create the BEFORE INSERT trigger
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_set_hierarchy_path_on_insert ON user_profiles;
CREATE TRIGGER trigger_set_hierarchy_path_on_insert
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_hierarchy_path_on_insert();

COMMENT ON FUNCTION set_hierarchy_path_on_insert IS
'Sets hierarchy_path and hierarchy_depth when a new user is inserted.
If upline_id is set, path = upline_path.user_id.
If upline_id is NULL, path = user_id (root user).
Works with the existing update_hierarchy_path_on_upline_change trigger.';

-- ============================================================================
-- 3. Fix any existing users with NULL or incorrect hierarchy_path
--    Process in order of hierarchy_depth to ensure parents are fixed first
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_upline_path TEXT;
  v_upline_depth INT;
  v_new_path TEXT;
  v_new_depth INT;
  v_fixed_count INT := 0;
  v_iteration INT := 0;
  v_max_iterations INT := 20; -- Prevent infinite loops
  v_changes_made BOOLEAN := TRUE;
BEGIN
  -- We may need multiple passes since fixing a parent affects children
  WHILE v_changes_made AND v_iteration < v_max_iterations LOOP
    v_changes_made := FALSE;
    v_iteration := v_iteration + 1;

    RAISE NOTICE 'Fix hierarchy paths: Iteration %', v_iteration;

    -- Process users ordered by their current depth (or 0 if NULL)
    FOR r IN
      SELECT u.id, u.email, u.upline_id, u.hierarchy_path, u.hierarchy_depth
      FROM user_profiles u
      WHERE u.approval_status = 'approved'  -- Only fix approved users
        AND u.archived_at IS NULL           -- Skip archived
      ORDER BY COALESCE(u.hierarchy_depth, 0), u.created_at
    LOOP
      -- Calculate expected path and depth
      IF r.upline_id IS NULL THEN
        -- Root user: path = their ID, depth = 0
        v_new_path := r.id::TEXT;
        v_new_depth := 0;
      ELSE
        -- Has upline: get upline's path
        SELECT hierarchy_path, COALESCE(hierarchy_depth, 0)
        INTO v_upline_path, v_upline_depth
        FROM user_profiles
        WHERE id = r.upline_id;

        -- If upline has no path yet, use upline's ID
        IF v_upline_path IS NULL THEN
          v_upline_path := r.upline_id::TEXT;
          v_upline_depth := 0;
        END IF;

        v_new_path := v_upline_path || '.' || r.id::TEXT;
        v_new_depth := v_upline_depth + 1;
      END IF;

      -- Update if different
      IF r.hierarchy_path IS DISTINCT FROM v_new_path OR
         r.hierarchy_depth IS DISTINCT FROM v_new_depth THEN
        UPDATE user_profiles
        SET
          hierarchy_path = v_new_path,
          hierarchy_depth = v_new_depth,
          updated_at = NOW()
        WHERE id = r.id;

        v_fixed_count := v_fixed_count + 1;
        v_changes_made := TRUE;

        RAISE NOTICE 'Fixed: % | old_path=% new_path=% | old_depth=% new_depth=%',
          r.email,
          COALESCE(r.hierarchy_path, 'NULL'),
          v_new_path,
          COALESCE(r.hierarchy_depth::TEXT, 'NULL'),
          v_new_depth;
      END IF;
    END LOOP;
  END LOOP;

  IF v_fixed_count > 0 THEN
    RAISE NOTICE 'Fixed % user hierarchy paths in % iterations', v_fixed_count, v_iteration;
  ELSE
    RAISE NOTICE 'All hierarchy paths are correct. No fixes needed.';
  END IF;
END $$;

-- ============================================================================
-- 4. Verify the fix by showing hierarchy counts
-- ============================================================================
DO $$
DECLARE
  v_null_paths INT;
  v_total_approved INT;
BEGIN
  SELECT COUNT(*) INTO v_null_paths
  FROM user_profiles
  WHERE hierarchy_path IS NULL
    AND approval_status = 'approved'
    AND archived_at IS NULL;

  SELECT COUNT(*) INTO v_total_approved
  FROM user_profiles
  WHERE approval_status = 'approved'
    AND archived_at IS NULL;

  RAISE NOTICE 'Verification: % approved users with NULL hierarchy_path out of % total approved',
    v_null_paths, v_total_approved;

  IF v_null_paths > 0 THEN
    RAISE WARNING 'There are still % users with NULL hierarchy_path. This may indicate a data issue.', v_null_paths;
  END IF;
END $$;
