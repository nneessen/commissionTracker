-- Create comp_guide table for commission percentages
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create comp_guide table if it doesn't exist
CREATE TABLE IF NOT EXISTS comp_guide (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),
  contract_level INTEGER NOT NULL DEFAULT 100
    CHECK (contract_level >= 80 AND contract_level <= 145),

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
  UNIQUE(carrier_name, product_name, contract_level, effective_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comp_guide_carrier_name ON comp_guide(carrier_name);
CREATE INDEX IF NOT EXISTS idx_comp_guide_product_name ON comp_guide(product_name);
CREATE INDEX IF NOT EXISTS idx_comp_guide_contract_level ON comp_guide(contract_level);
CREATE INDEX IF NOT EXISTS idx_comp_guide_carrier_product_level
  ON comp_guide(carrier_name, product_name, contract_level);

-- Validation query
DO $$
BEGIN
  RAISE NOTICE 'Comp guide table created successfully';
  RAISE NOTICE 'Current comp_guide count: %', (SELECT COUNT(*) FROM comp_guide);
END $$;