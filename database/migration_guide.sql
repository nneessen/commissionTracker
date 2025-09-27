-- /home/nneessen/projects/commissionTracker/database/migration_guide.sql
-- Migration guide for transitioning from existing schema to new comprehensive schema
-- Run these scripts in order to safely migrate existing data

-- =============================================================================
-- STEP 1: BACKUP EXISTING DATA
-- =============================================================================

-- Create backup tables before migration
CREATE TABLE backup_carriers AS SELECT * FROM carriers;
CREATE TABLE backup_policies AS SELECT * FROM policies;
CREATE TABLE backup_commissions AS SELECT * FROM commissions;
CREATE TABLE backup_expenses AS SELECT * FROM expenses;
CREATE TABLE backup_constants AS SELECT * FROM constants;

-- If agents table exists
CREATE TABLE backup_agents AS SELECT * FROM agents WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents');

-- If comp_guide table exists
CREATE TABLE backup_comp_guide AS SELECT * FROM comp_guide WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comp_guide');

-- If chargebacks table exists
CREATE TABLE backup_chargebacks AS SELECT * FROM chargebacks WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chargebacks');

-- =============================================================================
-- STEP 2: DROP EXISTING CONSTRAINTS AND INDEXES
-- =============================================================================

-- Drop foreign key constraints that might conflict
ALTER TABLE IF EXISTS policies DROP CONSTRAINT IF EXISTS policies_carrier_id_fkey;
ALTER TABLE IF EXISTS policies DROP CONSTRAINT IF EXISTS policies_agent_id_fkey;
ALTER TABLE IF EXISTS commissions DROP CONSTRAINT IF EXISTS commissions_policy_id_fkey;
ALTER TABLE IF EXISTS commissions DROP CONSTRAINT IF EXISTS commissions_carrier_id_fkey;
ALTER TABLE IF EXISTS commissions DROP CONSTRAINT IF EXISTS commissions_agent_id_fkey;
ALTER TABLE IF EXISTS chargebacks DROP CONSTRAINT IF EXISTS chargebacks_policy_id_fkey;
ALTER TABLE IF EXISTS chargebacks DROP CONSTRAINT IF EXISTS chargebacks_commission_id_fkey;
ALTER TABLE IF EXISTS chargebacks DROP CONSTRAINT IF EXISTS chargebacks_agent_id_fkey;

-- Drop views that might conflict
DROP VIEW IF EXISTS commission_summary_view CASCADE;
DROP VIEW IF EXISTS monthly_commission_summary CASCADE;
DROP VIEW IF EXISTS policy_performance_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboard_summary CASCADE;

-- =============================================================================
-- STEP 3: ALTER EXISTING TABLES TO MATCH NEW SCHEMA
-- =============================================================================

-- Update carriers table
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS short_name VARCHAR(50);
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}';
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE carriers ALTER COLUMN commission_rates TYPE JSONB USING commission_rates::JSONB;
ALTER TABLE carriers RENAME COLUMN commission_rates TO default_commission_rates;

-- Update policies table
ALTER TABLE policies ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_state CHAR(2);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_age INTEGER;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS client_metadata JSONB DEFAULT '{}';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS product_name VARCHAR(100);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS product_type VARCHAR(50);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS term_length_years INTEGER;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS monthly_premium DECIMAL(12,2) GENERATED ALWAYS AS (annual_premium / 12) STORED;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS commission_percentage_override DECIMAL(6,3);
ALTER TABLE policies RENAME COLUMN term_length TO term_length_years;

-- Update existing client JSONB data to extract into columns
UPDATE policies SET
  client_name = COALESCE(client->>'name', 'Unknown Client'),
  client_state = COALESCE(client->>'state', 'XX'),
  client_age = CASE
    WHEN client->>'age' ~ '^[0-9]+$' THEN (client->>'age')::INTEGER
    ELSE NULL
  END,
  client_email = client->>'email',
  client_phone = client->>'phone'
WHERE client IS NOT NULL;

-- Extract product information
UPDATE policies SET
  product_name = COALESCE(product, 'Unknown Product'),
  product_type = CASE
    WHEN product ILIKE '%whole%life%' THEN 'whole_life'
    WHEN product ILIKE '%term%life%' THEN 'term_life'
    WHEN product ILIKE '%universal%life%' AND product ILIKE '%indexed%' THEN 'indexed_universal_life'
    WHEN product ILIKE '%universal%life%' THEN 'universal_life'
    WHEN product ILIKE '%accidental%' THEN 'accidental_life'
    ELSE 'whole_life'
  END
WHERE product IS NOT NULL;

-- Update commissions table
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS client_state CHAR(2);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS client_age INTEGER;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS product_name VARCHAR(100);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS product_type VARCHAR(50);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS monthly_premium DECIMAL(12,2);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS advance_months INTEGER DEFAULT 9;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS contract_comp_level INTEGER;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS comp_guide_id UUID;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT false;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS year_earned INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM COALESCE(actual_date, expected_date, created_at))) STORED;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS month_earned INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM COALESCE(actual_date, expected_date, created_at))) STORED;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS quarter_earned INTEGER GENERATED ALWAYS AS (EXTRACT(QUARTER FROM COALESCE(actual_date, expected_date, created_at))) STORED;

-- Update existing commission client data
UPDATE commissions SET
  client_name = COALESCE(client->>'name', 'Unknown Client'),
  client_state = COALESCE(client->>'state', 'XX'),
  client_age = CASE
    WHEN client->>'age' ~ '^[0-9]+$' THEN (client->>'age')::INTEGER
    ELSE NULL
  END,
  monthly_premium = annual_premium / 12,
  product_name = COALESCE(product, 'Unknown Product'),
  product_type = CASE
    WHEN product ILIKE '%whole%life%' THEN 'whole_life'
    WHEN product ILIKE '%term%life%' THEN 'term_life'
    WHEN product ILIKE '%universal%life%' AND product ILIKE '%indexed%' THEN 'indexed_universal_life'
    WHEN product ILIKE '%universal%life%' THEN 'universal_life'
    WHEN product ILIKE '%accidental%' THEN 'accidental_life'
    ELSE 'whole_life'
  END
WHERE client IS NOT NULL OR product IS NOT NULL;

-- Update expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS year_incurred INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM expense_date)) STORED;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS month_incurred INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM expense_date)) STORED;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quarter_incurred INTEGER GENERATED ALWAYS AS (EXTRACT(QUARTER FROM expense_date)) STORED;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Set expense_date from created_at if null
UPDATE expenses SET expense_date = created_at::DATE WHERE expense_date IS NULL;

-- Update constants table
ALTER TABLE constants ADD COLUMN IF NOT EXISTS value_type VARCHAR(20) DEFAULT 'decimal';
ALTER TABLE constants ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
ALTER TABLE constants ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true;

-- Update value types for existing constants
UPDATE constants SET
  value_type = CASE
    WHEN key LIKE '%rate%' OR key LIKE '%percentage%' THEN 'percentage'
    WHEN key LIKE '%target%' OR key LIKE '%income%' OR key LIKE '%AP%' THEN 'currency'
    WHEN key LIKE '%months%' OR key LIKE '%level%' THEN 'integer'
    ELSE 'decimal'
  END,
  category = CASE
    WHEN key LIKE '%target%' THEN 'targets'
    WHEN key LIKE '%rate%' THEN 'rates'
    ELSE 'settings'
  END;

-- =============================================================================
-- STEP 4: CREATE NEW TABLES IF THEY DON'T EXIST
-- =============================================================================

-- Create agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  contract_comp_level INTEGER NOT NULL DEFAULT 100
    CHECK (contract_comp_level >= 80 AND contract_comp_level <= 145),
  license_number VARCHAR(100),
  license_states TEXT[],
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  ytd_commission DECIMAL(12,2) DEFAULT 0,
  ytd_premium DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comp_guide table if it doesn't exist
CREATE TABLE IF NOT EXISTS comp_guide (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  contract_level INTEGER NOT NULL CHECK (contract_level >= 80 AND contract_level <= 145),
  commission_percentage DECIMAL(6,3) NOT NULL CHECK (commission_percentage >= 0),
  first_year_percentage DECIMAL(6,3),
  renewal_percentage DECIMAL(6,3),
  trail_percentage DECIMAL(6,3),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(carrier_id, product_name, contract_level, effective_date)
);

-- Create chargebacks table if it doesn't exist
CREATE TABLE IF NOT EXISTS chargebacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE RESTRICT,
  chargeback_type VARCHAR(50) NOT NULL DEFAULT 'policy_lapse'
    CHECK (chargeback_type IN ('policy_lapse', 'refund', 'cancellation', 'rescission', 'death_claim', 'other')),
  chargeback_amount DECIMAL(12,2) NOT NULL CHECK (chargeback_amount >= 0),
  chargeback_reason TEXT,
  policy_lapse_date DATE,
  chargeback_date DATE NOT NULL,
  notification_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'disputed', 'resolved', 'cancelled')),
  amount_recovered DECIMAL(12,2) DEFAULT 0,
  net_impact DECIMAL(12,2) GENERATED ALWAYS AS (chargeback_amount - amount_recovered) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- STEP 5: ADD CONSTRAINTS AND FOREIGN KEYS
-- =============================================================================

-- Add foreign key constraints
ALTER TABLE policies ADD CONSTRAINT fk_policies_agent_id
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

ALTER TABLE policies ADD CONSTRAINT fk_policies_carrier_id
  FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE RESTRICT;

ALTER TABLE commissions ADD CONSTRAINT fk_commissions_policy_id
  FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE SET NULL;

ALTER TABLE commissions ADD CONSTRAINT fk_commissions_agent_id
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

ALTER TABLE commissions ADD CONSTRAINT fk_commissions_carrier_id
  FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE RESTRICT;

ALTER TABLE commissions ADD CONSTRAINT fk_commissions_comp_guide_id
  FOREIGN KEY (comp_guide_id) REFERENCES comp_guide(id) ON DELETE SET NULL;

-- Add check constraints
ALTER TABLE policies ADD CONSTRAINT chk_policy_status
  CHECK (status IN ('pending', 'active', 'lapsed', 'cancelled', 'matured'));

ALTER TABLE policies ADD CONSTRAINT chk_product_type
  CHECK (product_type IN ('whole_life', 'term_life', 'universal_life', 'indexed_universal_life', 'accidental_life'));

ALTER TABLE policies ADD CONSTRAINT chk_payment_frequency
  CHECK (payment_frequency IN ('annual', 'semi-annual', 'quarterly', 'monthly'));

ALTER TABLE commissions ADD CONSTRAINT chk_commission_type
  CHECK (commission_type IN ('first_year', 'renewal', 'trail', 'bonus', 'override', 'chargeback'));

ALTER TABLE commissions ADD CONSTRAINT chk_commission_status
  CHECK (status IN ('pending', 'expected', 'paid', 'clawback', 'cancelled', 'disputed'));

ALTER TABLE commissions ADD CONSTRAINT chk_calculation_basis
  CHECK (calculation_basis IN ('premium', 'fixed', 'tiered'));

ALTER TABLE expenses ADD CONSTRAINT chk_expense_category
  CHECK (category IN ('personal', 'business'));

-- =============================================================================
-- STEP 6: CREATE MISSING INDEXES
-- =============================================================================

-- Run the comprehensive_schema.sql indexes section here
-- (Copy the index creation statements from the comprehensive schema)

-- =============================================================================
-- STEP 7: CREATE TRIGGERS
-- =============================================================================

-- Create the update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_carriers_updated_at ON carriers;
CREATE TRIGGER update_carriers_updated_at
  BEFORE UPDATE ON carriers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comp_guide_updated_at ON comp_guide;
CREATE TRIGGER update_comp_guide_updated_at
  BEFORE UPDATE ON comp_guide FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policies_updated_at ON policies;
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions;
CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chargebacks_updated_at ON chargebacks;
CREATE TRIGGER update_chargebacks_updated_at
  BEFORE UPDATE ON chargebacks FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_constants_updated_at ON constants;
CREATE TRIGGER update_constants_updated_at
  BEFORE UPDATE ON constants FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 8: CREATE VIEWS AND MATERIALIZED VIEWS
-- =============================================================================

-- Copy the view creation statements from comprehensive_schema.sql here

-- =============================================================================
-- STEP 9: MIGRATE AGENT DATA
-- =============================================================================

-- If you have a single user system, create a default agent
INSERT INTO agents (name, email, contract_comp_level, is_active)
VALUES ('Default Agent', 'agent@company.com', 100, true)
ON CONFLICT (email) DO NOTHING;

-- Link existing policies and commissions to default agent if agent_id is null
UPDATE policies SET agent_id = (SELECT id FROM agents WHERE email = 'agent@company.com' LIMIT 1)
WHERE agent_id IS NULL;

UPDATE commissions SET agent_id = (SELECT id FROM agents WHERE email = 'agent@company.com' LIMIT 1)
WHERE agent_id IS NULL;

-- =============================================================================
-- STEP 10: VALIDATE MIGRATION
-- =============================================================================

-- Check data counts
SELECT 'Migration Validation' as step;
SELECT 'carriers' as table_name, COUNT(*) as row_count FROM carriers
UNION ALL
SELECT 'agents', COUNT(*) FROM agents
UNION ALL
SELECT 'policies', COUNT(*) FROM policies
UNION ALL
SELECT 'commissions', COUNT(*) FROM commissions
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'constants', COUNT(*) FROM constants
UNION ALL
SELECT 'comp_guide', COUNT(*) FROM comp_guide
UNION ALL
SELECT 'chargebacks', COUNT(*) FROM chargebacks;

-- Check for null required fields
SELECT 'Null Check' as validation;
SELECT 'policies_missing_client_name' as issue, COUNT(*) as count FROM policies WHERE client_name IS NULL OR client_name = '';
SELECT 'commissions_missing_client_name' as issue, COUNT(*) as count FROM commissions WHERE client_name IS NULL OR client_name = '';
SELECT 'policies_missing_product_type' as issue, COUNT(*) as count FROM policies WHERE product_type IS NULL;
SELECT 'commissions_missing_product_type' as issue, COUNT(*) as count FROM commissions WHERE product_type IS NULL;

-- =============================================================================
-- STEP 11: CLEANUP
-- =============================================================================

-- After validating migration is successful, you can drop backup tables
-- DROP TABLE backup_carriers;
-- DROP TABLE backup_policies;
-- DROP TABLE backup_commissions;
-- DROP TABLE backup_expenses;
-- DROP TABLE backup_constants;
-- DROP TABLE backup_agents;
-- DROP TABLE backup_comp_guide;
-- DROP TABLE backup_chargebacks;

COMMIT;