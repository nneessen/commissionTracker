-- Enhanced Commission Tracker Database Schema
-- Adds agent profiles, comp guide tables, and chargeback tracking

-- Agent profiles table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  contract_comp_level INTEGER NOT NULL CHECK (contract_comp_level >= 80 AND contract_comp_level <= 145),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comp guide data - commission percentages by carrier, product, and contract level
CREATE TABLE IF NOT EXISTS comp_guide (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  contract_level INTEGER NOT NULL CHECK (contract_level >= 80 AND contract_level <= 145),
  commission_percentage DECIMAL(5,2) NOT NULL, -- Stored as percentage (e.g., 125.50 for 125.5%)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(carrier_name, product_name, contract_level)
);

-- Chargeback tracking table
CREATE TABLE IF NOT EXISTS chargebacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  commission_id UUID REFERENCES commissions(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Chargeback details
  chargeback_type VARCHAR(50) NOT NULL DEFAULT 'policy_lapse', -- policy_lapse, refund, cancellation
  chargeback_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  chargeback_reason TEXT,

  -- Important dates
  policy_lapse_date DATE,
  chargeback_date DATE NOT NULL,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processed, disputed, resolved

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add agent_id to existing tables
ALTER TABLE policies ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Update constants table to include chargeback and agent settings
INSERT INTO constants (key, value, description) VALUES
  ('default_contract_comp_level', 100, 'Default contract comp level for new agents'),
  ('chargeback_grace_period_months', 24, 'Months before chargeback risk expires'),
  ('target_monthly_income', 10000, 'Target monthly income goal'),
  ('emergency_fund_months', 6, 'Months of expenses to maintain as emergency fund')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_contract_level ON agents(contract_comp_level);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

CREATE INDEX IF NOT EXISTS idx_comp_guide_carrier_product ON comp_guide(carrier_name, product_name);
CREATE INDEX IF NOT EXISTS idx_comp_guide_contract_level ON comp_guide(contract_level);

CREATE INDEX IF NOT EXISTS idx_chargebacks_policy_id ON chargebacks(policy_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_commission_id ON chargebacks(commission_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_agent_id ON chargebacks(agent_id);
CREATE INDEX IF NOT EXISTS idx_chargebacks_status ON chargebacks(status);
CREATE INDEX IF NOT EXISTS idx_chargebacks_chargeback_date ON chargebacks(chargeback_date);

CREATE INDEX IF NOT EXISTS idx_policies_agent_id ON policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON commissions(agent_id);

-- Update triggers for new tables
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comp_guide_updated_at BEFORE UPDATE ON comp_guide
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chargebacks_updated_at BEFORE UPDATE ON chargebacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();