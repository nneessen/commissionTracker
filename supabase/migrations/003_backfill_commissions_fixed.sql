-- Backfill commission records for existing policies
-- Fixed version without advance_months column reference

DO $$
DECLARE
  policy_record RECORD;
  v_commission_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER;
  created_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of commission records for existing policies...';

  FOR policy_record IN
    SELECT p.*
    FROM policies p
    WHERE p.status IN ('active', 'pending')
      AND NOT EXISTS (
        SELECT 1 FROM commissions c WHERE c.policy_id = p.id
      )
  LOOP
    -- Get user's contract level
    v_contract_level := COALESCE(
      (
        SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
        FROM auth.users
        WHERE id = policy_record.user_id
      ),
      (SELECT value / 100.0 FROM constants WHERE key = 'default_contract_level' LIMIT 1),
      1.0
    );

    -- Get advance months (default to 9 since policies table doesn't have this column)
    v_advance_months := COALESCE(
      (SELECT value::INTEGER FROM constants WHERE key = 'default_advance_months' LIMIT 1),
      9
    );

    -- Calculate commission using the function
    v_commission_amount := calculate_commission_advance(
      policy_record.annual_premium,
      COALESCE(policy_record.commission_percentage, 0),
      v_advance_months,
      v_contract_level
    );

    -- Create commission record
    IF v_commission_amount > 0 THEN
      INSERT INTO commissions (
        user_id,
        policy_id,
        carrier_id,
        commission_amount,
        status,
        is_advance,
        advance_months,
        months_paid,
        earned_amount,
        unearned_amount,
        payment_date,
        notes
      ) VALUES (
        policy_record.user_id,
        policy_record.id,
        policy_record.carrier_id,
        v_commission_amount,
        CASE
          WHEN policy_record.status = 'active' THEN 'paid'
          ELSE 'pending'
        END,
        true,
        v_advance_months,
        0,
        0,
        v_commission_amount,
        CASE
          WHEN policy_record.status = 'active' THEN policy_record.effective_date
          ELSE NULL
        END,
        'Backfilled commission record for policy ' || policy_record.policy_number
      );

      created_count := created_count + 1;
      RAISE NOTICE 'Created commission for policy %: $%', policy_record.policy_number, v_commission_amount;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: Created % commission records', created_count;
END $$;
