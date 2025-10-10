-- Update trigger to match actual commissions table schema

CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount DECIMAL;
BEGIN
  -- Only create commission for active or pending policies
  IF NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Calculate commission: annual_premium * commission_percentage * (9/12) for 9 month advance
  v_commission_amount := NEW.annual_premium * COALESCE(NEW.commission_percentage, 0) * 0.75;

  -- Only create commission record if amount > 0 and no commission exists for this policy
  IF v_commission_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM commissions WHERE policy_id = NEW.id
  ) THEN
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
      NEW.user_id,
      NEW.id,
      v_commission_amount,
      NEW.commission_percentage * 100, -- Convert to percentage
      'advance',
      CASE
        WHEN NEW.status = 'active' THEN 'paid'
        ELSE 'pending'
      END,
      CASE
        WHEN NEW.status = 'active' THEN NEW.effective_date
        ELSE NULL
      END,
      9,
      0,
      0,
      v_commission_amount,
      'Auto-generated for policy ' || NEW.policy_number
    );

    RAISE NOTICE 'Created commission record: $% for policy %', v_commission_amount, NEW.policy_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
