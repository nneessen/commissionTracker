-- /home/nneessen/projects/commissionTracker/database/001_create_agent_settings.sql
-- Phase 0: Create agent_settings table migration
-- Critical blocker fix for missing agent_settings table

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agent_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID, -- Will reference agents table when it exists
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255) GENERATED ALWAYS AS (
    CASE
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL
      THEN first_name || ' ' || last_name
      WHEN first_name IS NOT NULL
      THEN first_name
      WHEN last_name IS NOT NULL
      THEN last_name
      ELSE 'Unknown Agent'
    END
  ) STORED,
  agent_code VARCHAR(50),
  contract_level INTEGER DEFAULT 100
    CHECK (contract_level >= 80 AND contract_level <= 145),
  email VARCHAR(255),
  phone VARCHAR(20),
  license_number VARCHAR(100),
  license_state CHAR(2),
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_settings_agent_id ON agent_settings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_settings_email ON agent_settings(email);
CREATE INDEX IF NOT EXISTS idx_agent_settings_agent_code ON agent_settings(agent_code);
CREATE INDEX IF NOT EXISTS idx_agent_settings_is_active ON agent_settings(is_active);

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger
DROP TRIGGER IF EXISTS update_agent_settings_updated_at ON agent_settings;
CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default agent settings if none exist
INSERT INTO agent_settings (
  first_name,
  last_name,
  agent_code,
  contract_level,
  email,
  is_active
)
SELECT
  'Default',
  'Agent',
  'DEFAULT',
  100,
  'agent@company.com',
  true
WHERE NOT EXISTS (SELECT 1 FROM agent_settings);

-- Validation query
DO $$
BEGIN
  RAISE NOTICE 'Agent settings table created successfully';
  RAISE NOTICE 'Current agent_settings count: %', (SELECT COUNT(*) FROM agent_settings);
END $$;