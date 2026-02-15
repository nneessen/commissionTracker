-- Revert: 20260215114000_create_forum_faq_schema_and_rls.sql
-- Purpose: Remove forum + FAQ schema, policies, triggers, and helper functions

-- Drop tables in dependency order
DROP TABLE IF EXISTS forum_reports;
DROP TABLE IF EXISTS faq_articles;
DROP TABLE IF EXISTS forum_post_votes;
DROP TABLE IF EXISTS forum_topic_follows;
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS forum_topics;
DROP TABLE IF EXISTS forum_categories;

-- Drop helper functions
DROP FUNCTION IF EXISTS forum_validate_topic_post_refs();
DROP FUNCTION IF EXISTS forum_sync_topic_activity_from_posts();
DROP FUNCTION IF EXISTS forum_set_faq_derived_fields();
DROP FUNCTION IF EXISTS forum_set_post_derived_fields();
DROP FUNCTION IF EXISTS forum_set_topic_derived_fields();
DROP FUNCTION IF EXISTS forum_set_updated_at();
DROP FUNCTION IF EXISTS forum_markdown_to_plain(text);
