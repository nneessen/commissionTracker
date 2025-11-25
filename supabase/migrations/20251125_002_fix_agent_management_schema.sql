-- Migration: Fix Agent Management Schema
-- Purpose: Fix contract_level from VARCHAR (job titles) to NUMERIC (commission percentages)
--          Remove unnecessary fields and constraints added in previous migration
-- Created: 2025-11-25
--
-- FIXES:
--   - contract_level: VARCHAR with job titles → NUMERIC (100, 110, 115, 120)
--   - Remove phone field (not needed)
--   - Remove full_name field (not needed for core system)
--   - Keep is_active (useful for soft deletes)
--   - Remove wrong CHECK constraints

BEGIN;

-- ============================================
-- 1. DROP WRONG CONSTRAINTS
-- ============================================

-- Drop contract level job title constraint
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS chk_valid_contract_level;

-- Drop phone format constraint
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS chk_phone_format;

-- ============================================
-- 2. DROP UNNECESSARY COLUMNS
-- ============================================

-- Drop phone column (not needed)
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS phone;

-- Drop full_name column (not needed for core system)
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS full_name;

-- ============================================
-- 3. FIX contract_level TO NUMERIC
-- ============================================

-- Drop existing indexes on contract_level
DROP INDEX IF EXISTS idx_user_profiles_contract_level;
DROP INDEX IF EXISTS idx_user_profiles_full_name;

-- Change contract_level from VARCHAR to NUMERIC
-- First set all existing values to NULL (since they're wrong job title strings)
UPDATE user_profiles SET contract_level = NULL WHERE contract_level IS NOT NULL;

-- Now alter the column type
ALTER TABLE user_profiles
  ALTER COLUMN contract_level TYPE NUMERIC USING NULL;

-- Add CHECK constraint for valid commission percentages
ALTER TABLE user_profiles
  ADD CONSTRAINT chk_contract_level_valid_percentage
  CHECK (
    contract_level IS NULL OR
    contract_level IN (100, 110, 115, 120)
  );

-- Add index for contract_level queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_contract_level ON user_profiles(contract_level)
  WHERE contract_level IS NOT NULL;

-- ============================================
-- 4. VERIFY is_active IS CORRECT
-- ============================================

-- Ensure is_active column exists with proper defaults
-- (This was added correctly in previous migration, just verify)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
  END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  contract_level_type TEXT;
  is_active_exists BOOLEAN;
  phone_exists BOOLEAN;
  full_name_exists BOOLEAN;
BEGIN
  -- Check contract_level type
  SELECT data_type INTO contract_level_type
  FROM information_schema.columns
  WHERE table_name = 'user_profiles' AND column_name = 'contract_level';

  -- Check column existence
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_active') INTO is_active_exists;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'phone') INTO phone_exists;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'full_name') INTO full_name_exists;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Agent Management Schema Fixed!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'contract_level type: % (should be numeric)', contract_level_type;
  RAISE NOTICE 'is_active column exists: % (should be true)', is_active_exists;
  RAISE NOTICE 'phone column exists: % (should be false)', phone_exists;
  RAISE NOTICE 'full_name column exists: % (should be false)', full_name_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Valid contract_level values: 100, 110, 115, 120 (or NULL)';
  RAISE NOTICE 'All existing contract_level values set to NULL';
  RAISE NOTICE '===========================================';
END $$;
