-- Migration: Add product_type enum
-- Description: Create product_type enum that's referenced throughout the codebase
-- Author: System
-- Date: 2025-12-05

-- Create product_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
    CREATE TYPE product_type AS ENUM ('life', 'annuity', 'disability', 'long_term_care', 'other');
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TYPE product_type IS 'Types of insurance products supported by the system';