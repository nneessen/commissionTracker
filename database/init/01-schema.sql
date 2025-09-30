-- database/init/01-schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE commission_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE expense_category AS ENUM ('marketing', 'travel', 'office', 'training', 'other');
CREATE TYPE product_type AS ENUM ('whole_life', 'term', 'universal_life', 'indexed_universal_life', 'accidental', 'final_expense', 'annuity');

-- Carriers table
CREATE TABLE IF NOT EXISTS carriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    default_commission_rates JSONB DEFAULT '{}',
    contact_info JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    product_type product_type NOT NULL,
    commission_structure JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(carrier_id, name)
);

-- Commission guide table
CREATE TABLE IF NOT EXISTS comp_guide (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    contract_level INTEGER NOT NULL CHECK (contract_level >= 80 AND contract_level <= 145 AND contract_level % 5 = 0),
    commission_percentage DECIMAL(10, 2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 1000),
    first_year_percentage DECIMAL(10, 2) CHECK (first_year_percentage >= 0 AND first_year_percentage <= 1000),
    renewal_percentage DECIMAL(10, 2) CHECK (renewal_percentage >= 0 AND renewal_percentage <= 1000),
    trail_percentage DECIMAL(10, 2) CHECK (trail_percentage >= 0 AND trail_percentage <= 1000),
    effective_date DATE NOT NULL,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (expiration_date IS NULL OR expiration_date > effective_date),
    UNIQUE(carrier_name, product_name, contract_level)
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    contract_comp_level INTEGER CHECK (contract_comp_level >= 80 AND contract_comp_level <= 145),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent settings table
CREATE TABLE IF NOT EXISTS agent_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    settings_key VARCHAR(100) NOT NULL,
    settings_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, settings_key)
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number VARCHAR(100) NOT NULL UNIQUE,
    client_name VARCHAR(255) NOT NULL,
    client_age INTEGER,
    client_state VARCHAR(2),
    carrier_id UUID NOT NULL REFERENCES carriers(id),
    product_id UUID REFERENCES products(id),
    annual_premium DECIMAL(10, 2) NOT NULL CHECK (annual_premium > 0),
    effective_date DATE NOT NULL,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    agent_id UUID REFERENCES agents(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id),
    commission_amount DECIMAL(10, 2) NOT NULL CHECK (commission_amount >= 0),
    commission_rate DECIMAL(5, 2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
    commission_date DATE NOT NULL,
    payment_date DATE,
    status commission_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    category expense_category NOT NULL,
    description VARCHAR(500) NOT NULL,
    expense_date DATE NOT NULL,
    vendor VARCHAR(255),
    receipt_url TEXT,
    is_deductible BOOLEAN DEFAULT true,
    agent_id UUID REFERENCES agents(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chargebacks table
CREATE TABLE IF NOT EXISTS chargebacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_id UUID NOT NULL REFERENCES commissions(id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    chargeback_date DATE NOT NULL,
    reason VARCHAR(500),
    is_resolved BOOLEAN DEFAULT false,
    resolution_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Constants table for application settings
CREATE TABLE IF NOT EXISTS constants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX idx_policies_product_id ON policies(product_id);
CREATE INDEX idx_policies_agent_id ON policies(agent_id);
CREATE INDEX idx_commissions_policy_id ON commissions(policy_id);
CREATE INDEX idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_expenses_agent_id ON expenses(agent_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_comp_guide_carrier_product ON comp_guide(carrier_name, product_name);
CREATE INDEX idx_comp_guide_contract_level ON comp_guide(contract_level);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables
CREATE TRIGGER update_carriers_updated_at BEFORE UPDATE ON carriers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comp_guide_updated_at BEFORE UPDATE ON comp_guide
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_settings_updated_at BEFORE UPDATE ON agent_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chargebacks_updated_at BEFORE UPDATE ON chargebacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constants_updated_at BEFORE UPDATE ON constants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default constants
INSERT INTO constants (key, value, description) VALUES
    ('expense_categories', '["marketing", "travel", "office", "training", "other"]'::jsonb, 'Available expense categories'),
    ('commission_statuses', '["pending", "paid", "cancelled", "refunded"]'::jsonb, 'Available commission statuses'),
    ('product_types', '["whole_life", "term", "universal_life", "indexed_universal_life", "accidental", "final_expense", "annuity"]'::jsonb, 'Available product types'),
    ('tax_rate', '0.25'::jsonb, 'Default tax rate for calculations'),
    ('default_contract_level', '100'::jsonb, 'Default contract level for new agents')
ON CONFLICT (key) DO NOTHING;