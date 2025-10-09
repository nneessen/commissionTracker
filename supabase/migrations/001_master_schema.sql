-- Master Schema Migration
-- This is the consolidated schema for the Commission Tracker application
-- Created: 2025-10-08
--
-- IMPORTANT: This migration assumes you're starting fresh OR that you've already
-- run all previous migrations. If uncertain, check supabase_migrations.schema_migrations
-- table to see what's been applied.

BEGIN;

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Carriers Table
CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  commission_rates JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  product_type VARCHAR(50) NOT NULL,
  description TEXT,
  commission_percentage DECIMAL(5,4), -- Stored as decimal (e.g., 0.85 for 85%)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(carrier_id, name)
);

-- Comp Guide Table (Commission rates by product and contract level)
CREATE TABLE IF NOT EXISTS comp_guide (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_type VARCHAR(50),
  contract_level INTEGER NOT NULL, -- e.g., 100, 110, 115
  commission_percentage DECIMAL(5,4) NOT NULL, -- Stored as decimal
  bonus_percentage DECIMAL(5,4) DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB, -- Contains: state, age, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies Table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  policy_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  product VARCHAR(50), -- Product type enum
  effective_date DATE NOT NULL,
  term_length INTEGER,
  expiration_date DATE,
  annual_premium DECIMAL(12,2) NOT NULL,
  monthly_premium DECIMAL(12,2),
  payment_frequency VARCHAR(20) DEFAULT 'monthly',
  commission_percentage DECIMAL(5,4) DEFAULT 0, -- Stored as decimal
  advance_months INTEGER DEFAULT 9,
  referral_source VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(policy_number)
);

-- Commissions Table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  payment_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  is_advance BOOLEAN DEFAULT false,
  advance_months INTEGER DEFAULT 0,
  months_paid INTEGER DEFAULT 0,
  earned_amount DECIMAL(12,2) DEFAULT 0,
  unearned_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chargebacks Table
CREATE TABLE IF NOT EXISTS chargebacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  commission_id UUID REFERENCES commissions(id) ON DELETE SET NULL,
  chargeback_amount DECIMAL(12,2) NOT NULL,
  chargeback_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(100),
  expense_type VARCHAR(100),
  name VARCHAR(255),
  description TEXT,
  expense_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Constants Table (System-wide constants)
CREATE TABLE IF NOT EXISTS constants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value DECIMAL(12,4) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_carrier_id ON products(carrier_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_comp_guide_product_id ON comp_guide(product_id);
CREATE INDEX IF NOT EXISTS idx_comp_guide_carrier_id ON comp_guide(carrier_id);
CREATE INDEX IF NOT EXISTS idx_comp_guide_contract_level ON comp_guide(contract_level);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX IF NOT EXISTS idx_policies_product_id ON policies(product_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_effective_date ON policies(effective_date);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_policy_id ON commissions(policy_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_user_id ON chargebacks(user_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_policy_id ON chargebacks(policy_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_constants_key ON constants(key);

-- ============================================
-- VIEWS
-- ============================================

-- Users view (maps auth.users to public schema)
CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  email,
  raw_user_meta_data,
  created_at,
  updated_at
FROM auth.users;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_guide ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chargebacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE constants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Authenticated users can manage carriers" ON carriers;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated users can read comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "Authenticated users can manage comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own policies" ON policies;
DROP POLICY IF EXISTS "Users can create own policies" ON policies;
DROP POLICY IF EXISTS "Users can update own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete own policies" ON policies;
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can create own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can delete own commissions" ON commissions;
DROP POLICY IF EXISTS "Authenticated users can manage chargebacks" ON chargebacks;
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can create own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can read constants" ON constants;
DROP POLICY IF EXISTS "Authenticated users can manage constants" ON constants;

-- Shared reference tables (carriers, products, comp_guide, constants)
CREATE POLICY "Authenticated users can manage carriers" ON carriers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage products" ON products
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read comp_guide" ON comp_guide
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage comp_guide" ON comp_guide
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read constants" ON constants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage constants" ON constants
  FOR ALL USING (auth.role() = 'authenticated');

-- User-specific tables (clients, policies, commissions, chargebacks, expenses, settings)
CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own policies" ON policies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own policies" ON policies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own policies" ON policies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own policies" ON policies
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own commissions" ON commissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own commissions" ON commissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commissions" ON commissions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own commissions" ON commissions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage chargebacks" ON chargebacks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own settings" ON settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON settings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default constants
INSERT INTO constants (key, value, description) VALUES
  ('avgAP', 5000, 'Average Annual Premium'),
  ('commissionRate', 0.05, 'Default Commission Rate (5%)'),
  ('target1', 100000, 'First Target Amount'),
  ('target2', 200000, 'Second Target Amount')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Master Schema Migration Complete!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - carriers';
    RAISE NOTICE '  - products';
    RAISE NOTICE '  - comp_guide';
    RAISE NOTICE '  - clients';
    RAISE NOTICE '  - policies';
    RAISE NOTICE '  - commissions';
    RAISE NOTICE '  - chargebacks';
    RAISE NOTICE '  - expenses';
    RAISE NOTICE '  - settings';
    RAISE NOTICE '  - constants';
    RAISE NOTICE '';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '  - public.users';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS enabled on all tables';
    RAISE NOTICE '===========================================';
END $$;
