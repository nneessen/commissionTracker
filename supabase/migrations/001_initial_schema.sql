-- /home/nneessen/projects/commissionTracker/supabase/migrations/001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE policy_status AS ENUM ('active', 'pending', 'lapsed', 'cancelled', 'expired');
CREATE TYPE product_type AS ENUM ('term_life', 'whole_life', 'universal_life', 'variable_life', 'health', 'disability', 'annuity');
CREATE TYPE payment_frequency AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
CREATE TYPE expense_category AS ENUM ('marketing', 'office', 'travel', 'professional', 'technology', 'other');
CREATE TYPE commission_status AS ENUM ('pending', 'paid', 'reversed', 'disputed');
CREATE TYPE chargeback_status AS ENUM ('pending', 'resolved', 'disputed');
CREATE TYPE comp_level AS ENUM ('street', 'release', 'enhanced', 'premium');

-- Carriers table
CREATE TABLE carriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    contact_info JSONB,
    commission_structure JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    license_number VARCHAR(100),
    comp_level comp_level DEFAULT 'street',
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comp guide table for commission rates
CREATE TABLE comp_guide (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
    product_type product_type NOT NULL,
    comp_level comp_level NOT NULL,
    commission_percentage DECIMAL(5,4) NOT NULL, -- Supports up to 99.99%
    bonus_percentage DECIMAL(5,4) DEFAULT 0,
    minimum_premium DECIMAL(10,2) DEFAULT 0,
    maximum_premium DECIMAL(10,2),
    effective_date DATE NOT NULL,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(carrier_id, product_type, comp_level, effective_date)
);

-- Clients table (embedded in policies for now, but separate table for future expansion)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    date_of_birth DATE,
    ssn_last_four VARCHAR(4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies table
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
    policy_number VARCHAR(255) NOT NULL UNIQUE,
    status policy_status DEFAULT 'pending',
    product product_type NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    term_length INTEGER, -- in years
    annual_premium DECIMAL(10,2) NOT NULL,
    payment_frequency payment_frequency DEFAULT 'monthly',
    commission_percentage DECIMAL(5,4), -- Override from comp guide
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commissions table
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
    carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
    commission_amount DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    commission_period_start DATE,
    commission_period_end DATE,
    status commission_status DEFAULT 'pending',
    is_advance BOOLEAN DEFAULT false,
    advance_months INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chargebacks table
CREATE TABLE chargebacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_id UUID REFERENCES commissions(id) ON DELETE CASCADE,
    chargeback_amount DECIMAL(10,2) NOT NULL,
    chargeback_date DATE NOT NULL,
    reason TEXT,
    status chargeback_status DEFAULT 'pending',
    resolution_date DATE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category expense_category NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    is_reimbursable BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_policies_user_id ON policies(user_id);
CREATE INDEX idx_policies_agent_id ON policies(agent_id);
CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_effective_date ON policies(effective_date);

CREATE INDEX idx_commissions_user_id ON commissions(user_id);
CREATE INDEX idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX idx_commissions_policy_id ON commissions(policy_id);
CREATE INDEX idx_commissions_payment_date ON commissions(payment_date);
CREATE INDEX idx_commissions_status ON commissions(status);

CREATE INDEX idx_chargebacks_commission_id ON chargebacks(commission_id);
CREATE INDEX idx_chargebacks_date ON chargebacks(chargeback_date);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_agent_id ON expenses(agent_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_comp_guide_carrier_product ON comp_guide(carrier_id, product_type);

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_carriers_updated_at BEFORE UPDATE ON carriers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comp_guide_updated_at BEFORE UPDATE ON comp_guide FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chargebacks_updated_at BEFORE UPDATE ON chargebacks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_guide ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chargebacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Carriers - accessible to all authenticated users (read-only for most)
CREATE POLICY "Enable read access for all users" ON carriers FOR SELECT USING (auth.role() = 'authenticated');

-- Agents - users can only see their own agent record
CREATE POLICY "Users can view own agent record" ON agents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own agent record" ON agents FOR UPDATE USING (user_id = auth.uid());

-- Comp guide - accessible to all authenticated users (read-only)
CREATE POLICY "Enable read access for all users" ON comp_guide FOR SELECT USING (auth.role() = 'authenticated');

-- Clients - users can only access their own clients
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM policies
        WHERE policies.client_id = clients.id
        AND policies.user_id = auth.uid()
    )
);

-- Policies - users can only access their own policies
CREATE POLICY "Users can view own policies" ON policies FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own policies" ON policies FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own policies" ON policies FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own policies" ON policies FOR DELETE USING (user_id = auth.uid());

-- Commissions - users can only access their own commissions
CREATE POLICY "Users can view own commissions" ON commissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own commissions" ON commissions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own commissions" ON commissions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own commissions" ON commissions FOR DELETE USING (user_id = auth.uid());

-- Chargebacks - users can only access chargebacks for their own commissions
CREATE POLICY "Users can view own chargebacks" ON chargebacks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM commissions
        WHERE commissions.id = chargebacks.commission_id
        AND commissions.user_id = auth.uid()
    )
);

-- Expenses - users can only access their own expenses
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (user_id = auth.uid());