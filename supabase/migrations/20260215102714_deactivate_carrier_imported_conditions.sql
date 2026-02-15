-- supabase/migrations/20260215102714_deactivate_carrier_imported_conditions.sql
-- Deactivate carrier-imported health conditions from the UW wizard.
-- These have Title Case categories (Cancer, Cardiac Surgery, Diabetes, etc.)
-- and no follow-up questions, causing massive duplication in the wizard.
-- Curated conditions use lowercase categories (cardiovascular, metabolic, etc.)
-- carrier_condition_acceptance FK references condition_code (not is_active),
-- so existing acceptance rules are NOT broken.

BEGIN;

-- Safety check: verify expected counts before proceeding
DO $$
DECLARE
  deactivate_count INTEGER;
  remaining_count INTEGER;
BEGIN
  SELECT count(*) INTO deactivate_count
  FROM underwriting_health_conditions
  WHERE is_active = true AND category != lower(category);

  SELECT count(*) INTO remaining_count
  FROM underwriting_health_conditions
  WHERE is_active = true AND category = lower(category);

  IF deactivate_count < 60 OR deactivate_count > 90 THEN
    RAISE EXCEPTION 'Unexpected deactivation count: %. Expected 60-90.', deactivate_count;
  END IF;

  IF remaining_count < 50 OR remaining_count > 75 THEN
    RAISE EXCEPTION 'Unexpected remaining count: %. Expected 50-75.', remaining_count;
  END IF;

  RAISE NOTICE 'Deactivating % conditions, % will remain active', deactivate_count, remaining_count;
END $$;

UPDATE underwriting_health_conditions
SET is_active = false, updated_at = now()
WHERE is_active = true AND category != lower(category);

COMMIT;
