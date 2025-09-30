-- Optimize schema for performance and add missing tables
-- This migration enhances existing tables and adds performance optimizations

-- Add missing indexes for high-volume queries on policies table
CREATE INDEX IF NOT EXISTS idx_policies_effective_date_status ON policies(effective_date, status);
CREATE INDEX IF NOT EXISTS idx_policies_annual_premium ON policies(annual_premium) WHERE annual_premium > 0;
CREATE INDEX IF NOT EXISTS idx_policies_product_status ON policies(product, status);

-- Add missing indexes for commissions table (will have high volume)
CREATE INDEX IF NOT EXISTS idx_commissions_payment_date_status ON commissions(payment_date, status);
CREATE INDEX IF NOT EXISTS idx_commissions_amount_date ON commissions(commission_amount, payment_date) WHERE commission_amount > 0;
CREATE INDEX IF NOT EXISTS idx_commissions_period_dates ON commissions(commission_period_start, commission_period_end);

-- Add composite indexes for comp guide lookups (frequently queried)
CREATE INDEX IF NOT EXISTS idx_comp_guide_carrier_product_level ON comp_guide(carrier_id, product_type, comp_level);
CREATE INDEX IF NOT EXISTS idx_comp_guide_effective_dates ON comp_guide(effective_date, expiration_date);

-- Add products table for better normalization (referenced in policies)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    product_type product_type NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    minimum_premium DECIMAL(10,2) DEFAULT 0,
    maximum_premium DECIMAL(10,2),
    default_commission_percentage DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(carrier_id, name)
);

-- Add indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_carrier_type ON products(carrier_id, product_type);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Add update trigger for products table
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for products (read-only for authenticated users)
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (auth.role() = 'authenticated');

-- Note: constants table is created in migration 004_create_missing_critical_tables.sql

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_policies_active_premium ON policies(annual_premium, effective_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_commissions_pending_amount ON commissions(commission_amount, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_expenses_recent ON expenses(expense_date, amount) WHERE expense_date >= CURRENT_DATE - INTERVAL '1 year';

-- Add monthly_premium column to policies if it doesn't exist (for better calculations)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS monthly_premium DECIMAL(10,2) GENERATED ALWAYS AS (annual_premium / 12) STORED;

-- Add advance_months column to policies if it doesn't exist
ALTER TABLE policies ADD COLUMN IF NOT EXISTS advance_months INTEGER DEFAULT 0;

-- Add computed columns for better performance
-- Total commission potential for a policy
ALTER TABLE policies ADD COLUMN IF NOT EXISTS total_commission DECIMAL(10,2) GENERATED ALWAYS AS (
  CASE
    WHEN commission_percentage IS NOT NULL THEN annual_premium * commission_percentage / 100
    ELSE 0
  END
) STORED;

-- Add function to calculate policy age in months
CREATE OR REPLACE FUNCTION policy_age_months(effective_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, effective_date)) * 12 +
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, effective_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add function to check if policy is in chargeback period
CREATE OR REPLACE FUNCTION in_chargeback_period(effective_date DATE, grace_period_months INTEGER DEFAULT 24)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN policy_age_months(effective_date) < grace_period_months;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for policy metrics (for dashboard performance)
CREATE OR REPLACE VIEW policy_metrics AS
SELECT
  DATE_TRUNC('month', effective_date) as month,
  status,
  product,
  carrier_id,
  COUNT(*) as policy_count,
  SUM(annual_premium) as total_premium,
  AVG(annual_premium) as avg_premium,
  SUM(total_commission) as total_commission_potential
FROM policies
WHERE effective_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', effective_date), status, product, carrier_id;

-- Create view for commission metrics
CREATE OR REPLACE VIEW commission_metrics AS
SELECT
  DATE_TRUNC('month', payment_date) as month,
  status,
  agent_id,
  carrier_id,
  COUNT(*) as commission_count,
  SUM(commission_amount) as total_commissions,
  AVG(commission_amount) as avg_commission
FROM commissions
WHERE payment_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE_TRUNC('month', payment_date), status, agent_id, carrier_id;

-- Add materialized view for agent performance (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_performance AS
SELECT
  a.id as agent_id,
  a.name as agent_name,
  COUNT(DISTINCT p.id) as total_policies,
  SUM(p.annual_premium) as total_premium,
  SUM(c.commission_amount) as total_commissions,
  COUNT(DISTINCT ch.id) as total_chargebacks,
  SUM(ch.chargeback_amount) as total_chargeback_amount,
  EXTRACT(YEAR FROM CURRENT_DATE) as year
FROM agents a
LEFT JOIN policies p ON a.id = p.agent_id AND p.status = 'active'
LEFT JOIN commissions c ON a.id = c.agent_id AND c.status = 'paid'
LEFT JOIN chargebacks ch ON c.id = ch.commission_id
GROUP BY a.id, a.name, EXTRACT(YEAR FROM CURRENT_DATE);

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_performance_agent_year ON agent_performance(agent_id, year);

-- Add function to refresh agent performance view
CREATE OR REPLACE FUNCTION refresh_agent_performance()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance;
END;
$$ LANGUAGE plpgsql;