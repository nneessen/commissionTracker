-- Migration: Enhance clients table with additional fields
-- Date: 2025-11-14
-- Purpose: Add date_of_birth and status fields, create stats function, and add indexes

-- Add date_of_birth column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE clients ADD COLUMN date_of_birth DATE;
    COMMENT ON COLUMN clients.date_of_birth IS 'Client date of birth for age calculations and policy eligibility';
  END IF;
END $$;

-- Add status column for client lifecycle (active/inactive/lead) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'status'
  ) THEN
    ALTER TABLE clients ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    COMMENT ON COLUMN clients.status IS 'Client status: active, inactive, or lead';
  END IF;
END $$;

-- Create index for status filtering if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Create index for date_of_birth if it doesn't exist (useful for age-based queries)
CREATE INDEX IF NOT EXISTS idx_clients_date_of_birth ON clients(date_of_birth);

-- Drop the function if it exists (to replace it)
DROP FUNCTION IF EXISTS get_clients_with_stats();

-- Create function to get clients with policy stats
CREATE OR REPLACE FUNCTION get_clients_with_stats()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  notes TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  policy_count BIGINT,
  active_policy_count BIGINT,
  total_premium NUMERIC,
  avg_premium NUMERIC,
  last_policy_date DATE
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.date_of_birth,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    COUNT(p.id) as policy_count,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_policy_count,
    COALESCE(SUM(p.annual_premium), 0) as total_premium,
    CASE
      WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(p.annual_premium), 0) / COUNT(p.id)
      ELSE 0
    END as avg_premium,
    MAX(p.effective_date) as last_policy_date
  FROM clients c
  LEFT JOIN policies p ON c.id = p.client_id
  WHERE c.user_id = auth.uid()
  GROUP BY c.id, c.user_id, c.name, c.email, c.phone, c.address,
           c.date_of_birth, c.notes, c.status, c.created_at, c.updated_at
  ORDER BY c.name;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_clients_with_stats() TO authenticated;

-- Add RLS policy for the function (if not already exists)
DO $$
BEGIN
  -- Check if RLS is enabled on clients table
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'clients' AND rowsecurity = true
  ) THEN
    -- The function already uses auth.uid() internally for security
    RAISE NOTICE 'RLS is enabled on clients table, function uses auth.uid() for security';
  END IF;
END $$;

-- Create a function to calculate client age (helper function)
CREATE OR REPLACE FUNCTION calculate_client_age(birth_date DATE)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN birth_date IS NULL THEN NULL
      ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INTEGER
    END;
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION calculate_client_age(DATE) TO authenticated;

-- Create indexes for common query patterns if they don't exist
CREATE INDEX IF NOT EXISTS idx_clients_user_id_name ON clients(user_id, name);
CREATE INDEX IF NOT EXISTS idx_clients_user_id_status ON clients(user_id, status);

-- Add comments for documentation
COMMENT ON FUNCTION get_clients_with_stats() IS 'Returns all clients for the current user with aggregated policy statistics';
COMMENT ON FUNCTION calculate_client_age(DATE) IS 'Calculates age in years from a given birth date';