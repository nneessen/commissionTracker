-- /home/nneessen/projects/commissionTracker/database/comprehensive_schema.sql
-- Comprehensive High-Performance Commission Tracker Database Schema
-- Optimized for speed, analytics, and insurance commission tracking workflows
-- Single-user application focused on query performance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query performance monitoring

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Carriers table - Insurance companies
CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  short_name VARCHAR(50), -- For UI displays
  is_active BOOLEAN DEFAULT true,

  -- Default commission rates by product (stored as percentages like 125.50 for 125.5%)
  default_commission_rates JSONB NOT NULL DEFAULT '{}',

  -- Contact and metadata
  contact_info JSONB DEFAULT '{}', -- email, phone, website, rep info
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agents table - Agent profiles with contract levels
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),

  -- Commission contract level (determines commission percentages)
  contract_comp_level INTEGER NOT NULL DEFAULT 100
    CHECK (contract_comp_level >= 80 AND contract_comp_level <= 145),

  -- Agent details
  license_number VARCHAR(100),
  license_states TEXT[], -- Array of state codes
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Performance tracking
  ytd_commission DECIMAL(12,2) DEFAULT 0,
  ytd_premium DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comp Guide - Commission percentages by carrier, product, and contract level
CREATE TABLE comp_guide (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  contract_level INTEGER NOT NULL CHECK (contract_level >= 80 AND contract_level <= 145),

  -- Commission percentage (e.g., 125.50 for 125.5%)
  commission_percentage DECIMAL(6,3) NOT NULL CHECK (commission_percentage >= 0),

  -- Additional commission details
  first_year_percentage DECIMAL(6,3),
  renewal_percentage DECIMAL(6,3),
  trail_percentage DECIMAL(6,3),

  -- Effective date range for commission rates
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,

  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique rates per carrier/product/level combination
  UNIQUE(carrier_id, product_name, contract_level, effective_date)
);

-- Policies table - Insurance policies sold
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_number VARCHAR(100) NOT NULL UNIQUE,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'lapsed', 'cancelled', 'matured')),

  -- Relationships
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE RESTRICT,

  -- Client information (optimized for queries)
  client_name VARCHAR(255) NOT NULL,
  client_state CHAR(2) NOT NULL, -- State code for performance
  client_age INTEGER,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_metadata JSONB DEFAULT '{}', -- Additional client data

  -- Policy details
  product_name VARCHAR(100) NOT NULL,
  product_type VARCHAR(50) NOT NULL
    CHECK (product_type IN ('whole_life', 'term_life', 'universal_life', 'indexed_universal_life', 'accidental_life')),

  -- Important dates
  effective_date DATE NOT NULL,
  expiration_date DATE,
  issue_date DATE,
  term_length_years INTEGER,

  -- Financial details
  annual_premium DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (annual_premium >= 0),
  monthly_premium DECIMAL(12,2) GENERATED ALWAYS AS (annual_premium / 12) STORED,
  payment_frequency VARCHAR(20) NOT NULL DEFAULT 'annual'
    CHECK (payment_frequency IN ('annual', 'semi-annual', 'quarterly', 'monthly')),

  -- Commission override (if different from comp guide)
  commission_percentage_override DECIMAL(6,3),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  notes TEXT
);

-- Commissions table - Commission records with advanced tracking
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE RESTRICT,

  -- Client info (denormalized for performance)
  client_name VARCHAR(255) NOT NULL,
  client_state CHAR(2) NOT NULL,
  client_age INTEGER,

  -- Commission classification
  commission_type VARCHAR(50) NOT NULL DEFAULT 'first_year'
    CHECK (commission_type IN ('first_year', 'renewal', 'trail', 'bonus', 'override', 'chargeback')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'expected', 'paid', 'clawback', 'cancelled', 'disputed')),
  calculation_basis VARCHAR(50) NOT NULL DEFAULT 'premium'
    CHECK (calculation_basis IN ('premium', 'fixed', 'tiered')),

  -- Product details
  product_name VARCHAR(100) NOT NULL,
  product_type VARCHAR(50) NOT NULL,

  -- Financial calculations - optimized for 9-month advance model
  annual_premium DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (annual_premium >= 0),
  monthly_premium DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (monthly_premium >= 0),
  advance_months INTEGER NOT NULL DEFAULT 9 CHECK (advance_months > 0 AND advance_months <= 24),

  -- Commission rates and amounts
  commission_rate DECIMAL(6,3) NOT NULL DEFAULT 0 CHECK (commission_rate >= 0), -- Percentage
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Calculated amount

  -- Comp guide integration
  contract_comp_level INTEGER CHECK (contract_comp_level >= 80 AND contract_comp_level <= 145),
  comp_guide_id UUID REFERENCES comp_guide(id) ON DELETE SET NULL,
  is_auto_calculated BOOLEAN DEFAULT false, -- True if calculated from comp guide
  manual_override BOOLEAN DEFAULT false, -- True if manually overridden

  -- Important dates for cash flow tracking
  expected_date DATE,
  actual_date DATE,
  paid_date DATE,

  -- Performance tracking
  year_earned INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM COALESCE(actual_date, expected_date, created_at))) STORED,
  month_earned INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM COALESCE(actual_date, expected_date, created_at))) STORED,
  quarter_earned INTEGER GENERATED ALWAYS AS (EXTRACT(QUARTER FROM COALESCE(actual_date, expected_date, created_at))) STORED,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Chargebacks table - Commission chargebacks and clawbacks
CREATE TABLE chargebacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  original_commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE RESTRICT,

  -- Chargeback details
  chargeback_type VARCHAR(50) NOT NULL DEFAULT 'policy_lapse'
    CHECK (chargeback_type IN ('policy_lapse', 'refund', 'cancellation', 'rescission', 'death_claim', 'other')),
  chargeback_amount DECIMAL(12,2) NOT NULL CHECK (chargeback_amount >= 0),
  chargeback_reason TEXT,

  -- Important dates
  policy_lapse_date DATE,
  chargeback_date DATE NOT NULL,
  notification_date DATE,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'disputed', 'resolved', 'cancelled')),

  -- Financial impact
  amount_recovered DECIMAL(12,2) DEFAULT 0,
  net_impact DECIMAL(12,2) GENERATED ALWAYS AS (chargeback_amount - amount_recovered) STORED,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table - Business and personal expense tracking
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Financial details
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),

  -- Categorization
  category VARCHAR(100) NOT NULL CHECK (category IN ('personal', 'business')),
  subcategory VARCHAR(100), -- e.g., 'marketing', 'travel', 'software', etc.

  -- Date tracking
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Performance tracking
  year_incurred INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM expense_date)) STORED,
  month_incurred INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM expense_date)) STORED,
  quarter_incurred INTEGER GENERATED ALWAYS AS (EXTRACT(QUARTER FROM expense_date)) STORED,

  -- Tax and business tracking
  is_tax_deductible BOOLEAN DEFAULT false,
  receipt_url TEXT, -- Link to receipt/document storage

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constants table - Application settings and configuration
CREATE TABLE constants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value DECIMAL(12,4) NOT NULL DEFAULT 0,
  value_type VARCHAR(20) NOT NULL DEFAULT 'decimal'
    CHECK (value_type IN ('decimal', 'integer', 'percentage', 'currency')),
  description TEXT,
  category VARCHAR(50) DEFAULT 'general', -- 'targets', 'rates', 'settings', etc.
  is_editable BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Carriers indexes
CREATE INDEX idx_carriers_name ON carriers(name);
CREATE INDEX idx_carriers_active ON carriers(is_active) WHERE is_active = true;

-- Agents indexes
CREATE INDEX idx_agents_contract_level ON agents(contract_comp_level);
CREATE INDEX idx_agents_active ON agents(is_active) WHERE is_active = true;

-- Comp guide indexes (critical for commission calculations)
CREATE INDEX idx_comp_guide_lookup ON comp_guide(carrier_id, product_name, contract_level);
CREATE INDEX idx_comp_guide_active ON comp_guide(is_active, effective_date, expiration_date)
  WHERE is_active = true;
CREATE INDEX idx_comp_guide_carrier ON comp_guide(carrier_id);

-- Policies indexes (optimized for common queries)
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_carrier ON policies(carrier_id);
CREATE INDEX idx_policies_agent ON policies(agent_id);
CREATE INDEX idx_policies_client_state ON policies(client_state);
CREATE INDEX idx_policies_product_type ON policies(product_type);
CREATE INDEX idx_policies_effective_date ON policies(effective_date);
CREATE INDEX idx_policies_policy_number ON policies(policy_number);
CREATE INDEX idx_policies_client_name ON policies(client_name);

-- Composite indexes for common policy queries
CREATE INDEX idx_policies_status_carrier ON policies(status, carrier_id);
CREATE INDEX idx_policies_status_date ON policies(status, effective_date);
CREATE INDEX idx_policies_agent_status ON policies(agent_id, status);

-- Commissions indexes (critical for performance and analytics)
CREATE INDEX idx_commissions_policy ON commissions(policy_id);
CREATE INDEX idx_commissions_agent ON commissions(agent_id);
CREATE INDEX idx_commissions_carrier ON commissions(carrier_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_type ON commissions(commission_type);
CREATE INDEX idx_commissions_client_state ON commissions(client_state);
CREATE INDEX idx_commissions_expected_date ON commissions(expected_date);
CREATE INDEX idx_commissions_paid_date ON commissions(paid_date);

-- Analytics indexes for commissions
CREATE INDEX idx_commissions_year_earned ON commissions(year_earned);
CREATE INDEX idx_commissions_month_earned ON commissions(year_earned, month_earned);
CREATE INDEX idx_commissions_quarter_earned ON commissions(year_earned, quarter_earned);

-- Composite indexes for common commission queries
CREATE INDEX idx_commissions_status_type ON commissions(status, commission_type);
CREATE INDEX idx_commissions_agent_year ON commissions(agent_id, year_earned);
CREATE INDEX idx_commissions_carrier_year ON commissions(carrier_id, year_earned);
CREATE INDEX idx_commissions_date_range ON commissions(expected_date, actual_date);

-- Chargebacks indexes
CREATE INDEX idx_chargebacks_commission ON chargebacks(original_commission_id);
CREATE INDEX idx_chargebacks_policy ON chargebacks(policy_id);
CREATE INDEX idx_chargebacks_agent ON chargebacks(agent_id);
CREATE INDEX idx_chargebacks_status ON chargebacks(status);
CREATE INDEX idx_chargebacks_date ON chargebacks(chargeback_date);
CREATE INDEX idx_chargebacks_type ON chargebacks(chargeback_type);

-- Expenses indexes
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_subcategory ON expenses(subcategory);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_year ON expenses(year_incurred);
CREATE INDEX idx_expenses_month ON expenses(year_incurred, month_incurred);
CREATE INDEX idx_expenses_deductible ON expenses(is_tax_deductible) WHERE is_tax_deductible = true;

-- Constants indexes
CREATE INDEX idx_constants_category ON constants(category);
CREATE INDEX idx_constants_key ON constants(key); -- Should be unique already

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================================================

-- Generic function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_carriers_updated_at
  BEFORE UPDATE ON carriers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comp_guide_updated_at
  BEFORE UPDATE ON comp_guide FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON commissions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chargebacks_updated_at
  BEFORE UPDATE ON chargebacks FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constants_updated_at
  BEFORE UPDATE ON constants FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PERFORMANCE VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Commission Summary View - Optimized for dashboard analytics
CREATE VIEW commission_summary_view AS
SELECT
  c.id,
  c.commission_type,
  c.status,
  c.agent_id,
  a.name as agent_name,
  c.carrier_id,
  car.name as carrier_name,
  c.client_name,
  c.client_state,
  c.product_name,
  c.product_type,
  c.annual_premium,
  c.monthly_premium,
  c.commission_rate,
  c.commission_amount,
  c.advance_months,
  c.expected_date,
  c.actual_date,
  c.paid_date,
  c.year_earned,
  c.month_earned,
  c.quarter_earned,
  c.is_auto_calculated,
  c.contract_comp_level,
  c.created_at,

  -- Calculated fields for analytics
  (c.commission_amount / NULLIF(c.annual_premium, 0) * 100) as effective_commission_rate,
  CASE
    WHEN c.paid_date IS NOT NULL THEN 'paid'
    WHEN c.actual_date IS NOT NULL THEN 'earned'
    WHEN c.expected_date IS NOT NULL THEN 'expected'
    ELSE 'pending'
  END as payment_status,

  -- Time calculations
  CASE
    WHEN c.paid_date IS NOT NULL AND c.expected_date IS NOT NULL
    THEN c.paid_date - c.expected_date
    ELSE NULL
  END as days_from_expected,

  -- Policy link status
  CASE WHEN c.policy_id IS NOT NULL THEN true ELSE false END as has_policy_link

FROM commissions c
LEFT JOIN agents a ON c.agent_id = a.id
LEFT JOIN carriers car ON c.carrier_id = car.id;

-- Monthly Commission Summary - For performance tracking
CREATE VIEW monthly_commission_summary AS
SELECT
  year_earned,
  month_earned,
  agent_id,
  carrier_id,
  commission_type,
  status,
  COUNT(*) as commission_count,
  SUM(annual_premium) as total_annual_premium,
  SUM(commission_amount) as total_commission_amount,
  AVG(commission_rate) as avg_commission_rate,
  AVG(commission_amount) as avg_commission_amount,
  SUM(CASE WHEN paid_date IS NOT NULL THEN commission_amount ELSE 0 END) as paid_commission_amount,
  COUNT(CASE WHEN paid_date IS NOT NULL THEN 1 END) as paid_commission_count
FROM commissions
GROUP BY year_earned, month_earned, agent_id, carrier_id, commission_type, status;

-- Policy Performance View - For policy tracking
CREATE VIEW policy_performance_view AS
SELECT
  p.id,
  p.policy_number,
  p.status,
  p.agent_id,
  a.name as agent_name,
  p.carrier_id,
  car.name as carrier_name,
  p.client_name,
  p.client_state,
  p.product_name,
  p.product_type,
  p.annual_premium,
  p.monthly_premium,
  p.effective_date,
  p.expiration_date,

  -- Commission summary
  COUNT(c.id) as commission_count,
  SUM(c.commission_amount) as total_commission_amount,
  SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END) as paid_commission_amount,

  -- Chargeback summary
  COUNT(cb.id) as chargeback_count,
  SUM(cb.chargeback_amount) as total_chargeback_amount,

  -- Net commission
  COALESCE(SUM(c.commission_amount), 0) - COALESCE(SUM(cb.chargeback_amount), 0) as net_commission_amount,

  -- Time tracking
  EXTRACT(DAYS FROM (CURRENT_DATE - p.effective_date)) as days_since_effective

FROM policies p
LEFT JOIN agents a ON p.agent_id = a.id
LEFT JOIN carriers car ON p.carrier_id = car.id
LEFT JOIN commissions c ON p.id = c.policy_id
LEFT JOIN chargebacks cb ON p.id = cb.policy_id
GROUP BY p.id, a.name, car.name;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert default constants
INSERT INTO constants (key, value, value_type, description, category) VALUES
  ('avgAP', 5000.00, 'currency', 'Average Annual Premium', 'targets'),
  ('commissionRate', 100.00, 'percentage', 'Default Commission Rate', 'rates'),
  ('target1', 100000.00, 'currency', 'First Target Amount', 'targets'),
  ('target2', 200000.00, 'currency', 'Second Target Amount', 'targets'),
  ('default_contract_comp_level', 100, 'integer', 'Default contract comp level for new agents', 'settings'),
  ('chargeback_grace_period_months', 24, 'integer', 'Months before chargeback risk expires', 'settings'),
  ('target_monthly_income', 10000, 'currency', 'Target monthly income goal', 'targets'),
  ('emergency_fund_months', 6, 'integer', 'Months of expenses to maintain as emergency fund', 'settings'),
  ('default_advance_months', 9, 'integer', 'Default advance months for commission calculations', 'settings')
ON CONFLICT (key) DO NOTHING;

-- Insert default carriers (based on existing data)
INSERT INTO carriers (name, short_name, default_commission_rates, is_active) VALUES
  ('Baltimore Life', 'Baltimore', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('Royal Neighbors', 'Royal', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('United Home Life', 'UHL', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('American Home Life', 'AHL', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('F&G', 'F&G', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('Mutual of Omaha', 'MOO', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('SBLI', 'SBLI', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('Legal & General', 'L&G', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('ELCO Mutual', 'ELCO', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('CoreBridge', 'CoreBridge', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('Liberty Bankers', 'Liberty', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true),
  ('American Amicable', 'AmAmicable', '{"whole_life": 75.0, "term_life": 60.0, "universal_life": 70.0, "indexed_universal_life": 80.0, "accidental_life": 55.0}', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- PERFORMANCE TUNING SETTINGS
-- =============================================================================

-- Optimize for read-heavy workload typical in analytics
ALTER TABLE commissions SET (fillfactor = 95); -- Leave room for updates
ALTER TABLE policies SET (fillfactor = 95);
ALTER TABLE chargebacks SET (fillfactor = 90); -- More updates expected

-- Analyze tables for better query planning
ANALYZE carriers;
ANALYZE agents;
ANALYZE comp_guide;
ANALYZE policies;
ANALYZE commissions;
ANALYZE chargebacks;
ANALYZE expenses;
ANALYZE constants;

-- =============================================================================
-- SECURITY AND DATA INTEGRITY
-- =============================================================================

-- Row Level Security (RLS) policies can be added here if needed in the future
-- For single-user application, basic permissions should suffice

-- Add constraints to ensure data integrity
ALTER TABLE commissions ADD CONSTRAINT chk_commission_amount_positive
  CHECK (commission_amount >= 0);

ALTER TABLE commissions ADD CONSTRAINT chk_dates_logical
  CHECK (
    (expected_date IS NULL OR actual_date IS NULL OR actual_date >= expected_date) AND
    (actual_date IS NULL OR paid_date IS NULL OR paid_date >= actual_date)
  );

ALTER TABLE policies ADD CONSTRAINT chk_policy_dates_logical
  CHECK (
    (effective_date IS NULL OR expiration_date IS NULL OR expiration_date > effective_date) AND
    (effective_date IS NULL OR issue_date IS NULL OR issue_date <= effective_date)
  );

-- =============================================================================
-- FINAL PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Create materialized view for dashboard summary (refresh as needed)
CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT
  -- Current period stats
  (SELECT COUNT(*) FROM policies WHERE status = 'active') as active_policies,
  (SELECT COUNT(*) FROM commissions WHERE status = 'pending') as pending_commissions,
  (SELECT SUM(commission_amount) FROM commissions
   WHERE status = 'paid' AND EXTRACT(YEAR FROM paid_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as ytd_paid_commissions,
  (SELECT SUM(annual_premium) FROM policies
   WHERE status = 'active') as total_active_premium,

  -- Monthly stats
  (SELECT COUNT(*) FROM commissions
   WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
   AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)) as this_month_commissions,
  (SELECT SUM(commission_amount) FROM commissions
   WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
   AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)) as this_month_commission_amount,

  -- Chargeback stats
  (SELECT COUNT(*) FROM chargebacks WHERE status = 'pending') as pending_chargebacks,
  (SELECT SUM(chargeback_amount) FROM chargebacks
   WHERE EXTRACT(YEAR FROM chargeback_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as ytd_chargebacks,

  -- Expense stats
  (SELECT SUM(amount) FROM expenses
   WHERE category = 'business'
   AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)) as ytd_business_expenses,

  CURRENT_TIMESTAMP as last_updated;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_dashboard_summary_unique ON dashboard_summary (last_updated);

-- Function to refresh dashboard summary
CREATE OR REPLACE FUNCTION refresh_dashboard_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW dashboard_summary;
END;
$$ LANGUAGE plpgsql;

COMMIT;