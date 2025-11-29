-- Remove remaining enum-style CHECK constraints that were missed in first pass
-- These are from tables not initially included in the scan

BEGIN;

-- Override commissions status (hardcoded status enum)
ALTER TABLE public.override_commissions
DROP CONSTRAINT IF EXISTS override_commissions_status_check;

-- Expense templates recurring frequency (hardcoded frequency enum)
ALTER TABLE public.expense_templates
DROP CONSTRAINT IF EXISTS expense_templates_recurring_frequency_check;

-- RBAC roles name pattern (regex constraint)
ALTER TABLE public.roles
DROP CONSTRAINT IF EXISTS roles_name_check;

-- RBAC permissions code pattern (regex constraint)
ALTER TABLE public.permissions
DROP CONSTRAINT IF EXISTS permissions_code_check;

COMMIT;

-- Add comments
COMMENT ON COLUMN public.override_commissions.status IS 'Commission status. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.expense_templates.recurring_frequency IS 'Frequency of recurring expense. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.roles.name IS 'Role name. Validated at application layer via TypeScript types.';
COMMENT ON COLUMN public.permissions.code IS 'Permission code. Validated at application layer via TypeScript types.';
