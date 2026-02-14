-- Restore calculate_months_paid RPC function
-- This function was accidentally dropped in batch 00 (20260214113000_drop_rpc_batch00_candidates.sql)
-- but is actively called by CommissionStatusService.updateMonthsPaid() via supabase.rpc()
--
-- Restored from rpc_function_drop_backup table (batch_id = 'rpc_batch00_2026_02_14')

CREATE OR REPLACE FUNCTION public.calculate_months_paid(p_effective_date date, p_end_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_months_paid INTEGER;
BEGIN
  -- Validate inputs
  IF p_effective_date IS NULL THEN
    RETURN 0;
  END IF;

  IF p_end_date IS NULL THEN
    p_end_date := CURRENT_DATE;
  END IF;

  -- Calculate months elapsed (round down)
  v_months_paid := FLOOR(
    EXTRACT(YEAR FROM AGE(p_end_date, p_effective_date)) * 12 +
    EXTRACT(MONTH FROM AGE(p_end_date, p_effective_date))
  );

  -- Ensure non-negative
  v_months_paid := GREATEST(0, v_months_paid);

  RETURN v_months_paid;
END;
$function$;

-- Restore original grants
GRANT EXECUTE ON FUNCTION public.calculate_months_paid(date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_months_paid(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_months_paid(date, date) TO service_role;

-- Remove from drop backup to keep tracking clean
DELETE FROM public.rpc_function_drop_backup
WHERE batch_id = 'rpc_batch00_2026_02_14'
  AND function_name = 'calculate_months_paid';

DELETE FROM public.rpc_function_drop_backup_grants
WHERE batch_id = 'rpc_batch00_2026_02_14'
  AND function_name = 'calculate_months_paid';
