-- Local PostgreSQL Schema for Commission Tracker
-- This runs automatically when the Docker container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create carriers table
CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  commission_rates JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create constants table
CREATE TABLE IF NOT EXISTS constants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value DECIMAL(12,4) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create policies table (basic structure)
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_number VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  client JSONB NOT NULL,
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  product VARCHAR(100) NOT NULL,
  effective_date DATE NOT NULL,
  term_length INTEGER,
  expiration_date DATE,
  annual_premium DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_frequency VARCHAR(20) NOT NULL DEFAULT 'annual',
  commission_percentage DECIMAL(5,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  notes TEXT
);

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  client JSONB NOT NULL,
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  product VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'first_year',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  calculation_basis VARCHAR(50) NOT NULL DEFAULT 'annual_premium',
  annual_premium DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  expected_date DATE,
  actual_date DATE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default constants
INSERT INTO constants (key, value, description) VALUES
  ('avgAP', 5000, 'Average Annual Premium'),
  ('commissionRate', 0.05, 'Default Commission Rate (5%)'),
  ('target1', 100000, 'First Target Amount'),
  ('target2', 200000, 'Second Target Amount')
ON CONFLICT (key) DO NOTHING;

-- Insert sample carriers
INSERT INTO carriers (name, commission_rates) VALUES
  ('Sample Insurance Co.', '{"first_year": 0.08, "renewal": 0.02}'),
  ('Local Life Insurance', '{"first_year": 0.10, "renewal": 0.03}'),
  ('Metro Health Plans', '{"first_year": 0.06, "renewal": 0.025}')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_constants_key ON constants(key);
CREATE INDEX IF NOT EXISTS idx_commissions_policy_id ON commissions(policy_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);