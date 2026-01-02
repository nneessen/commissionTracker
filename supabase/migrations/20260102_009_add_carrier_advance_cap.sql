-- supabase/migrations/20260102_009_add_carrier_advance_cap.sql
-- Add carrier advance caps feature
--
-- Business Logic:
-- Some carriers have a maximum advance amount (e.g., Mutual of Omaha = $3,000).
-- When calculated advance exceeds the cap:
--   - Agent receives the capped amount as upfront advance
--   - Overage is paid "as earned" after the advance is recouped
-- Recoupment period = advance_cap / (monthly_premium × commission_rate)
-- Overage payments start at recoupment_months + 1

-- ============================================================================
-- 1. Add advance_cap to carriers table
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'carriers'
    AND column_name = 'advance_cap'
  ) THEN
    ALTER TABLE carriers ADD COLUMN advance_cap NUMERIC(12,2) DEFAULT NULL;
    COMMENT ON COLUMN carriers.advance_cap IS
      'Maximum advance amount per policy for this carrier. NULL means no cap.';
  END IF;
END $$;

-- ============================================================================
-- 2. Add cap tracking columns to commissions table
-- ============================================================================

DO $$
BEGIN
  -- Original calculated advance before cap was applied
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'original_advance'
  ) THEN
    ALTER TABLE commissions ADD COLUMN original_advance NUMERIC(12,2) DEFAULT NULL;
    COMMENT ON COLUMN commissions.original_advance IS
      'Original calculated advance amount before carrier cap was applied. NULL if no cap applied.';
  END IF;

  -- Amount that exceeds the cap (to be paid as-earned later)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'overage_amount'
  ) THEN
    ALTER TABLE commissions ADD COLUMN overage_amount NUMERIC(12,2) DEFAULT NULL;
    COMMENT ON COLUMN commissions.overage_amount IS
      'Amount exceeding carrier advance cap. Paid as-earned after recoupment. NULL if no cap applied or no overage.';
  END IF;

  -- Month when overage payments should start (recoupment_months + 1)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'commissions'
    AND column_name = 'overage_start_month'
  ) THEN
    ALTER TABLE commissions ADD COLUMN overage_start_month INTEGER DEFAULT NULL;
    COMMENT ON COLUMN commissions.overage_start_month IS
      'Month number when overage payments begin (after advance is recouped). NULL if no overage.';
  END IF;
END $$;

-- ============================================================================
-- 3. Add commission type for capped overage payments
-- ============================================================================

-- Check if 'capped_overage' already exists in commission_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'capped_overage'
    AND enumtypid = 'commission_type'::regtype
  ) THEN
    ALTER TYPE commission_type ADD VALUE IF NOT EXISTS 'capped_overage';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- commission_type enum doesn't exist, skip
    NULL;
END $$;

-- ============================================================================
-- 4. Create indexes for efficient queries
-- ============================================================================

-- Index for carriers with advance caps (sparse index)
CREATE INDEX IF NOT EXISTS idx_carriers_advance_cap
ON carriers(advance_cap)
WHERE advance_cap IS NOT NULL;

-- Index for commissions with overage amounts
CREATE INDEX IF NOT EXISTS idx_commissions_overage
ON commissions(overage_start_month, overage_amount)
WHERE overage_amount IS NOT NULL AND overage_amount > 0;

-- ============================================================================
-- 5. Grant permissions
-- ============================================================================

-- Ensure proper access (follows existing patterns)
GRANT SELECT, INSERT, UPDATE, DELETE ON carriers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON commissions TO authenticated;
