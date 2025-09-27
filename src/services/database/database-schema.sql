-- Commission Tracker Database Schema
-- Create tables for policies, commissions, expenses, carriers, and constants

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Carriers table
CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  commission_rates JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies table
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_number VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',

  -- Client Information (stored as JSONB for flexibility)
  client JSONB NOT NULL,

  -- Policy Details
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  product VARCHAR(100) NOT NULL,
  effective_date DATE NOT NULL,
  term_length INTEGER, -- in years
  expiration_date DATE,

  -- Financial Details
  annual_premium DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_frequency VARCHAR(20) NOT NULL DEFAULT 'annual',
  commission_percentage DECIMAL(5,4) NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  notes TEXT
);

-- Commissions table
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,

  -- Client Information (stored as JSONB)
  client JSONB NOT NULL,

  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  product VARCHAR(100) NOT NULL,

  -- Commission Details
  type VARCHAR(50) NOT NULL DEFAULT 'first_year',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  calculation_basis VARCHAR(50) NOT NULL DEFAULT 'annual_premium',

  -- Financial
  annual_premium DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0,

  -- Dates
  expected_date DATE,
  actual_date DATE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Additional
  notes TEXT
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constants table (application settings)
CREATE TABLE constants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value DECIMAL(12,4) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_effective_date ON policies(effective_date);
CREATE INDEX idx_policies_policy_number ON policies(policy_number);

CREATE INDEX idx_commissions_policy_id ON commissions(policy_id);
CREATE INDEX idx_commissions_carrier_id ON commissions(carrier_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_type ON commissions(type);
CREATE INDEX idx_commissions_expected_date ON commissions(expected_date);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);

CREATE INDEX idx_carriers_name ON carriers(name);
CREATE INDEX idx_carriers_is_active ON carriers(is_active);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carriers_updated_at BEFORE UPDATE ON carriers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constants_updated_at BEFORE UPDATE ON constants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default constants
INSERT INTO constants (key, value, description) VALUES
  ('avgAP', 5000.00, 'Average Annual Premium'),
  ('commissionRate', 0.0500, 'Default Commission Rate'),
  ('target1', 100000.00, 'First Target Amount'),
  ('target2', 200000.00, 'Second Target Amount')
ON CONFLICT (key) DO NOTHING;