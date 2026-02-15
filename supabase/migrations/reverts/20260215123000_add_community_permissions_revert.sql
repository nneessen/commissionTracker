-- Revert: 20260215123000_add_community_permissions.sql
-- Purpose: Remove community/forum permissions and role mappings

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
);

DELETE FROM permissions
WHERE code IN (
  'nav.community',
  'community.create.own',
  'community.moderate.own',
  'community.faq.manage'
);

