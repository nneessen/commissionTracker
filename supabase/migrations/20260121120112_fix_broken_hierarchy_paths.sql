-- Migration: Fix broken hierarchy_path values
-- Problem: Some users have hierarchy_path that doesn't include full ancestor chain
-- Example: nick.neessen@gmail.com has path "23ae626c...0a860b22..." 
--          but should have "30d4fe4c...d0d3edea...23ae626c...0a860b22..."
-- This causes the LIKE query to miss them when fetching downlines

-- Fix function: Recursively rebuild hierarchy_path from upline chain
CREATE OR REPLACE FUNCTION fix_all_hierarchy_paths()
RETURNS TABLE(fixed_email text, old_path text, new_path text) AS $$
DECLARE
  r RECORD;
  v_upline_path text;
  v_new_path text;
  v_new_depth int;
BEGIN
  -- Process users ordered by their actual depth (roots first, then their children, etc.)
  FOR r IN 
    WITH RECURSIVE hierarchy AS (
      -- Base: users with no upline (roots)
      SELECT id, email, upline_id, hierarchy_path, 0 as calc_depth
      FROM user_profiles
      WHERE upline_id IS NULL
      
      UNION ALL
      
      -- Recursive: children of previous level
      SELECT up.id, up.email, up.upline_id, up.hierarchy_path, h.calc_depth + 1
      FROM user_profiles up
      JOIN hierarchy h ON up.upline_id = h.id
    )
    SELECT * FROM hierarchy ORDER BY calc_depth
  LOOP
    IF r.upline_id IS NULL THEN
      -- Root user: path = just their ID
      v_new_path := r.id::text;
      v_new_depth := 0;
    ELSE
      -- Get upline's current path (which should be fixed by now due to ordering)
      SELECT hierarchy_path, COALESCE(hierarchy_depth, 0)
      INTO v_upline_path, v_new_depth
      FROM user_profiles
      WHERE id = r.upline_id;
      
      v_new_path := v_upline_path || '.' || r.id::text;
      v_new_depth := v_new_depth + 1;
    END IF;
    
    -- Only update if path is different
    IF r.hierarchy_path IS DISTINCT FROM v_new_path THEN
      UPDATE user_profiles
      SET hierarchy_path = v_new_path,
          hierarchy_depth = v_new_depth
      WHERE id = r.id;
      
      fixed_email := r.email;
      old_path := r.hierarchy_path;
      new_path := v_new_path;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the fix and log results
DO $$
DECLARE
  r RECORD;
  fix_count int := 0;
BEGIN
  RAISE NOTICE 'Starting hierarchy_path fix...';
  
  FOR r IN SELECT * FROM fix_all_hierarchy_paths() LOOP
    RAISE NOTICE 'Fixed %: % -> %', r.fixed_email, LEFT(r.old_path, 40), LEFT(r.new_path, 60);
    fix_count := fix_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Fixed % users with incorrect hierarchy_path', fix_count;
END $$;

-- Cleanup
DROP FUNCTION fix_all_hierarchy_paths();

-- Add comment
COMMENT ON TABLE user_profiles IS 'User profiles with hierarchy. hierarchy_path must contain full ancestor chain: root.parent.child';
