-- supabase/migrations/20260204130712_fix_orphan_hierarchy.sql
-- Fix: Connect orphan agents to proper uplines
--
-- Problem: 17 agents have broken hierarchy_path (not connected to Kerry Glass)
-- These agents are "orphans" - they exist but aren't in anyone's downline tree.
--
-- Solution: Set upline_id for each orphan root to their correct upline.
-- The update_hierarchy_path_trigger will automatically cascade hierarchy_path to all descendants.
--
-- Orphan mappings (confirmed by user):
-- - Conrad Seaman → Jake Holgate (cascades: Pete Schellenberger, Jeremiah Szoke, Chris Underwood, James Meiners, Chris Beckley, Bryce Ford, Alexander Valour)
-- - Benito Varela → Chase Cockrell
-- - Amanda Radich → Kerry Glass (direct)
-- - Hope George → Amanda Radich
-- - Evan Cain → Jake Holgate
-- - Logan Paulsen → Jake Holgate (cascades: Valentina Murra)
-- - James Schulze → Jake Holgate
-- - Jackson Mayo → Jake Holgate

-- ============================================================================
-- Fix orphan agent uplines
-- The trigger will cascade hierarchy_path automatically to all descendants
-- ============================================================================

-- Conrad Seaman → Jake Holgate (Dynasty Group owner)
-- Cascades to: Pete Schellenberger, Jeremiah Szoke, Chris Underwood, James Meiners, Chris Beckley, Bryce Ford, Alexander Valour
UPDATE user_profiles
SET upline_id = '814cf3c5-3d18-4513-a957-30d69d0fdfc3'
WHERE id = '83e5be54-1f21-4876-ad79-466d3392b490'
  AND (upline_id IS NULL OR upline_id != '814cf3c5-3d18-4513-a957-30d69d0fdfc3');

-- Benito Varela → Chase Cockrell (Financial 41 owner)
UPDATE user_profiles
SET upline_id = '64091d12-2929-4db2-b3f8-7184fb5a96a3'
WHERE id = '8c6bea82-1727-40d0-b8bc-a9c4b0516005'
  AND (upline_id IS NULL OR upline_id != '64091d12-2929-4db2-b3f8-7184fb5a96a3');

-- Amanda Radich → Kerry Glass (Self Made owner)
UPDATE user_profiles
SET upline_id = '30d4fe4c-1949-41fa-8147-d382a9d127bf'
WHERE id = 'bf1b6312-4945-4849-99c5-08e076056e39'
  AND (upline_id IS NULL OR upline_id != '30d4fe4c-1949-41fa-8147-d382a9d127bf');

-- Hope George → Amanda Radich
UPDATE user_profiles
SET upline_id = 'bf1b6312-4945-4849-99c5-08e076056e39'
WHERE id = '909111db-23a9-4aa0-a8cf-dadcd7489e7d'
  AND (upline_id IS NULL OR upline_id != 'bf1b6312-4945-4849-99c5-08e076056e39');

-- Evan Cain → Jake Holgate (Dynasty Group owner)
UPDATE user_profiles
SET upline_id = '814cf3c5-3d18-4513-a957-30d69d0fdfc3'
WHERE id = 'd50cc699-4e63-4d49-8898-94e55b845c4a'
  AND (upline_id IS NULL OR upline_id != '814cf3c5-3d18-4513-a957-30d69d0fdfc3');

-- Logan Paulsen → Jake Holgate (Valentina Murra will cascade)
UPDATE user_profiles
SET upline_id = '814cf3c5-3d18-4513-a957-30d69d0fdfc3'
WHERE id = 'd6c166d3-b837-461a-9cb5-952677973ec3'
  AND (upline_id IS NULL OR upline_id != '814cf3c5-3d18-4513-a957-30d69d0fdfc3');

-- James Schulze → Jake Holgate
UPDATE user_profiles
SET upline_id = '814cf3c5-3d18-4513-a957-30d69d0fdfc3'
WHERE id = 'd8d4db40-a0ed-4ea2-a7f5-d69265ded3f0'
  AND (upline_id IS NULL OR upline_id != '814cf3c5-3d18-4513-a957-30d69d0fdfc3');

-- Jackson Mayo → Jake Holgate
UPDATE user_profiles
SET upline_id = '814cf3c5-3d18-4513-a957-30d69d0fdfc3'
WHERE id = 'e4e540fa-a041-4a89-818f-c324ab42412e'
  AND (upline_id IS NULL OR upline_id != '814cf3c5-3d18-4513-a957-30d69d0fdfc3');

-- ============================================================================
-- Verification query (for manual check after migration)
-- ============================================================================
-- Run this to verify all agents now connect to Kerry Glass:
-- SELECT COUNT(*) as total_agents
-- FROM user_profiles
-- WHERE approval_status = 'approved'
--   AND archived_at IS NULL
--   AND (
--     roles @> ARRAY['agent']
--     OR roles @> ARRAY['active_agent']
--     OR is_admin = true
--   )
--   AND NOT (
--     roles @> ARRAY['recruit']
--     AND NOT roles @> ARRAY['agent']
--     AND NOT roles @> ARRAY['active_agent']
--   )
--   AND (
--     id = '30d4fe4c-1949-41fa-8147-d382a9d127bf'  -- Kerry Glass
--     OR hierarchy_path LIKE '30d4fe4c-1949-41fa-8147-d382a9d127bf.%'
--   );
-- Expected: 77
