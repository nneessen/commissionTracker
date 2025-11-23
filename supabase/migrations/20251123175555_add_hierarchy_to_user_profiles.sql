-- Migration: Add Hierarchy Columns to user_profiles
-- Purpose: Add upline_id, hierarchy_path, hierarchy_depth for agency hierarchy system
-- CRITICAL: Does NOT modify existing RLS policies or approval system
-- Created: 2025-11-23

BEGIN;

-- ============================================
-- 1. ADD HIERARCHY COLUMNS TO USER_PROFILES
-- ============================================

-- Add hierarchy columns (NOT NULL constraints added after populating existing rows)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS upline_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hierarchy_path TEXT,
  ADD COLUMN IF NOT EXISTS hierarchy_depth INTEGER DEFAULT 0;

-- ============================================
-- 2. POPULATE EXISTING ROWS (all current users are root agents)
-- ============================================

UPDATE user_profiles
SET
  hierarchy_path = id::text,
  hierarchy_depth = 0
WHERE hierarchy_path IS NULL;

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_upline_id ON user_profiles(upline_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_hierarchy_path ON user_profiles(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_user_profiles_hierarchy_depth ON user_profiles(hierarchy_depth);

-- ============================================
-- 4. ADD CONSTRAINTS
-- ============================================

-- Prevent self-referencing (agent can't be their own upline)
ALTER TABLE user_profiles
  ADD CONSTRAINT chk_no_self_upline
  CHECK (id != upline_id);

-- ============================================
-- 5. CREATE TRIGGER TO AUTO-UPDATE hierarchy_path
-- ============================================

CREATE OR REPLACE FUNCTION update_hierarchy_path()
RETURNS TRIGGER AS $$
BEGIN
  -- If no upline, agent is a root node
  IF NEW.upline_id IS NULL THEN
    NEW.hierarchy_path := NEW.id::text;
    NEW.hierarchy_depth := 0;
  ELSE
    -- Get upline's path and depth
    SELECT
      up.hierarchy_path || '.' || NEW.id,
      up.hierarchy_depth + 1
    INTO NEW.hierarchy_path, NEW.hierarchy_depth
    FROM user_profiles up
    WHERE up.id = NEW.upline_id;

    -- If upline not found (shouldn't happen due to FK), default to root
    IF NEW.hierarchy_path IS NULL THEN
      NEW.hierarchy_path := NEW.id::text;
      NEW.hierarchy_depth := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires BEFORE INSERT or UPDATE of upline_id
CREATE TRIGGER update_hierarchy_path_trigger
  BEFORE INSERT OR UPDATE OF upline_id ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_hierarchy_path();

-- ============================================
-- 6. CREATE TRIGGER TO PREVENT CIRCULAR REFERENCES
-- ============================================

CREATE OR REPLACE FUNCTION check_no_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if upline_id is being set (not NULL)
  IF NEW.upline_id IS NOT NULL THEN
    -- Check if new upline is in the downline chain of current user
    IF EXISTS (
      WITH RECURSIVE downline_check AS (
        -- Start with current user
        SELECT id FROM user_profiles WHERE id = NEW.id

        UNION

        -- Recursively get all downlines
        SELECT up.id
        FROM user_profiles up
        INNER JOIN downline_check dc ON up.upline_id = dc.id
      )
      SELECT 1 FROM downline_check WHERE id = NEW.upline_id
    ) THEN
      RAISE EXCEPTION 'Circular hierarchy detected: Cannot set upline_id=% for user_id=% (would create cycle)',
        NEW.upline_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires BEFORE UPDATE of upline_id (not on INSERT, since new users can't have downlines yet)
CREATE TRIGGER check_circular_reference_trigger
  BEFORE UPDATE OF upline_id ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_no_circular_reference();

-- ============================================
-- 7. CREATE HELPER FUNCTION TO GET ALL DOWNLINE IDS
-- ============================================

-- This function is used by RLS policies in Migration 4
CREATE OR REPLACE FUNCTION get_downline_ids(target_user_id UUID)
RETURNS TABLE(downline_id UUID)
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE downline_tree AS (
    -- Base case: target user themselves
    SELECT id FROM user_profiles WHERE id = target_user_id

    UNION

    -- Recursive case: all users whose upline_id is in the tree
    SELECT up.id
    FROM user_profiles up
    INNER JOIN downline_tree dt ON up.upline_id = dt.id
  )
  SELECT id FROM downline_tree;
$$ LANGUAGE SQL STABLE;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 1: Hierarchy Columns Added!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Added to user_profiles:';
    RAISE NOTICE '  - upline_id (nullable FK to user_profiles)';
    RAISE NOTICE '  - hierarchy_path (e.g., "root.user1.user5")';
    RAISE NOTICE '  - hierarchy_depth (0 = root agent)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - update_hierarchy_path() trigger';
    RAISE NOTICE '  - check_no_circular_reference() trigger';
    RAISE NOTICE '  - get_downline_ids() helper function';
    RAISE NOTICE '  - Indexes on upline_id, hierarchy_path, depth';
    RAISE NOTICE '';
    RAISE NOTICE 'Existing users initialized as root agents (depth=0)';
    RAISE NOTICE 'RLS policies NOT modified (safe)';
    RAISE NOTICE '===========================================';
END $$;
