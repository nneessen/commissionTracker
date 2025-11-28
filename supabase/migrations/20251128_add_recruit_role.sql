-- Migration: Add recruit role for users in onboarding pipeline
-- Recruits have limited access - only their own profile and recruiting dashboard

BEGIN;

-- Add recruit role to roles table
INSERT INTO public.roles (name, display_name, description, is_system_role)
VALUES (
  'recruit',
  'Recruit',
  'New recruit in onboarding pipeline with limited access to their own profile and progress',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Add recruit-specific permissions if they don't exist
INSERT INTO public.permissions (name, display_name, description, resource, action)
VALUES
  ('view_own_recruiting_pipeline', 'View Own Recruiting Pipeline', 'Can view their own recruiting progress and checklist', 'recruiting_pipeline', 'read'),
  ('edit_own_profile', 'Edit Own Profile', 'Can edit their own profile information', 'user_profile', 'update'),
  ('upload_profile_photo', 'Upload Profile Photo', 'Can upload their own profile photo', 'user_profile', 'update'),
  ('upload_documents', 'Upload Documents', 'Can upload required onboarding documents', 'documents', 'create'),
  ('communicate_with_upline', 'Communicate with Upline', 'Can send and receive messages with upline/trainer', 'messages', 'create')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions to recruit role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'recruit'
AND p.name IN (
  'view_own_recruiting_pipeline',
  'edit_own_profile',
  'upload_profile_photo',
  'upload_documents',
  'communicate_with_upline'
)
ON CONFLICT DO NOTHING;

-- Update any existing recruits (users with onboarding_status but no role) to have recruit role
-- This is a one-time cleanup
UPDATE public.user_profiles
SET roles = ARRAY['recruit']::text[]
WHERE onboarding_status IN ('lead', 'active', 'interview_1', 'zoom_interview', 'pre_licensing', 'exam', 'npn_received', 'contracting', 'bootcamp')
AND (roles IS NULL OR roles = '{}' OR NOT ('agent' = ANY(roles) OR 'admin' = ANY(roles)));

COMMIT;

-- Add comment
COMMENT ON COLUMN public.user_profiles.roles IS 'User roles: recruit (in pipeline), agent (active licensed), admin (full access), trainer, recruiter, upline_manager';