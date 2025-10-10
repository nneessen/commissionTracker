-- Create just the functions and triggers (no backfill)

-- Function: Calculate Commission Advance
CREATE OR REPLACE FUNCTION calculate_commission_advance(
  p_annual_premium DECIMAL,
  p_commission_percentage DECIMAL,
  p_advance_months INTEGER,
  p_contract_level DECIMAL DEFAULT 1.0
) RETURNS DECIMAL AS $$
DECLARE
  monthly_premium DECIMAL;
  commission_advance DECIMAL;
BEGIN
  -- Validate inputs
  IF p_annual_premium <= 0 OR p_commission_percentage <= 0 OR p_advance_months <= 0 THEN
    RETURN 0;
  END IF;

  -- Calculate monthly premium
  monthly_premium := p_annual_premium / 12.0;

  -- Calculate commission advance
  -- Formula: Monthly Premium × Commission % × Contract Level × Advance Months
  commission_advance := monthly_premium * p_commission_percentage * p_contract_level * p_advance_months;

  RETURN commission_advance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Auto-create Commission Record
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER;
BEGIN
  -- Only create commission for active or pending policies
  IF NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Get user's contract level from user metadata (fallback to constant)
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users
      WHERE id = NEW.user_id
    ),
    (SELECT value / 100.0 FROM constants WHERE key = 'default_contract_level' LIMIT 1),
    1.0
  );

  -- Get advance months (default to 9)
  v_advance_months := COALESCE(
    (SELECT value::INTEGER FROM constants WHERE key = 'default_advance_months' LIMIT 1),
    9
  );

  -- Calculate commission advance
  v_commission_amount := calculate_commission_advance(
    NEW.annual_premium,
    COALESCE(NEW.commission_percentage, 0),
    v_advance_months,
    v_contract_level
  );

  -- Only create commission record if amount > 0 and no commission exists for this policy
  IF v_commission_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM commissions WHERE policy_id = NEW.id
  ) THEN
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
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.carrier_id,
      v_commission_amount,
      CASE
        WHEN NEW.status = 'active' THEN 'paid'
        ELSE 'pending'
      END,
      true,
      v_advance_months,
      0,
      0,
      v_commission_amount,
      'Auto-generated commission record for policy ' || NEW.policy_number
    );

    RAISE NOTICE 'Created commission record: $% for policy %', v_commission_amount, NEW.policy_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-create commission on policy insert
DROP TRIGGER IF EXISTS trigger_auto_create_commission ON policies;

CREATE TRIGGER trigger_auto_create_commission
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commission_record();
