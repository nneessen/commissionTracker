-- /home/nneessen/projects/commissionTracker/supabase/migrations/002_create_agent_settings.sql
-- Create agent_settings table for agent configuration and preferences
-- This is separate from the main agents table to handle agent-specific settings

-- Create agent_settings table
CREATE TABLE agent_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  agent_code VARCHAR(50),
  contract_level INTEGER DEFAULT 100
    CHECK (contract_level >= 80 AND contract_level <= 145),
  email VARCHAR(255),
  phone VARCHAR(20),
  license_number VARCHAR(100),
  license_state CHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one settings record per agent
  UNIQUE(agent_id)
);

-- Create indexes for performance
CREATE INDEX idx_agent_settings_agent_id ON agent_settings(agent_id);
CREATE INDEX idx_agent_settings_email ON agent_settings(email);
CREATE INDEX idx_agent_settings_agent_code ON agent_settings(agent_code);
CREATE INDEX idx_agent_settings_contract_level ON agent_settings(contract_level);

-- Create update trigger
CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only access settings for their own agent records
CREATE POLICY "Users can view own agent settings" ON agent_settings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_settings.agent_id
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own agent settings" ON agent_settings FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_settings.agent_id
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own agent settings" ON agent_settings FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_settings.agent_id
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own agent settings" ON agent_settings FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_settings.agent_id
    AND agents.user_id = auth.uid()
  )
);

-- Seed with default agent settings for existing agents
INSERT INTO agent_settings (
  agent_id,
  first_name,
  last_name,
  contract_level,
  email,
  phone,
  license_number
)
SELECT
  id as agent_id,
  SPLIT_PART(name, ' ', 1) as first_name,
  CASE
    WHEN array_length(string_to_array(name, ' '), 1) > 1
    THEN array_to_string(string_to_array(name, ' ')[2:], ' ')
    ELSE NULL
  END as last_name,
  CASE comp_level
    WHEN 'street' THEN 80
    WHEN 'release' THEN 100
    WHEN 'enhanced' THEN 120
    WHEN 'premium' THEN 140
    ELSE 100
  END as contract_level,
  email,
  phone,
  license_number
FROM agents
WHERE NOT EXISTS (
  SELECT 1 FROM agent_settings
  WHERE agent_settings.agent_id = agents.id
);