-- supabase/migrations/20251003_010_add_commission_earning_tracking_CORRECT.sql
-- Add columns to track earned vs unearned commission amounts
--
-- VERIFIED AGAINST ACTUAL SCHEMA - Uses correct column names:
-- - amount (NOT commission_amount)
-- - rate (NOT commission_rate)
--
-- BUSINESS LOGIC:
-- - Advances are paid upfront but earned month-by-month
-- - Need to track: months paid, earned amount, unearned amount
-- - Used for chargeback calculations when policies lapse
--
-- FORMULA:
-- - earned_amount = (amount / advance_months) × months_paid
-- - unearned_amount = amount - earned_amount

-- =====================================================
-- STEP 1: Add new columns to commissions table
-- =====================================================

DO $$
BEGIN
  -- Add advance_months column (number of months in advance, typically 9)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'advance_months'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN advance_months INTEGER DEFAULT 9 NOT NULL;

    RAISE NOTICE 'Added advance_months column to commissions table';
  END IF;

  -- Add months_paid column (how many months client has actually paid)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'months_paid'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN months_paid INTEGER DEFAULT 0 NOT NULL;

    RAISE NOTICE 'Added months_paid column to commissions table';
  END IF;

  -- Add earned_amount column (portion of advance that has been earned)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'earned_amount'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN earned_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

    RAISE NOTICE 'Added earned_amount column to commissions table';
  END IF;

  -- Add unearned_amount column (portion of advance still unearned)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'unearned_amount'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN unearned_amount DECIMAL(10,2);

    RAISE NOTICE 'Added unearned_amount column to commissions table';
  END IF;

  -- Add last_payment_date column (when did client last pay premium)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN last_payment_date DATE;

    RAISE NOTICE 'Added last_payment_date column to commissions table';
  END IF;

  -- Add chargeback tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'chargeback_amount'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN chargeback_amount DECIMAL(10,2) DEFAULT 0;

    RAISE NOTICE 'Added chargeback_amount column to commissions table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'chargeback_date'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN chargeback_date DATE;

    RAISE NOTICE 'Added chargeback_date column to commissions table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'chargeback_reason'
  ) THEN
    ALTER TABLE public.commissions
    ADD COLUMN chargeback_reason TEXT;

    RAISE NOTICE 'Added chargeback_reason column to commissions table';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Initialize unearned_amount for existing records
-- =====================================================

-- For existing commissions, set unearned_amount = amount
-- (assumes they were just created and nothing earned yet)
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.commissions
  SET unearned_amount = amount
  WHERE unearned_amount IS NULL AND amount IS NOT NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Initialized unearned_amount for % existing records', v_updated_count;
END $$;

-- =====================================================
-- STEP 3: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN public.commissions.advance_months IS
'Number of months in the commission advance (typically 9). Used with amount to calculate monthly earning rate.';

COMMENT ON COLUMN public.commissions.months_paid IS
'Number of months the client has actually paid premiums. Used to calculate earned commission.';

COMMENT ON COLUMN public.commissions.earned_amount IS
'Portion of advance commission that has been earned through client payments. Formula: (amount / advance_months) × months_paid';

COMMENT ON COLUMN public.commissions.unearned_amount IS
'Portion of advance commission that is still unearned. Formula: amount - earned_amount. This represents chargeback exposure.';

COMMENT ON COLUMN public.commissions.last_payment_date IS
'Date when the client last made a premium payment. Used to track payment history and calculate months_paid.';

COMMENT ON COLUMN public.commissions.chargeback_amount IS
'Amount of chargeback if policy lapsed before advance was fully earned. Equal to unearned_amount at time of lapse.';

COMMENT ON COLUMN public.commissions.chargeback_date IS
'Date when chargeback was recorded. Typically same as policy lapse date.';

COMMENT ON COLUMN public.commissions.chargeback_reason IS
'Reason for chargeback (e.g., "Policy lapsed at month 3", "Client cancelled", etc.)';

-- =====================================================
-- STEP 4: Create helpful database functions
-- =====================================================

-- Function to calculate earned amount
CREATE OR REPLACE FUNCTION public.calculate_earned_amount(
  p_amount DECIMAL,
  p_advance_months INTEGER,
  p_months_paid INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
  v_monthly_earning_rate DECIMAL;
  v_earned_amount DECIMAL;
  v_effective_months_paid INTEGER;
BEGIN
  -- Validate inputs
  IF p_amount IS NULL OR p_amount < 0 OR p_advance_months IS NULL OR p_advance_months <= 0 OR p_months_paid IS NULL OR p_months_paid < 0 THEN
    RETURN 0;
  END IF;

  -- Cap months paid at advance months (can't earn more than advance)
  v_effective_months_paid := LEAST(p_months_paid, p_advance_months);

  -- Calculate monthly earning rate
  v_monthly_earning_rate := p_amount / p_advance_months;

  -- Calculate earned amount
  v_earned_amount := v_monthly_earning_rate * v_effective_months_paid;

  RETURN v_earned_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_earned_amount IS
'Calculate earned commission based on months paid. Formula: (amount / advance_months) × months_paid';

-- Function to calculate unearned amount
CREATE OR REPLACE FUNCTION public.calculate_unearned_amount(
  p_amount DECIMAL,
  p_advance_months INTEGER,
  p_months_paid INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
  v_earned_amount DECIMAL;
BEGIN
  v_earned_amount := public.calculate_earned_amount(p_amount, p_advance_months, p_months_paid);
  RETURN COALESCE(p_amount, 0) - COALESCE(v_earned_amount, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_unearned_amount IS
'Calculate unearned commission (chargeback exposure). Formula: amount - earned_amount';

-- =====================================================
-- STEP 5: Create trigger to auto-update earned/unearned amounts
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_commission_earned_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if amount is set
  IF NEW.amount IS NOT NULL THEN
    -- Recalculate earned and unearned amounts when months_paid changes
    NEW.earned_amount := public.calculate_earned_amount(
      NEW.amount,
      COALESCE(NEW.advance_months, 9),
      COALESCE(NEW.months_paid, 0)
    );

    NEW.unearned_amount := NEW.amount - COALESCE(NEW.earned_amount, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_commission_earned ON public.commissions;

CREATE TRIGGER trigger_update_commission_earned
  BEFORE INSERT OR UPDATE OF months_paid, amount, advance_months
  ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_earned_amounts();

COMMENT ON TRIGGER trigger_update_commission_earned ON public.commissions IS
'Automatically recalculates earned_amount and unearned_amount when months_paid or amount changes';

-- =====================================================
-- STEP 6: Create useful database views
-- =====================================================

-- View for commission earning progress
CREATE OR REPLACE VIEW public.commission_earning_status AS
SELECT
  c.id,
  c.policy_id,
  c.user_id,
  c.amount as advance_amount,
  c.advance_months,
  c.months_paid,
  c.earned_amount,
  c.unearned_amount,
  c.last_payment_date,
  ROUND((COALESCE(c.months_paid, 0)::DECIMAL / NULLIF(c.advance_months, 0)) * 100, 2) as percentage_earned,
  (COALESCE(c.months_paid, 0) >= c.advance_months) as is_fully_earned,
  GREATEST(0, c.advance_months - COALESCE(c.months_paid, 0)) as months_remaining,
  CASE
    WHEN c.advance_months > 0 THEN c.amount / c.advance_months
    ELSE 0
  END as monthly_earning_rate,
  -- Chargeback risk assessment
  CASE
    WHEN COALESCE(c.months_paid, 0) = 0 THEN 'HIGH'
    WHEN c.months_paid < 3 THEN 'HIGH'
    WHEN c.months_paid < 6 THEN 'MEDIUM'
    WHEN c.months_paid < c.advance_months THEN 'LOW'
    ELSE 'NONE'
  END as chargeback_risk,
  c.chargeback_amount,
  c.chargeback_date,
  c.chargeback_reason,
  c.status,
  c.type,
  c.created_at,
  c.updated_at
FROM public.commissions c;

COMMENT ON VIEW public.commission_earning_status IS
'Comprehensive view of commission earning progress, including risk assessment and calculated metrics';

-- View for unearned commission summary (portfolio risk)
CREATE OR REPLACE VIEW public.unearned_commission_summary AS
SELECT
  c.user_id,
  COUNT(*) as total_commissions,
  SUM(c.amount) as total_advances,
  SUM(c.earned_amount) as total_earned,
  SUM(c.unearned_amount) as total_unearned,
  SUM(c.chargeback_amount) as total_chargebacks,
  ROUND(AVG(COALESCE(c.months_paid, 0)), 2) as avg_months_paid,
  ROUND((SUM(COALESCE(c.earned_amount, 0)) / NULLIF(SUM(c.amount), 0)) * 100, 2) as portfolio_earned_percentage,
  COUNT(CASE WHEN COALESCE(c.months_paid, 0) >= c.advance_months THEN 1 END) as fully_earned_count,
  COUNT(CASE WHEN COALESCE(c.months_paid, 0) < c.advance_months THEN 1 END) as at_risk_count
FROM public.commissions c
GROUP BY c.user_id;

COMMENT ON VIEW public.unearned_commission_summary IS
'Summary of unearned commissions by user - shows total portfolio risk exposure';

-- =====================================================
-- STEP 7: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_commissions_months_paid
  ON public.commissions(months_paid);

CREATE INDEX IF NOT EXISTS idx_commissions_earned_amount
  ON public.commissions(earned_amount);

CREATE INDEX IF NOT EXISTS idx_commissions_unearned_amount
  ON public.commissions(unearned_amount);

CREATE INDEX IF NOT EXISTS idx_commissions_last_payment_date
  ON public.commissions(last_payment_date);

CREATE INDEX IF NOT EXISTS idx_commissions_advance_months
  ON public.commissions(advance_months);

-- =====================================================
-- STEP 8: Verification and summary
-- =====================================================

DO $$
DECLARE
  v_total_commissions INTEGER;
  v_total_unearned DECIMAL;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(unearned_amount), 0)
  INTO v_total_commissions, v_total_unearned
  FROM public.commissions;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Commission Earning Tracking Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total commissions: %', v_total_commissions;
  RAISE NOTICE 'Total unearned amount: $%', v_total_unearned;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - advance_months';
  RAISE NOTICE '  - months_paid';
  RAISE NOTICE '  - earned_amount';
  RAISE NOTICE '  - unearned_amount';
  RAISE NOTICE '  - last_payment_date';
  RAISE NOTICE '  - chargeback_amount';
  RAISE NOTICE '  - chargeback_date';
  RAISE NOTICE '  - chargeback_reason';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - calculate_earned_amount()';
  RAISE NOTICE '  - calculate_unearned_amount()';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  - trigger_update_commission_earned';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - commission_earning_status';
  RAISE NOTICE '  - unearned_commission_summary';
  RAISE NOTICE '========================================';
END $$;
