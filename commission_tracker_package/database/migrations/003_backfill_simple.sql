-- Simple backfill for existing policies
-- Matches actual commissions table schema

DO $$
DECLARE
  policy_record RECORD;
  v_commission_amount DECIMAL;
  created_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of commission records...';

  FOR policy_record IN
    SELECT p.id, p.user_id, p.policy_number, p.annual_premium, p.commission_percentage, p.effective_date, p.status
    FROM policies p
    WHERE p.status IN ('active', 'pending')
      AND NOT EXISTS (
        SELECT 1 FROM commissions c WHERE c.policy_id = p.id
      )
  LOOP
    -- Simple calculation: annual_premium * commission_percentage * (9/12) for 9 month advance
    v_commission_amount := policy_record.annual_premium * COALESCE(policy_record.commission_percentage, 0) * 0.75;

    IF v_commission_amount > 0 THEN
      INSERT INTO commissions (
        user_id,
        policy_id,
        amount,
        rate,
        type,
        status,
        payment_date,
        advance_months,
        months_paid,
        earned_amount,
        unearned_amount,
        notes
      ) VALUES (
        policy_record.user_id,
        policy_record.id,
        v_commission_amount,
        policy_record.commission_percentage * 100, -- Convert to percentage
        'advance',
        CASE
          WHEN policy_record.status = 'active' THEN 'paid'
          ELSE 'pending'
        END,
        CASE
          WHEN policy_record.status = 'active' THEN policy_record.effective_date
          ELSE NULL
        END,
        9,
        0,
        0,
        v_commission_amount,
        'Backfilled for policy ' || policy_record.policy_number
      );

      created_count := created_count + 1;
      RAISE NOTICE 'Created commission for policy %: $%', policy_record.policy_number, v_commission_amount;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: Created % commission records', created_count;
END $$;
