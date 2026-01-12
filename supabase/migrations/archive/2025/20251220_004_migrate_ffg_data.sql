-- =============================================================================
-- FFG Data Migration
-- =============================================================================
-- This migration creates Founders Financial Group as the first IMO and
-- migrates all existing data to it.
-- =============================================================================

-- =============================================================================
-- STEP 1: Create Founders Financial Group IMO
-- =============================================================================
INSERT INTO imos (
  id,
  name,
  code,
  description,
  is_active
)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Founders Financial Group',
  'FFG',
  'Original IMO - all existing data migrated here',
  true
)
ON CONFLICT (code) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'Created Founders Financial Group IMO';
END $$;

-- =============================================================================
-- STEP 2: Create FFG Main Agency
-- =============================================================================
INSERT INTO agencies (
  id,
  imo_id,
  name,
  code,
  description,
  is_active
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Founders Financial Group - Main',
  'FFG-MAIN',
  'Primary agency for FFG',
  true
)
ON CONFLICT (imo_id, code) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'Created FFG Main Agency';
END $$;

-- =============================================================================
-- STEP 3: Assign all existing users to FFG IMO and Agency
-- =============================================================================
UPDATE user_profiles
SET
  imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  agency_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
WHERE imo_id IS NULL;

DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM user_profiles
  WHERE imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  RAISE NOTICE 'Assigned % users to FFG IMO', user_count;
END $$;

-- =============================================================================
-- STEP 4: Set agency owner (root agent with no upline who is admin)
-- =============================================================================
DO $$
DECLARE
  owner_id UUID;
BEGIN
  -- Find a suitable owner: root agent (no upline) who is admin
  SELECT id INTO owner_id
  FROM user_profiles
  WHERE upline_id IS NULL
  AND imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  AND (is_admin = true OR is_super_admin = true)
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no admin found, find any root agent
  IF owner_id IS NULL THEN
    SELECT id INTO owner_id
    FROM user_profiles
    WHERE upline_id IS NULL
    AND imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Set the agency owner
  IF owner_id IS NOT NULL THEN
    UPDATE agencies
    SET owner_id = owner_id
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND agencies.owner_id IS NULL;

    RAISE NOTICE 'Set agency owner to %', owner_id;
  ELSE
    RAISE NOTICE 'No suitable agency owner found';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Add imo_owner role to agency owner
-- =============================================================================
DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT agencies.owner_id INTO owner_id
  FROM agencies
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  IF owner_id IS NOT NULL THEN
    UPDATE user_profiles
    SET roles = array_append(COALESCE(roles, '{}'), 'imo_owner')
    WHERE id = owner_id
    AND NOT ('imo_owner' = ANY(COALESCE(roles, '{}')));

    RAISE NOTICE 'Added imo_owner role to agency owner %', owner_id;
  END IF;
END $$;

-- =============================================================================
-- STEP 6: Scope all reference data to FFG
-- =============================================================================

-- Carriers
UPDATE carriers
SET imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
WHERE imo_id IS NULL;

DO $$
DECLARE
  carrier_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO carrier_count FROM carriers WHERE imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  RAISE NOTICE 'Scoped % carriers to FFG', carrier_count;
END $$;

-- Products
UPDATE products
SET imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
WHERE imo_id IS NULL;

DO $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products WHERE imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  RAISE NOTICE 'Scoped % products to FFG', product_count;
END $$;

-- Comp Guide
UPDATE comp_guide
SET imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
WHERE imo_id IS NULL;

DO $$
DECLARE
  guide_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO guide_count FROM comp_guide WHERE imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  RAISE NOTICE 'Scoped % comp_guide entries to FFG', guide_count;
END $$;

-- Pipeline Templates
UPDATE pipeline_templates
SET imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
WHERE imo_id IS NULL;

DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM pipeline_templates WHERE imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  RAISE NOTICE 'Scoped % pipeline templates to FFG', template_count;
END $$;

-- =============================================================================
-- STEP 7: Backfill imo_id on transaction tables from user_profiles
-- =============================================================================

-- Policies - set imo_id from the policy owner's imo_id
UPDATE policies p
SET imo_id = (SELECT imo_id FROM user_profiles WHERE id = p.user_id)
WHERE p.imo_id IS NULL
AND p.user_id IS NOT NULL;

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM policies WHERE imo_id IS NOT NULL;
  RAISE NOTICE 'Set imo_id on % policies', policy_count;
END $$;

-- Commissions - set imo_id from the commission recipient's imo_id
UPDATE commissions c
SET imo_id = (SELECT imo_id FROM user_profiles WHERE id = c.user_id)
WHERE c.imo_id IS NULL
AND c.user_id IS NOT NULL;

DO $$
DECLARE
  commission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO commission_count FROM commissions WHERE imo_id IS NOT NULL;
  RAISE NOTICE 'Set imo_id on % commissions', commission_count;
END $$;

-- Override Commissions - set imo_id from the base agent's imo_id
UPDATE override_commissions oc
SET imo_id = (SELECT imo_id FROM user_profiles WHERE id = oc.base_agent_id)
WHERE oc.imo_id IS NULL
AND oc.base_agent_id IS NOT NULL;

DO $$
DECLARE
  override_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO override_count FROM override_commissions WHERE imo_id IS NOT NULL;
  RAISE NOTICE 'Set imo_id on % override_commissions', override_count;
END $$;

-- =============================================================================
-- STEP 8: Summary
-- =============================================================================
DO $$
DECLARE
  imo_count INTEGER;
  agency_count INTEGER;
  user_count INTEGER;
  carrier_count INTEGER;
  product_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO imo_count FROM imos;
  SELECT COUNT(*) INTO agency_count FROM agencies;
  SELECT COUNT(*) INTO user_count FROM user_profiles WHERE imo_id IS NOT NULL;
  SELECT COUNT(*) INTO carrier_count FROM carriers WHERE imo_id IS NOT NULL;
  SELECT COUNT(*) INTO product_count FROM products WHERE imo_id IS NOT NULL;
  SELECT COUNT(*) INTO policy_count FROM policies WHERE imo_id IS NOT NULL;

  RAISE NOTICE '=== FFG Migration Summary ===';
  RAISE NOTICE 'IMOs: %', imo_count;
  RAISE NOTICE 'Agencies: %', agency_count;
  RAISE NOTICE 'Users with IMO: %', user_count;
  RAISE NOTICE 'Carriers with IMO: %', carrier_count;
  RAISE NOTICE 'Products with IMO: %', product_count;
  RAISE NOTICE 'Policies with IMO: %', policy_count;
END $$;
