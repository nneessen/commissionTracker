-- Fix on_policy_created trigger function
-- The function was incorrectly referencing NEW.product_type (should be NEW.product)
-- and NEW.premium (should be NEW.annual_premium)

CREATE OR REPLACE FUNCTION on_policy_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM trigger_workflows_for_event(
    'policy.created',
    jsonb_build_object(
      'policyId', NEW.id,
      'policyNumber', NEW.policy_number,
      'clientId', NEW.client_id,
      'productType', NEW.product,  -- FIXED: was NEW.product_type
      'premium', NEW.annual_premium,  -- FIXED: was NEW.premium
      'effectiveDate', NEW.effective_date,
      'userId', NEW.user_id,
      'recipientId', NEW.user_id,
      'targetTable', 'policies',
      'targetId', NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION on_policy_created() IS 'Trigger function to initiate workflows when a policy is created. Fixed column references: product (not product_type), annual_premium (not premium).';
