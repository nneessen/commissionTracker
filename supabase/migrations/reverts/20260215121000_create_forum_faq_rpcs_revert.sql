-- Revert: 20260215121000_create_forum_faq_rpcs.sql
-- Purpose: Drop forum/faq v1 RPC functions

DROP FUNCTION IF EXISTS faq_publish_from_topic_v1(uuid, text, text, text);
DROP FUNCTION IF EXISTS faq_upsert_article_v1(uuid, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS forum_resolve_report_v1(uuid, text, text);
DROP FUNCTION IF EXISTS forum_report_content_v1(text, uuid, text, text);
DROP FUNCTION IF EXISTS forum_set_post_vote_v1(uuid, smallint);
DROP FUNCTION IF EXISTS forum_toggle_follow_topic_v1(uuid, boolean);
DROP FUNCTION IF EXISTS forum_set_accepted_post_v1(uuid, uuid);
DROP FUNCTION IF EXISTS forum_set_topic_status_v1(uuid, text);
DROP FUNCTION IF EXISTS forum_update_post_v1(uuid, text);
DROP FUNCTION IF EXISTS forum_update_topic_v1(uuid, text, text);
DROP FUNCTION IF EXISTS forum_create_post_v1(uuid, text);
DROP FUNCTION IF EXISTS forum_create_topic_v1(uuid, text, text);
DROP FUNCTION IF EXISTS faq_get_article_v1(text);
DROP FUNCTION IF EXISTS faq_list_articles_v1(text, timestamptz, uuid, integer);
DROP FUNCTION IF EXISTS forum_list_posts_v1(uuid, timestamptz, uuid, integer);
DROP FUNCTION IF EXISTS forum_get_topic_detail_v1(uuid);
DROP FUNCTION IF EXISTS forum_list_topics_v1(text, text, text, text, timestamptz, uuid, integer);

