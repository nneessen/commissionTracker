-- Add UW wizard access control to user_profiles
-- Migration: User-level UW wizard access

-- Step 1: Add column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN uw_wizard_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 2: Add index for performance (partial index on TRUE values only)
CREATE INDEX idx_user_profiles_uw_wizard_enabled
ON public.user_profiles (uw_wizard_enabled)
WHERE uw_wizard_enabled = TRUE;

-- Step 3: Backfill existing users from IMO settings
-- Enable UW wizard for users in IMOs that currently have it enabled
UPDATE public.user_profiles up
SET uw_wizard_enabled = TRUE
FROM public.imos i
WHERE up.imo_id = i.id
  AND (i.settings->>'underwriting_wizard_enabled')::boolean = TRUE;

-- Step 4: Enable for users in email allowlist
UPDATE public.user_profiles
SET uw_wizard_enabled = TRUE
WHERE email IN ('nickneessen@thestandardhq.com', 'kerryglass.ffl@gmail.com');

-- Step 5: Add comment
COMMENT ON COLUMN public.user_profiles.uw_wizard_enabled IS
'User-level access to Underwriting Wizard. Super admin only can toggle. Future: may be controlled by subscription tier.';

-- Step 6: Audit log trigger
-- Logs changes to uw_wizard_enabled field for compliance
CREATE OR REPLACE FUNCTION log_uw_wizard_access_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.uw_wizard_enabled IS DISTINCT FROM NEW.uw_wizard_enabled THEN
    INSERT INTO public.system_audit_log (
      table_name,
      action,
      record_id,
      performed_by,
      data
    ) VALUES (
      'user_profiles',
      'uw_wizard_access_' || CASE WHEN NEW.uw_wizard_enabled THEN 'granted' ELSE 'revoked' END,
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'user_email', NEW.email,
        'old_value', OLD.uw_wizard_enabled,
        'new_value', NEW.uw_wizard_enabled
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_uw_wizard_access_change
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION log_uw_wizard_access_change();
