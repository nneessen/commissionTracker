-- Add chargeback tracking columns to commissions table
-- This must run BEFORE the main chargeback trigger migration

BEGIN;

-- Add chargeback columns if they don't exist
ALTER TABLE commissions
ADD COLUMN IF NOT EXISTS chargeback_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS chargeback_date DATE,
ADD COLUMN IF NOT EXISTS chargeback_reason TEXT;

-- Add last_payment_date if missing
ALTER TABLE commissions
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

COMMENT ON COLUMN commissions.chargeback_amount IS 'Amount that must be repaid if policy cancels/lapses';
COMMENT ON COLUMN commissions.chargeback_date IS 'When the chargeback was applied';
COMMENT ON COLUMN commissions.chargeback_reason IS 'Reason for chargeback';

COMMIT;
