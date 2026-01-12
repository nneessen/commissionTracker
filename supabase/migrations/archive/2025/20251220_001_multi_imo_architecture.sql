-- =============================================================================
-- Multi-IMO / Multi-Agency Architecture
-- =============================================================================
-- This migration creates the foundational tables for multi-tenant IMO support.
-- An IMO (Independent Marketing Organization) is the top-level tenant boundary.
-- Agencies exist within IMOs, and agents belong to exactly one agency.
-- =============================================================================

-- =============================================================================
-- 1. Create imos table (top-level tenant)
-- =============================================================================
CREATE TABLE IF NOT EXISTS imos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,  -- Short code like 'FFG'
  description TEXT,

  -- Contact info
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,

  -- Address
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Branding
  logo_url TEXT,
  primary_color TEXT,  -- Hex color for theming
  secondary_color TEXT,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment
COMMENT ON TABLE imos IS 'Independent Marketing Organizations - top-level tenant boundary for multi-tenant isolation';
COMMENT ON COLUMN imos.code IS 'Unique short code for the IMO (e.g., FFG for Founders Financial Group)';

-- =============================================================================
-- 2. Create agencies table (within an IMO)
-- =============================================================================
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,  -- Unique within IMO
  description TEXT,

  -- Contact info
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,

  -- Address
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Branding (optional, can inherit from IMO)
  logo_url TEXT,

  -- Agency owner (will be constrained after user_profiles is altered)
  owner_id UUID,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint on code within IMO
  UNIQUE (imo_id, code)
);

-- Add comments
COMMENT ON TABLE agencies IS 'Agencies within an IMO - each agency has its own agent hierarchy';
COMMENT ON COLUMN agencies.owner_id IS 'The user who owns this agency (root of agency hierarchy)';

-- =============================================================================
-- 3. Add IMO/Agency columns to user_profiles
-- =============================================================================
DO $$
BEGIN
  -- Add imo_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN imo_id UUID REFERENCES imos(id);
  END IF;

  -- Add agency_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN agency_id UUID REFERENCES agencies(id);
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN user_profiles.imo_id IS 'The IMO this user belongs to (tenant boundary)';
COMMENT ON COLUMN user_profiles.agency_id IS 'The agency this user belongs to (hierarchy boundary)';

-- =============================================================================
-- 4. Add owner_id FK constraint to agencies (after user_profiles has been altered)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'agencies_owner_id_fkey'
  ) THEN
    ALTER TABLE agencies
      ADD CONSTRAINT agencies_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 5. Add imo_id to reference data tables
-- =============================================================================

-- Carriers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carriers' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE carriers ADD COLUMN imo_id UUID REFERENCES imos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE products ADD COLUMN imo_id UUID REFERENCES imos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Comp Guide
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comp_guide' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE comp_guide ADD COLUMN imo_id UUID REFERENCES imos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Pipeline Templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pipeline_templates' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE pipeline_templates ADD COLUMN imo_id UUID REFERENCES imos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- 6. Add imo_id to transaction tables (denormalized for RLS performance)
-- =============================================================================

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'policies' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE policies ADD COLUMN imo_id UUID REFERENCES imos(id);
  END IF;
END $$;

-- Commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE commissions ADD COLUMN imo_id UUID REFERENCES imos(id);
  END IF;
END $$;

-- Override Commissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'override_commissions' AND column_name = 'imo_id'
  ) THEN
    ALTER TABLE override_commissions ADD COLUMN imo_id UUID REFERENCES imos(id);
  END IF;
END $$;

-- =============================================================================
-- 7. Create indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_imos_code ON imos(code);
CREATE INDEX IF NOT EXISTS idx_imos_is_active ON imos(is_active);

CREATE INDEX IF NOT EXISTS idx_agencies_imo_id ON agencies(imo_id);
CREATE INDEX IF NOT EXISTS idx_agencies_owner_id ON agencies(owner_id);
CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON agencies(is_active);

CREATE INDEX IF NOT EXISTS idx_user_profiles_imo_id ON user_profiles(imo_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_agency_id ON user_profiles(agency_id);

CREATE INDEX IF NOT EXISTS idx_carriers_imo_id ON carriers(imo_id);
CREATE INDEX IF NOT EXISTS idx_products_imo_id ON products(imo_id);
CREATE INDEX IF NOT EXISTS idx_comp_guide_imo_id ON comp_guide(imo_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_imo_id ON pipeline_templates(imo_id);

CREATE INDEX IF NOT EXISTS idx_policies_imo_id ON policies(imo_id);
CREATE INDEX IF NOT EXISTS idx_commissions_imo_id ON commissions(imo_id);
CREATE INDEX IF NOT EXISTS idx_override_commissions_imo_id ON override_commissions(imo_id);

-- =============================================================================
-- 8. Create updated_at trigger for new tables
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to imos table
DROP TRIGGER IF EXISTS update_imos_updated_at ON imos;
CREATE TRIGGER update_imos_updated_at
  BEFORE UPDATE ON imos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to agencies table
DROP TRIGGER IF EXISTS update_agencies_updated_at ON agencies;
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
