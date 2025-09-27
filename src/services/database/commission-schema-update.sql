-- Commission Schema Update
-- Adds new fields to support automated comp guide calculations and 9-month advance model

-- Add new columns to commissions table
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS monthly_premium DECIMAL(12,2);
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS advance_months INTEGER DEFAULT 9;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS contract_comp_level INTEGER;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT false;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS comp_guide_percentage DECIMAL(5,2);

-- Update existing records to set monthly_premium based on annual_premium
UPDATE commissions
SET monthly_premium = annual_premium / 12
WHERE monthly_premium IS NULL AND annual_premium IS NOT NULL;

-- Set default advance_months for existing records
UPDATE commissions
SET advance_months = 9
WHERE advance_months IS NULL;

-- Set is_auto_calculated to false for existing records
UPDATE commissions
SET is_auto_calculated = false
WHERE is_auto_calculated IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_auto_calculated ON commissions(is_auto_calculated);
CREATE INDEX IF NOT EXISTS idx_commissions_contract_level ON commissions(contract_comp_level);

-- Add constraints
ALTER TABLE commissions ADD CONSTRAINT chk_advance_months CHECK (advance_months > 0 AND advance_months <= 24);
ALTER TABLE commissions ADD CONSTRAINT chk_contract_comp_level CHECK (contract_comp_level IS NULL OR (contract_comp_level >= 80 AND contract_comp_level <= 145));
ALTER TABLE commissions ADD CONSTRAINT chk_monthly_premium CHECK (monthly_premium IS NULL OR monthly_premium >= 0);
ALTER TABLE commissions ADD CONSTRAINT chk_comp_guide_percentage CHECK (comp_guide_percentage IS NULL OR comp_guide_percentage >= 0);

-- Verify the updates
SELECT 'Commission Schema Updated Successfully' as status;
SELECT COUNT(*) as updated_records FROM commissions WHERE monthly_premium IS NOT NULL;