-- Migration: Add trigger to cascade hierarchy_path changes to downlines
-- Prevents the issue where moving an agent to a new upline doesn't update
-- their downlines' hierarchy paths

-- Function to cascade hierarchy_path changes to all downlines
CREATE OR REPLACE FUNCTION cascade_hierarchy_path_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_path_prefix TEXT;
  new_path_prefix TEXT;
  old_depth INT;
  new_depth INT;
  depth_diff INT;
BEGIN
  -- Only proceed if hierarchy_path actually changed
  IF OLD.hierarchy_path IS DISTINCT FROM NEW.hierarchy_path THEN
    old_path_prefix := OLD.hierarchy_path;
    new_path_prefix := NEW.hierarchy_path;
    old_depth := COALESCE(OLD.hierarchy_depth, 0);
    new_depth := COALESCE(NEW.hierarchy_depth, 0);
    depth_diff := new_depth - old_depth;

    -- Update all downlines whose path starts with the old path
    -- Replace the old prefix with the new prefix
    UPDATE user_profiles
    SET
      hierarchy_path = new_path_prefix || substring(hierarchy_path from length(old_path_prefix) + 1),
      hierarchy_depth = hierarchy_depth + depth_diff,
      updated_at = now()
    WHERE hierarchy_path LIKE old_path_prefix || '.%'
      AND id <> NEW.id;

    RAISE NOTICE 'Cascaded hierarchy change from % to % for user %', old_path_prefix, new_path_prefix, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_cascade_hierarchy_path ON user_profiles;
CREATE TRIGGER trigger_cascade_hierarchy_path
  AFTER UPDATE OF hierarchy_path ON user_profiles
  FOR EACH ROW
  WHEN (OLD.hierarchy_path IS DISTINCT FROM NEW.hierarchy_path)
  EXECUTE FUNCTION cascade_hierarchy_path_changes();

COMMENT ON FUNCTION cascade_hierarchy_path_changes() IS
  'Automatically cascades hierarchy_path changes to all downline users when an upline''s path changes';
