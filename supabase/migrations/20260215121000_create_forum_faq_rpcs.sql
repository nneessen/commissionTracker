-- Migration: Forum + FAQ RPC functions (v1)
-- Purpose: Typed read/write contracts for community/forum and FAQ flows

-- ============================================================================
-- READ RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION forum_list_topics_v1(
  p_category_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_sort text DEFAULT 'recent',
  p_cursor_last_activity timestamptz DEFAULT NULL,
  p_cursor_topic_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  imo_id uuid,
  category_id uuid,
  category_slug text,
  category_name text,
  author_id uuid,
  author_name text,
  title text,
  snippet text,
  status text,
  reply_count integer,
  view_count integer,
  last_activity_at timestamptz,
  created_at timestamptz,
  is_pinned boolean,
  accepted_post_id uuid,
  user_can_edit boolean,
  user_can_moderate boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      auth.uid() AS user_id,
      is_imo_admin() AS is_admin,
      is_super_admin() AS is_super
  )
  SELECT
    ft.id,
    ft.imo_id,
    ft.category_id,
    fc.slug AS category_slug,
    fc.name AS category_name,
    ft.author_id,
    trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')) AS author_name,
    ft.title,
    left(ft.body_plain, 280) AS snippet,
    ft.status,
    ft.reply_count,
    ft.view_count,
    ft.last_activity_at,
    ft.created_at,
    ft.is_pinned,
    ft.accepted_post_id,
    (ft.author_id = me.user_id AND ft.is_deleted = false AND ft.status IN ('open', 'resolved')) AS user_can_edit,
    (me.is_admin OR me.is_super) AS user_can_moderate
  FROM forum_topics ft
  INNER JOIN forum_categories fc ON fc.id = ft.category_id AND fc.imo_id = ft.imo_id
  INNER JOIN user_profiles up ON up.id = ft.author_id
  CROSS JOIN me
  WHERE ft.imo_id = get_my_imo_id()
    AND ft.is_deleted = false
    AND (p_category_slug IS NULL OR p_category_slug = '' OR fc.slug = p_category_slug)
    AND (p_status IS NULL OR p_status = '' OR ft.status = p_status)
    AND (
      p_search IS NULL
      OR p_search = ''
      OR ft.search_tsv @@ websearch_to_tsquery('english', p_search)
    )
    AND (
      p_cursor_last_activity IS NULL
      OR p_cursor_topic_id IS NULL
      OR (ft.last_activity_at, ft.id) < (p_cursor_last_activity, p_cursor_topic_id)
    )
  ORDER BY
    ft.is_pinned DESC,
    CASE WHEN p_sort = 'popular' THEN ft.reply_count END DESC NULLS LAST,
    CASE WHEN p_sort = 'unanswered' THEN ft.reply_count END ASC NULLS LAST,
    ft.last_activity_at DESC,
    ft.id DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 100));
$$;

CREATE OR REPLACE FUNCTION forum_get_topic_detail_v1(
  p_topic_id uuid
)
RETURNS TABLE (
  id uuid,
  imo_id uuid,
  category_id uuid,
  category_slug text,
  category_name text,
  author_id uuid,
  author_name text,
  title text,
  body_markdown text,
  body_plain text,
  status text,
  accepted_post_id uuid,
  reply_count integer,
  view_count integer,
  last_activity_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  is_pinned boolean,
  user_can_edit boolean,
  user_can_moderate boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      auth.uid() AS user_id,
      is_imo_admin() AS is_admin,
      is_super_admin() AS is_super
  )
  SELECT
    ft.id,
    ft.imo_id,
    ft.category_id,
    fc.slug AS category_slug,
    fc.name AS category_name,
    ft.author_id,
    trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')) AS author_name,
    ft.title,
    ft.body_markdown,
    ft.body_plain,
    ft.status,
    ft.accepted_post_id,
    ft.reply_count,
    ft.view_count,
    ft.last_activity_at,
    ft.created_at,
    ft.updated_at,
    ft.is_pinned,
    (ft.author_id = me.user_id AND ft.is_deleted = false AND ft.status IN ('open', 'resolved')) AS user_can_edit,
    (me.is_admin OR me.is_super) AS user_can_moderate
  FROM forum_topics ft
  INNER JOIN forum_categories fc ON fc.id = ft.category_id AND fc.imo_id = ft.imo_id
  INNER JOIN user_profiles up ON up.id = ft.author_id
  CROSS JOIN me
  WHERE ft.id = p_topic_id
    AND ft.imo_id = get_my_imo_id()
    AND (
      ft.is_deleted = false
      OR ft.author_id = me.user_id
      OR me.is_admin
      OR me.is_super
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION forum_list_posts_v1(
  p_topic_id uuid,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_post_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  topic_id uuid,
  imo_id uuid,
  author_id uuid,
  author_name text,
  body_markdown text,
  body_plain text,
  is_deleted boolean,
  edited_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  my_vote smallint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    fp.id,
    fp.topic_id,
    fp.imo_id,
    fp.author_id,
    trim(coalesce(up.first_name, '') || ' ' || coalesce(up.last_name, '')) AS author_name,
    fp.body_markdown,
    fp.body_plain,
    fp.is_deleted,
    fp.edited_at,
    fp.created_at,
    fp.updated_at,
    fpv.vote AS my_vote
  FROM forum_posts fp
  INNER JOIN user_profiles up ON up.id = fp.author_id
  LEFT JOIN forum_post_votes fpv ON fpv.post_id = fp.id AND fpv.user_id = auth.uid()
  WHERE fp.topic_id = p_topic_id
    AND fp.imo_id = get_my_imo_id()
    AND (
      p_cursor_created_at IS NULL
      OR p_cursor_post_id IS NULL
      OR (fp.created_at, fp.id) > (p_cursor_created_at, p_cursor_post_id)
    )
  ORDER BY fp.created_at ASC, fp.id ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
$$;

CREATE OR REPLACE FUNCTION faq_list_articles_v1(
  p_search text DEFAULT NULL,
  p_cursor_published_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  imo_id uuid,
  slug text,
  title text,
  summary text,
  status text,
  source_topic_id uuid,
  view_count integer,
  published_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    fa.id,
    fa.imo_id,
    fa.slug,
    fa.title,
    fa.summary,
    fa.status,
    fa.source_topic_id,
    fa.view_count,
    fa.published_at,
    fa.updated_at
  FROM faq_articles fa
  WHERE fa.imo_id = get_my_imo_id()
    AND (
      p_search IS NULL
      OR p_search = ''
      OR fa.search_tsv @@ websearch_to_tsquery('english', p_search)
    )
    AND (
      p_cursor_published_at IS NULL
      OR p_cursor_id IS NULL
      OR (COALESCE(fa.published_at, fa.created_at), fa.id) < (p_cursor_published_at, p_cursor_id)
    )
  ORDER BY COALESCE(fa.published_at, fa.created_at) DESC, fa.id DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
$$;

CREATE OR REPLACE FUNCTION faq_get_article_v1(
  p_slug text
)
RETURNS TABLE (
  id uuid,
  imo_id uuid,
  slug text,
  title text,
  summary text,
  body_markdown text,
  body_plain text,
  status text,
  source_topic_id uuid,
  view_count integer,
  published_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fa.id,
    fa.imo_id,
    fa.slug,
    fa.title,
    fa.summary,
    fa.body_markdown,
    fa.body_plain,
    fa.status,
    fa.source_topic_id,
    fa.view_count,
    fa.published_at,
    fa.updated_at
  FROM faq_articles fa
  WHERE fa.imo_id = get_my_imo_id()
    AND fa.slug = p_slug
    AND (
      fa.status = 'published'
      OR is_imo_admin()
      OR is_super_admin()
    )
  LIMIT 1;
END;
$$;

-- ============================================================================
-- WRITE / MODERATION RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION forum_create_topic_v1(
  p_category_id uuid,
  p_title text,
  p_body_markdown text
)
RETURNS TABLE (
  id uuid,
  category_id uuid,
  author_id uuid,
  title text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_topic forum_topics%ROWTYPE;
BEGIN
  IF p_title IS NULL OR char_length(trim(p_title)) < 8 OR char_length(trim(p_title)) > 180 THEN
    RAISE EXCEPTION 'Title must be between 8 and 180 characters';
  END IF;

  IF p_body_markdown IS NULL OR char_length(trim(p_body_markdown)) < 1 OR char_length(p_body_markdown) > 20000 THEN
    RAISE EXCEPTION 'Body must be between 1 and 20000 characters';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM forum_categories fc
    WHERE fc.id = p_category_id
      AND fc.imo_id = get_my_imo_id()
      AND fc.is_active = true
  ) THEN
    RAISE EXCEPTION 'Category not found or inactive';
  END IF;

  INSERT INTO forum_topics (
    imo_id,
    category_id,
    author_id,
    title,
    body_markdown,
    status,
    last_activity_at
  )
  VALUES (
    get_my_imo_id(),
    p_category_id,
    auth.uid(),
    trim(p_title),
    p_body_markdown,
    'open',
    now()
  )
  RETURNING * INTO v_topic;

  RETURN QUERY
  SELECT
    v_topic.id,
    v_topic.category_id,
    v_topic.author_id,
    v_topic.title,
    v_topic.status,
    v_topic.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_create_post_v1(
  p_topic_id uuid,
  p_body_markdown text
)
RETURNS TABLE (
  id uuid,
  topic_id uuid,
  author_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_topic forum_topics%ROWTYPE;
  v_post forum_posts%ROWTYPE;
BEGIN
  IF p_body_markdown IS NULL OR char_length(trim(p_body_markdown)) < 1 OR char_length(p_body_markdown) > 20000 THEN
    RAISE EXCEPTION 'Reply must be between 1 and 20000 characters';
  END IF;

  SELECT *
  INTO v_topic
  FROM forum_topics ft
  WHERE ft.id = p_topic_id
    AND ft.imo_id = get_my_imo_id()
  LIMIT 1;

  IF v_topic.id IS NULL THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  IF v_topic.is_deleted THEN
    RAISE EXCEPTION 'Topic is deleted';
  END IF;

  IF v_topic.status IN ('locked', 'archived') THEN
    RAISE EXCEPTION 'Topic is locked';
  END IF;

  INSERT INTO forum_posts (
    imo_id,
    topic_id,
    author_id,
    body_markdown
  )
  VALUES (
    v_topic.imo_id,
    v_topic.id,
    auth.uid(),
    p_body_markdown
  )
  RETURNING * INTO v_post;

  RETURN QUERY
  SELECT
    v_post.id,
    v_post.topic_id,
    v_post.author_id,
    v_post.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_update_topic_v1(
  p_topic_id uuid,
  p_title text,
  p_body_markdown text
)
RETURNS TABLE (
  id uuid,
  title text,
  body_markdown text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_topic forum_topics%ROWTYPE;
  v_is_admin boolean;
BEGIN
  v_is_admin := is_imo_admin() OR is_super_admin();

  IF p_title IS NULL OR char_length(trim(p_title)) < 8 OR char_length(trim(p_title)) > 180 THEN
    RAISE EXCEPTION 'Title must be between 8 and 180 characters';
  END IF;

  IF p_body_markdown IS NULL OR char_length(trim(p_body_markdown)) < 1 OR char_length(p_body_markdown) > 20000 THEN
    RAISE EXCEPTION 'Body must be between 1 and 20000 characters';
  END IF;

  SELECT *
  INTO v_topic
  FROM forum_topics ft
  WHERE ft.id = p_topic_id
    AND ft.imo_id = get_my_imo_id()
  LIMIT 1;

  IF v_topic.id IS NULL THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  IF NOT v_is_admin AND v_topic.author_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only topic author can edit this topic';
  END IF;

  IF NOT v_is_admin AND (v_topic.is_deleted OR v_topic.status NOT IN ('open', 'resolved')) THEN
    RAISE EXCEPTION 'Topic cannot be edited in current state';
  END IF;

  UPDATE forum_topics
  SET
    title = trim(p_title),
    body_markdown = p_body_markdown
  WHERE id = v_topic.id
    AND imo_id = v_topic.imo_id
  RETURNING forum_topics.id, forum_topics.title, forum_topics.body_markdown, forum_topics.updated_at
  INTO v_topic.id, v_topic.title, v_topic.body_markdown, v_topic.updated_at;

  RETURN QUERY
  SELECT v_topic.id, v_topic.title, v_topic.body_markdown, v_topic.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_update_post_v1(
  p_post_id uuid,
  p_body_markdown text
)
RETURNS TABLE (
  id uuid,
  body_markdown text,
  edited_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_post forum_posts%ROWTYPE;
  v_is_admin boolean;
BEGIN
  v_is_admin := is_imo_admin() OR is_super_admin();

  IF p_body_markdown IS NULL OR char_length(trim(p_body_markdown)) < 1 OR char_length(p_body_markdown) > 20000 THEN
    RAISE EXCEPTION 'Reply must be between 1 and 20000 characters';
  END IF;

  SELECT *
  INTO v_post
  FROM forum_posts fp
  WHERE fp.id = p_post_id
    AND fp.imo_id = get_my_imo_id()
  LIMIT 1;

  IF v_post.id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF NOT v_is_admin AND v_post.author_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only post author can edit this post';
  END IF;

  IF NOT v_is_admin AND v_post.is_deleted THEN
    RAISE EXCEPTION 'Post cannot be edited in current state';
  END IF;

  UPDATE forum_posts
  SET
    body_markdown = p_body_markdown,
    edited_at = now()
  WHERE id = v_post.id
    AND imo_id = v_post.imo_id
  RETURNING forum_posts.id, forum_posts.body_markdown, forum_posts.edited_at, forum_posts.updated_at
  INTO v_post.id, v_post.body_markdown, v_post.edited_at, v_post.updated_at;

  RETURN QUERY
  SELECT v_post.id, v_post.body_markdown, v_post.edited_at, v_post.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_set_topic_status_v1(
  p_topic_id uuid,
  p_status text
)
RETURNS TABLE (
  id uuid,
  status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_topic forum_topics%ROWTYPE;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Only moderators can change topic status';
  END IF;

  IF p_status NOT IN ('open', 'resolved', 'locked', 'archived') THEN
    RAISE EXCEPTION 'Invalid topic status';
  END IF;

  UPDATE forum_topics
  SET status = p_status
  WHERE id = p_topic_id
    AND imo_id = get_my_imo_id()
  RETURNING * INTO v_topic;

  IF v_topic.id IS NULL THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  RETURN QUERY
  SELECT v_topic.id, v_topic.status, v_topic.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_set_accepted_post_v1(
  p_topic_id uuid,
  p_post_id uuid
)
RETURNS TABLE (
  id uuid,
  accepted_post_id uuid,
  status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_topic forum_topics%ROWTYPE;
BEGIN
  SELECT *
  INTO v_topic
  FROM forum_topics ft
  WHERE ft.id = p_topic_id
    AND ft.imo_id = get_my_imo_id()
  LIMIT 1;

  IF v_topic.id IS NULL THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  IF NOT (
    v_topic.author_id = auth.uid()
    OR is_imo_admin()
    OR is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Only topic author or moderator can set accepted answer';
  END IF;

  IF v_topic.status = 'archived' THEN
    RAISE EXCEPTION 'Archived topic cannot be modified';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM forum_posts fp
    WHERE fp.id = p_post_id
      AND fp.topic_id = p_topic_id
      AND fp.imo_id = get_my_imo_id()
      AND fp.is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Accepted post must belong to topic and be active';
  END IF;

  UPDATE forum_topics
  SET
    accepted_post_id = p_post_id,
    status = CASE WHEN status = 'open' THEN 'resolved' ELSE status END
  WHERE id = v_topic.id
    AND imo_id = v_topic.imo_id
  RETURNING * INTO v_topic;

  RETURN QUERY
  SELECT v_topic.id, v_topic.accepted_post_id, v_topic.status, v_topic.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_toggle_follow_topic_v1(
  p_topic_id uuid,
  p_follow boolean
)
RETURNS TABLE (
  topic_id uuid,
  user_id uuid,
  is_following boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
BEGIN
  SELECT ft.imo_id
  INTO v_imo_id
  FROM forum_topics ft
  WHERE ft.id = p_topic_id
    AND ft.imo_id = get_my_imo_id()
    AND ft.is_deleted = false
  LIMIT 1;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  IF p_follow THEN
    INSERT INTO forum_topic_follows (imo_id, topic_id, user_id)
    VALUES (v_imo_id, p_topic_id, auth.uid())
    ON CONFLICT (topic_id, user_id) DO NOTHING;
  ELSE
    DELETE FROM forum_topic_follows
    WHERE imo_id = v_imo_id
      AND topic_id = p_topic_id
      AND user_id = auth.uid();
  END IF;

  RETURN QUERY
  SELECT p_topic_id, auth.uid(), p_follow;
END;
$$;

CREATE OR REPLACE FUNCTION forum_set_post_vote_v1(
  p_post_id uuid,
  p_vote smallint
)
RETURNS TABLE (
  post_id uuid,
  user_id uuid,
  vote smallint,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_vote forum_post_votes%ROWTYPE;
BEGIN
  IF p_vote NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Vote must be -1 or 1';
  END IF;

  SELECT fp.imo_id
  INTO v_imo_id
  FROM forum_posts fp
  WHERE fp.id = p_post_id
    AND fp.imo_id = get_my_imo_id()
    AND fp.is_deleted = false
  LIMIT 1;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  INSERT INTO forum_post_votes (imo_id, post_id, user_id, vote)
  VALUES (v_imo_id, p_post_id, auth.uid(), p_vote)
  ON CONFLICT (post_id, user_id)
  DO UPDATE SET
    vote = EXCLUDED.vote,
    updated_at = now()
  RETURNING * INTO v_vote;

  RETURN QUERY
  SELECT v_vote.post_id, v_vote.user_id, v_vote.vote, v_vote.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_report_content_v1(
  p_entity_type text,
  p_entity_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS TABLE (
  report_id uuid,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_report forum_reports%ROWTYPE;
BEGIN
  IF p_entity_type NOT IN ('topic', 'post') THEN
    RAISE EXCEPTION 'Invalid entity_type';
  END IF;

  IF p_reason IS NULL OR char_length(trim(p_reason)) < 3 OR char_length(trim(p_reason)) > 100 THEN
    RAISE EXCEPTION 'Reason must be between 3 and 100 characters';
  END IF;

  IF p_details IS NOT NULL AND char_length(p_details) > 2000 THEN
    RAISE EXCEPTION 'Details cannot exceed 2000 characters';
  END IF;

  IF p_entity_type = 'topic' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM forum_topics ft
      WHERE ft.id = p_entity_id
        AND ft.imo_id = get_my_imo_id()
        AND ft.is_deleted = false
    ) THEN
      RAISE EXCEPTION 'Topic not found';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM forum_posts fp
      WHERE fp.id = p_entity_id
        AND fp.imo_id = get_my_imo_id()
        AND fp.is_deleted = false
    ) THEN
      RAISE EXCEPTION 'Post not found';
    END IF;
  END IF;

  INSERT INTO forum_reports (
    imo_id,
    entity_type,
    entity_id,
    reason,
    details,
    status,
    reported_by
  )
  VALUES (
    get_my_imo_id(),
    p_entity_type,
    p_entity_id,
    trim(p_reason),
    p_details,
    'open',
    auth.uid()
  )
  RETURNING * INTO v_report;

  RETURN QUERY
  SELECT v_report.id, v_report.status, v_report.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION forum_resolve_report_v1(
  p_report_id uuid,
  p_status text,
  p_resolution_note text DEFAULT NULL
)
RETURNS TABLE (
  report_id uuid,
  status text,
  assigned_to uuid,
  resolved_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_report forum_reports%ROWTYPE;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Only moderators can resolve reports';
  END IF;

  IF p_status NOT IN ('reviewing', 'actioned', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid moderation status';
  END IF;

  UPDATE forum_reports
  SET
    status = p_status,
    assigned_to = COALESCE(assigned_to, auth.uid()),
    resolution_note = p_resolution_note,
    resolved_at = CASE WHEN p_status IN ('actioned', 'dismissed') THEN now() ELSE NULL END
  WHERE id = p_report_id
    AND imo_id = get_my_imo_id()
  RETURNING * INTO v_report;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  RETURN QUERY
  SELECT v_report.id, v_report.status, v_report.assigned_to, v_report.resolved_at, v_report.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION faq_upsert_article_v1(
  p_article_id uuid DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_body_markdown text DEFAULT NULL,
  p_status text DEFAULT 'draft',
  p_source_topic_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  summary text,
  status text,
  source_topic_id uuid,
  published_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_article faq_articles%ROWTYPE;
  v_slug text;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Only moderators can manage FAQ articles';
  END IF;

  IF p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid FAQ status';
  END IF;

  IF p_title IS NULL OR char_length(trim(p_title)) < 8 OR char_length(trim(p_title)) > 180 THEN
    RAISE EXCEPTION 'Title must be between 8 and 180 characters';
  END IF;

  IF p_summary IS NULL OR char_length(trim(p_summary)) < 8 OR char_length(trim(p_summary)) > 500 THEN
    RAISE EXCEPTION 'Summary must be between 8 and 500 characters';
  END IF;

  IF p_body_markdown IS NULL OR char_length(trim(p_body_markdown)) < 1 OR char_length(p_body_markdown) > 40000 THEN
    RAISE EXCEPTION 'Body must be between 1 and 40000 characters';
  END IF;

  v_slug := lower(trim(coalesce(p_slug, '')));
  IF v_slug = '' OR v_slug !~ '^[a-z0-9-]{2,140}$' THEN
    RAISE EXCEPTION 'Invalid slug';
  END IF;

  IF p_source_topic_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM forum_topics ft
      WHERE ft.id = p_source_topic_id
        AND ft.imo_id = get_my_imo_id()
    ) THEN
      RAISE EXCEPTION 'Source topic not found in your IMO';
    END IF;
  END IF;

  IF p_article_id IS NULL THEN
    INSERT INTO faq_articles (
      imo_id,
      slug,
      title,
      summary,
      body_markdown,
      status,
      source_topic_id,
      published_by,
      published_at,
      created_by,
      updated_by
    )
    VALUES (
      get_my_imo_id(),
      v_slug,
      trim(p_title),
      trim(p_summary),
      p_body_markdown,
      p_status,
      p_source_topic_id,
      CASE WHEN p_status = 'published' THEN auth.uid() ELSE NULL END,
      CASE WHEN p_status = 'published' THEN now() ELSE NULL END,
      auth.uid(),
      auth.uid()
    )
    RETURNING * INTO v_article;
  ELSE
    UPDATE faq_articles
    SET
      slug = v_slug,
      title = trim(p_title),
      summary = trim(p_summary),
      body_markdown = p_body_markdown,
      status = p_status,
      source_topic_id = p_source_topic_id,
      updated_by = auth.uid(),
      published_by = CASE
        WHEN p_status = 'published' AND published_at IS NULL THEN auth.uid()
        ELSE published_by
      END,
      published_at = CASE
        WHEN p_status = 'published' AND published_at IS NULL THEN now()
        WHEN p_status <> 'published' THEN NULL
        ELSE published_at
      END
    WHERE id = p_article_id
      AND imo_id = get_my_imo_id()
    RETURNING * INTO v_article;

    IF v_article.id IS NULL THEN
      RAISE EXCEPTION 'FAQ article not found';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    v_article.id,
    v_article.slug,
    v_article.title,
    v_article.summary,
    v_article.status,
    v_article.source_topic_id,
    v_article.published_at,
    v_article.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION faq_publish_from_topic_v1(
  p_topic_id uuid,
  p_slug text,
  p_title text,
  p_summary text
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  status text,
  source_topic_id uuid,
  published_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_topic forum_topics%ROWTYPE;
  v_article faq_articles%ROWTYPE;
  v_slug text;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Only moderators can publish FAQ from topic';
  END IF;

  v_slug := lower(trim(coalesce(p_slug, '')));

  IF v_slug = '' OR v_slug !~ '^[a-z0-9-]{2,140}$' THEN
    RAISE EXCEPTION 'Invalid slug';
  END IF;

  IF p_title IS NULL OR char_length(trim(p_title)) < 8 OR char_length(trim(p_title)) > 180 THEN
    RAISE EXCEPTION 'Title must be between 8 and 180 characters';
  END IF;

  IF p_summary IS NULL OR char_length(trim(p_summary)) < 8 OR char_length(trim(p_summary)) > 500 THEN
    RAISE EXCEPTION 'Summary must be between 8 and 500 characters';
  END IF;

  SELECT *
  INTO v_topic
  FROM forum_topics ft
  WHERE ft.id = p_topic_id
    AND ft.imo_id = get_my_imo_id()
    AND ft.is_deleted = false
  LIMIT 1;

  IF v_topic.id IS NULL THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  INSERT INTO faq_articles (
    imo_id,
    slug,
    title,
    summary,
    body_markdown,
    status,
    source_topic_id,
    published_by,
    published_at,
    created_by,
    updated_by
  )
  VALUES (
    v_topic.imo_id,
    v_slug,
    trim(p_title),
    trim(p_summary),
    v_topic.body_markdown,
    'published',
    v_topic.id,
    auth.uid(),
    now(),
    auth.uid(),
    auth.uid()
  )
  RETURNING * INTO v_article;

  RETURN QUERY
  SELECT
    v_article.id,
    v_article.slug,
    v_article.title,
    v_article.status,
    v_article.source_topic_id,
    v_article.published_at;
END;
$$;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION forum_list_topics_v1(text, text, text, text, timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_get_topic_detail_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_list_posts_v1(uuid, timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION faq_list_articles_v1(text, timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION faq_get_article_v1(text) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_create_topic_v1(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_create_post_v1(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_update_topic_v1(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_update_post_v1(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_set_topic_status_v1(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_set_accepted_post_v1(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_toggle_follow_topic_v1(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_set_post_vote_v1(uuid, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_report_content_v1(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION forum_resolve_report_v1(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION faq_upsert_article_v1(uuid, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION faq_publish_from_topic_v1(uuid, text, text, text) TO authenticated;
