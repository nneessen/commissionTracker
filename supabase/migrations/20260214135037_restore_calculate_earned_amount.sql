-- Restore calculate_earned_amount RPC function
-- This function was accidentally dropped in batch 00 (20260214113000_drop_rpc_batch00_candidates.sql)
-- but is REQUIRED by the trigger_update_commission_earned trigger on the commissions table.
-- The trigger fires BEFORE INSERT on commissions, meaning ALL new commission inserts fail without this function.
--
-- Restored from rpc_function_drop_backup table (batch_id = 'rpc_batch00_2026_02_14')

CREATE OR REPLACE FUNCTION public.calculate_earned_amount(
  p_amount numeric,
  p_advance_months integer,
  p_months_paid integer
)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$;

-- Restore original grants
GRANT EXECUTE ON FUNCTION public.calculate_earned_amount(numeric, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_earned_amount(numeric, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_earned_amount(numeric, integer, integer) TO service_role;

-- Remove from drop backup to keep tracking clean
DELETE FROM public.rpc_function_drop_backup
WHERE batch_id = 'rpc_batch00_2026_02_14'
  AND function_name = 'calculate_earned_amount';

DELETE FROM public.rpc_function_drop_backup_grants
WHERE batch_id = 'rpc_batch00_2026_02_14'
  AND function_name = 'calculate_earned_amount';
