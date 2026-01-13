-- Migration: Trigger to update hierarchy_path when upline_id changes
-- Purpose: When an agent's upline_id is updated, automatically recalculate their hierarchy_path
-- Date: 2026-01-13
--
-- This trigger runs BEFORE UPDATE to set the new hierarchy_path based on the new upline.
-- The existing cascade_hierarchy_path_changes trigger will then propagate to downlines.

CREATE OR REPLACE FUNCTION update_hierarchy_path_on_upline_change()
RETURNS TRIGGER AS $$
DECLARE
  v_upline_path TEXT;
  v_upline_depth INT;
BEGIN
  -- Only process if upline_id actually changed
  IF OLD.upline_id IS NOT DISTINCT FROM NEW.upline_id THEN
    RETURN NEW;
  END IF;

  -- If new upline is NULL, agent becomes a root (their path is just their ID)
  IF NEW.upline_id IS NULL THEN
    NEW.hierarchy_path := NEW.id::TEXT;
    NEW.hierarchy_depth := 0;
    RAISE NOTICE 'Agent % becoming root: path=%', NEW.id, NEW.hierarchy_path;
    RETURN NEW;
  END IF;

  -- Get the new upline's hierarchy_path and depth
  SELECT hierarchy_path, COALESCE(hierarchy_depth, 0)
  INTO v_upline_path, v_upline_depth
  FROM user_profiles
  WHERE id = NEW.upline_id;

  -- If upline not found or has no path, use upline's ID as their path
  IF v_upline_path IS NULL THEN
    v_upline_path := NEW.upline_id::TEXT;
    v_upline_depth := 0;
  END IF;

  -- Set agent's path as upline's path + their own ID
  NEW.hierarchy_path := v_upline_path || '.' || NEW.id::TEXT;
  NEW.hierarchy_depth := v_upline_depth + 1;

  RAISE NOTICE 'Agent % upline changed to %: path=%, depth=%',
    NEW.id, NEW.upline_id, NEW.hierarchy_path, NEW.hierarchy_depth;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (BEFORE UPDATE so we can modify NEW)
DROP TRIGGER IF EXISTS trigger_update_hierarchy_path_on_upline_change ON user_profiles;
CREATE TRIGGER trigger_update_hierarchy_path_on_upline_change
  BEFORE UPDATE OF upline_id ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_hierarchy_path_on_upline_change();

COMMENT ON FUNCTION update_hierarchy_path_on_upline_change IS
'Automatically updates hierarchy_path when upline_id changes.
Sets path to upline_path.agent_id and calculates depth.
The cascade_hierarchy_path_changes trigger then propagates to downlines.';

-- Also fix any existing records that have upline_id but incorrect/null hierarchy_path
-- This is a one-time fix for production data
DO $$
DECLARE
  r RECORD;
  v_upline_path TEXT;
  v_upline_depth INT;
  v_new_path TEXT;
  v_new_depth INT;
  v_fixed_count INT := 0;
BEGIN
  -- Find all users with upline_id but mismatched hierarchy_path
  FOR r IN
    SELECT u.id, u.email, u.upline_id, u.hierarchy_path
    FROM user_profiles u
    WHERE u.upline_id IS NOT NULL
    ORDER BY u.created_at -- Process older records first
  LOOP
    -- Get upline's path
    SELECT hierarchy_path, COALESCE(hierarchy_depth, 0)
    INTO v_upline_path, v_upline_depth
    FROM user_profiles
    WHERE id = r.upline_id;

    -- If upline has no path, use their ID
    IF v_upline_path IS NULL THEN
      v_upline_path := r.upline_id::TEXT;
      v_upline_depth := 0;
    END IF;

    -- Calculate expected path
    v_new_path := v_upline_path || '.' || r.id::TEXT;
    v_new_depth := v_upline_depth + 1;

    -- Update if different
    IF r.hierarchy_path IS DISTINCT FROM v_new_path THEN
      UPDATE user_profiles
      SET
        hierarchy_path = v_new_path,
        hierarchy_depth = v_new_depth,
        updated_at = NOW()
      WHERE id = r.id;

      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE 'Fixed hierarchy_path for %: % -> %', r.email, r.hierarchy_path, v_new_path;
    END IF;
  END LOOP;

  IF v_fixed_count > 0 THEN
    RAISE NOTICE 'Fixed % user hierarchy paths', v_fixed_count;
  END IF;
END $$;
