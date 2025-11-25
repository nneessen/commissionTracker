-- Migration: Add Agent Management Fields to user_profiles
-- Purpose: Add fields required for complete agent CRUD operations
-- Created: 2025-11-25
--
-- ADDS:
--   - full_name: Display name for agents
--   - phone: Optional contact information
--   - is_active: Soft delete flag (deactivate agents without breaking hierarchy)
--   - contract_level: Agent's contract level (Agent, Manager, Director, etc.)

BEGIN;

-- ============================================
-- 1. ADD NEW COLUMNS TO user_profiles
-- ============================================

-- Add full_name (nullable initially, we'll populate from email)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Add phone (optional contact info)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add is_active (soft delete flag, defaults to true)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add contract_level (agent's level in the organization)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS contract_level VARCHAR(100);

-- ============================================
-- 2. POPULATE EXISTING ROWS
-- ============================================

-- Set full_name from email for existing users (can be updated later)
UPDATE user_profiles
SET full_name = SPLIT_PART(email, '@', 1)
WHERE full_name IS NULL;

-- Set all existing users to active
UPDATE user_profiles
SET is_active = true
WHERE is_active IS NULL;

-- Set default contract level for existing users
UPDATE user_profiles
SET contract_level = 'Agent'
WHERE contract_level IS NULL;

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_contract_level ON user_profiles(contract_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name ON user_profiles(full_name);

-- ============================================
-- 4. ADD CHECK CONSTRAINTS
-- ============================================

-- Valid contract levels (can be extended as needed)
ALTER TABLE user_profiles
  ADD CONSTRAINT chk_valid_contract_level
  CHECK (contract_level IN (
    'Agent',
    'Senior Agent',
    'District Manager',
    'Regional Manager',
    'National Sales Director',
    'Vice President',
    'Executive'
  ) OR contract_level IS NULL);

-- Phone format validation (basic E.164 format)
ALTER TABLE user_profiles
  ADD CONSTRAINT chk_phone_format
  CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$' OR phone ~ '^[0-9]{10}$' OR phone ~ '^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$');

-- ============================================
-- 5. UPDATE RLS POLICIES (if needed)
-- ============================================

-- Note: Existing RLS policies should still work.
-- Admin policies were added in migration 20251124122459_add_admin_policies_to_user_profiles.sql
-- No additional RLS changes needed for these new fields.

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  column_count INTEGER;
  active_users INTEGER;
  inactive_users INTEGER;
BEGIN
  -- Count new columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'user_profiles'
  AND column_name IN ('full_name', 'phone', 'is_active', 'contract_level');

  -- Count active/inactive users
  SELECT COUNT(*) INTO active_users FROM user_profiles WHERE is_active = true;
  SELECT COUNT(*) INTO inactive_users FROM user_profiles WHERE is_active = false;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Agent Management Fields Added!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'New columns added: %', column_count;
  RAISE NOTICE 'Fields added:';
  RAISE NOTICE '  - full_name VARCHAR(255) (display name)';
  RAISE NOTICE '  - phone VARCHAR(50) (optional contact)';
  RAISE NOTICE '  - is_active BOOLEAN (soft delete flag)';
  RAISE NOTICE '  - contract_level VARCHAR(100) (agent level)';
  RAISE NOTICE '';
  RAISE NOTICE 'User Status:';
  RAISE NOTICE '  - Active users: %', active_users;
  RAISE NOTICE '  - Inactive users: %', inactive_users;
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes created on: is_active, contract_level, full_name';
  RAISE NOTICE 'Constraints: Valid contract levels, phone format';
  RAISE NOTICE '===========================================';
END $$;
