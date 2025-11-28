-- Insert recruit role into roles table
-- Recruit role for new recruits in onboarding pipeline with limited access
-- NOTE: This is NOT a system role so permissions can be managed

BEGIN;

-- Insert the recruit role as a non-system role so it can be modified
INSERT INTO public.roles (name, display_name, description, is_system_role, respects_hierarchy, parent_role_id)
VALUES (
  'recruit',
  'Recruit',
  'New recruit in onboarding pipeline with limited access to their own profile and progress',
  false, -- NOT a system role so we can add/modify permissions
  false, -- Recruits don't need hierarchy checks yet
  NULL
)
ON CONFLICT (name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

COMMIT;

-- Display success message
SELECT
  'Recruit role created successfully!' as message,
  id,
  name,
  display_name,
  description
FROM public.roles
WHERE name = 'recruit';
