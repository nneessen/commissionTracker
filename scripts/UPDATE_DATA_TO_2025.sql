-- ============================================================================
-- UPDATE DATA TO 2025 TO MATCH SYSTEM DATE
-- ============================================================================
-- Your system date is November 1, 2025 but data is from 2024
-- This updates all dates to 2025 so the dashboard works
-- ============================================================================

-- Update policies dates to 2025
UPDATE policies
SET
  effective_date = effective_date + INTERVAL '1 year',
  created_at = created_at + INTERVAL '1 year',
  updated_at = updated_at + INTERVAL '1 year'
WHERE EXTRACT(YEAR FROM effective_date) = 2024;

-- Update commissions dates to 2025
UPDATE commissions
SET
  created_at = created_at + INTERVAL '1 year',
  updated_at = updated_at + INTERVAL '1 year',
  payment_date = CASE
    WHEN payment_date IS NOT NULL
    THEN payment_date + INTERVAL '1 year'
    ELSE NULL
  END
WHERE EXTRACT(YEAR FROM created_at) = 2024;

-- Update expenses dates to 2025
UPDATE expenses
SET
  date = date + INTERVAL '1 year',
  created_at = created_at + INTERVAL '1 year',
  updated_at = updated_at + INTERVAL '1 year'
WHERE EXTRACT(YEAR FROM date) = 2024;

-- Verify the update
SELECT
  'Policies in 2025:' as check,
  COUNT(*) as count
FROM policies
WHERE EXTRACT(YEAR FROM effective_date) = 2025;

SELECT
  'Commissions in 2025:' as check,
  COUNT(*) as count
FROM commissions
WHERE EXTRACT(YEAR FROM created_at) = 2025;

SELECT
  'Expenses in 2025:' as check,
  COUNT(*) as count
FROM expenses
WHERE EXTRACT(YEAR FROM date) = 2025;