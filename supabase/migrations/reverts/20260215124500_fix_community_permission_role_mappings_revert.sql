-- Revert: 20260215124500_fix_community_permission_role_mappings.sql
-- Purpose: Remove role mappings created by the corrective migration.

DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id
  FROM permissions
  WHERE code IN (
    'nav.community',
    'community.create.own',
    'community.moderate.own',
    'community.faq.manage'
  )
)
AND role_id IN (
  SELECT id
  FROM roles
  WHERE name = ANY(ARRAY[
    'super_admin',
    'admin',
    'agent',
    'upline_manager',
    'trainer',
    'recruiter',
    'contracting_manager',
    'office_staff',
    'recruit'
  ])
);

