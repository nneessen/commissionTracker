-- Migration: Create carrier_contracts table for tracking agent contracting status
-- Created: 2025-12-29

CREATE TABLE carrier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'terminated')),
  requested_date DATE,
  submitted_date DATE,
  approved_date DATE,
  writing_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  UNIQUE(agent_id, carrier_id)
);

-- Create index for common queries
CREATE INDEX idx_carrier_contracts_agent ON carrier_contracts(agent_id);
CREATE INDEX idx_carrier_contracts_carrier ON carrier_contracts(carrier_id);
CREATE INDEX idx_carrier_contracts_status ON carrier_contracts(status);

-- Enable RLS
ALTER TABLE carrier_contracts ENABLE ROW LEVEL SECURITY;

-- Staff (trainers, contracting managers) can view all contracts
CREATE POLICY "Staff can view all contracts" ON carrier_contracts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid()
  AND (roles @> ARRAY['trainer'] OR roles @> ARRAY['contracting_manager'] OR is_admin = true)
));

-- Staff can manage contracts (insert, update, delete)
CREATE POLICY "Staff can manage contracts" ON carrier_contracts FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_profiles WHERE id = auth.uid()
  AND (roles @> ARRAY['trainer'] OR roles @> ARRAY['contracting_manager'] OR is_admin = true)
));

-- Agents can view their own contracts
CREATE POLICY "Agents can view own contracts" ON carrier_contracts FOR SELECT
USING (agent_id = auth.uid());

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_carrier_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER carrier_contracts_updated_at
  BEFORE UPDATE ON carrier_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_carrier_contracts_updated_at();
