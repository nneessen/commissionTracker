-- Migration: Remove Community / Forum / FAQ feature
-- Purpose: Fully remove community schema, RPCs, helper functions, and permissions

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Remove permission mappings + permissions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- The repo enforces a trigger that blocks role_permission changes for system roles.
  -- Temporarily disable protection only for affected roles, mirroring the original
  -- community permission migration approach.
  CREATE TEMP TABLE tmp_community_role_flags ON COMMIT DROP AS
  SELECT DISTINCT r.id, r.is_system_role
  FROM public.roles r
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE p.code IN (
    'nav.community',
    'community.create.own',
    'community.moderate.own',
    'community.faq.manage'
  );

  UPDATE public.roles r
  SET is_system_role = false
  FROM tmp_community_role_flags t
  WHERE r.id = t.id
    AND t.is_system_role = true;

  DELETE FROM public.role_permissions
  WHERE permission_id IN (
    SELECT id
    FROM public.permissions
    WHERE code IN (
      'nav.community',
      'community.create.own',
      'community.moderate.own',
      'community.faq.manage'
    )
  );

  UPDATE public.roles r
  SET is_system_role = t.is_system_role
  FROM tmp_community_role_flags t
  WHERE r.id = t.id;
END $$;

DELETE FROM public.permissions
WHERE code IN (
  'nav.community',
  'community.create.own',
  'community.moderate.own',
  'community.faq.manage'
);

-- -----------------------------------------------------------------------------
-- 2) Remove community RPCs
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.forum_list_topics_v1(text, text, text, text, timestamptz, uuid, integer);
DROP FUNCTION IF EXISTS public.forum_get_topic_detail_v1(uuid);
DROP FUNCTION IF EXISTS public.forum_list_posts_v1(uuid, timestamptz, uuid, integer);
DROP FUNCTION IF EXISTS public.faq_list_articles_v1(text, timestamptz, uuid, integer);
DROP FUNCTION IF EXISTS public.faq_get_article_v1(text);
DROP FUNCTION IF EXISTS public.forum_create_topic_v1(uuid, text, text);
DROP FUNCTION IF EXISTS public.forum_create_post_v1(uuid, text);
DROP FUNCTION IF EXISTS public.forum_update_topic_v1(uuid, text, text);
DROP FUNCTION IF EXISTS public.forum_update_post_v1(uuid, text);
DROP FUNCTION IF EXISTS public.forum_set_topic_status_v1(uuid, text);
DROP FUNCTION IF EXISTS public.forum_set_accepted_post_v1(uuid, uuid);
DROP FUNCTION IF EXISTS public.forum_toggle_follow_topic_v1(uuid, boolean);
DROP FUNCTION IF EXISTS public.forum_set_post_vote_v1(uuid, smallint);
DROP FUNCTION IF EXISTS public.forum_report_content_v1(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.forum_resolve_report_v1(uuid, text, text);
DROP FUNCTION IF EXISTS public.faq_upsert_article_v1(uuid, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.faq_publish_from_topic_v1(uuid, text, text, text);

-- -----------------------------------------------------------------------------
-- 3) Remove community tables (CASCADE clears dependent triggers/indexes/policies)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.faq_articles CASCADE;
DROP TABLE IF EXISTS public.forum_reports CASCADE;
DROP TABLE IF EXISTS public.forum_post_votes CASCADE;
DROP TABLE IF EXISTS public.forum_topic_follows CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_topics CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;

-- -----------------------------------------------------------------------------
-- 4) Remove helper/trigger functions
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.forum_sync_topic_activity_from_posts();
DROP FUNCTION IF EXISTS public.forum_validate_topic_post_refs();
DROP FUNCTION IF EXISTS public.forum_set_faq_derived_fields();
DROP FUNCTION IF EXISTS public.forum_set_post_derived_fields();
DROP FUNCTION IF EXISTS public.forum_set_topic_derived_fields();
DROP FUNCTION IF EXISTS public.forum_set_updated_at();
DROP FUNCTION IF EXISTS public.forum_markdown_to_plain(text);

COMMIT;
