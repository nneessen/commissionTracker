-- supabase/migrations/20251226_005_fix_policy_imo_trigger.sql
-- Fix the set_policy_agency_id trigger to ALSO set imo_id from user's profile
-- This ensures Slack notifications can fire (they require imo_id)

-- ============================================================================
-- Update the trigger function to set both agency_id and imo_id
-- ============================================================================

CREATE OR REPLACE FUNCTION set_policy_agency_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Set agency_id and imo_id from user's profile if not provided
  IF NEW.user_id IS NOT NULL THEN
    -- Set agency_id if not provided
    IF NEW.agency_id IS NULL THEN
      SELECT agency_id INTO NEW.agency_id
      FROM user_profiles
      WHERE id = NEW.user_id;
    END IF;

    -- Set imo_id if not provided
    IF NEW.imo_id IS NULL THEN
      SELECT imo_id INTO NEW.imo_id
      FROM user_profiles
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix existing policies that have NULL imo_id but the user has an imo_id
-- ============================================================================

UPDATE policies p
SET imo_id = up.imo_id
FROM user_profiles up
WHERE p.user_id = up.id
  AND p.imo_id IS NULL
  AND up.imo_id IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION set_policy_agency_id() IS
'Sets agency_id and imo_id on new policies from the user''s profile if not provided.
Called by trigger_set_policy_agency_id on BEFORE INSERT.
Both fields are important for:
- agency_id: filtering policies by agency
- imo_id: Slack notifications, commission calculations, reporting';
