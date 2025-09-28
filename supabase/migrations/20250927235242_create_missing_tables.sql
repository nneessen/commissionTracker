-- Create missing tables: carriers and constants

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create carriers table if it doesn't exist
CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  commission_rates JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create constants table if it doesn't exist
CREATE TABLE IF NOT EXISTS constants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value DECIMAL(12,4) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default constants if they don't exist
INSERT INTO constants (key, value, description) VALUES
  ('avgAP', 5000, 'Average Annual Premium'),
  ('commissionRate', 0.05, 'Default Commission Rate (5%)'),
  ('target1', 100000, 'First Target Amount'),
  ('target2', 200000, 'Second Target Amount')
ON CONFLICT (key) DO NOTHING;

-- Insert some sample carriers if none exist
INSERT INTO carriers (name, commission_rates) VALUES
  ('Sample Insurance Co.', '{"first_year": 0.08, "renewal": 0.02}')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_constants_key ON constants(key);

-- Enable Row Level Security (RLS)
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE constants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON carriers FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON constants FOR SELECT USING (true);

-- Allow authenticated users to update constants
CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON constants FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON constants FOR INSERT WITH CHECK (auth.role() = 'authenticated');