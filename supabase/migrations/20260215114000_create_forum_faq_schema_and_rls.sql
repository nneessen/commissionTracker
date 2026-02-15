-- Migration: Create Forum + FAQ schema and RLS policies
-- Purpose: Add IMO-scoped community discussions and curated FAQ foundation
-- Scope: Schema + constraints + indexes + triggers + RLS

-- ============================================================================
-- 1) Helper functions
-- ============================================================================

-- Normalize markdown-ish input to plain text for search/snippets
CREATE OR REPLACE FUNCTION forum_markdown_to_plain(p_markdown text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p_markdown, ''), '<[^>]+>', ' ', 'g'),
        '[`*_>#\-\[\]\(\)!~|]', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- Generic updated_at setter
CREATE OR REPLACE FUNCTION forum_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Topic search/index materialization
CREATE OR REPLACE FUNCTION forum_set_topic_derived_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.body_plain := forum_markdown_to_plain(NEW.body_markdown);
  NEW.search_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body_plain, '')), 'B');

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Post search/index materialization
CREATE OR REPLACE FUNCTION forum_set_post_derived_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.body_plain := forum_markdown_to_plain(NEW.body_markdown);
  NEW.search_tsv := to_tsvector('english', coalesce(NEW.body_plain, ''));

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- FAQ search/index materialization
CREATE OR REPLACE FUNCTION forum_set_faq_derived_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.body_plain := forum_markdown_to_plain(NEW.body_markdown);
  NEW.search_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.body_plain, '')), 'C');

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Validate that accepted/last post references belong to the same topic + IMO
CREATE OR REPLACE FUNCTION forum_validate_topic_post_refs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.accepted_post_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM forum_posts fp
      WHERE fp.id = NEW.accepted_post_id
        AND fp.topic_id = NEW.id
        AND fp.imo_id = NEW.imo_id
    ) THEN
      RAISE EXCEPTION 'accepted_post_id must belong to the same topic and IMO';
    END IF;
  END IF;

  IF NEW.last_post_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM forum_posts fp
      WHERE fp.id = NEW.last_post_id
        AND fp.topic_id = NEW.id
        AND fp.imo_id = NEW.imo_id
    ) THEN
      RAISE EXCEPTION 'last_post_id must belong to the same topic and IMO';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Keep topic activity metadata in sync when posts change
CREATE OR REPLACE FUNCTION forum_sync_topic_activity_from_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic_id uuid;
BEGIN
  v_topic_id := COALESCE(NEW.topic_id, OLD.topic_id);

  UPDATE forum_topics ft
  SET
    reply_count = (
      SELECT COUNT(*)::integer
      FROM forum_posts fp
      WHERE fp.topic_id = v_topic_id
        AND fp.imo_id = ft.imo_id
        AND fp.is_deleted = false
    ),
    last_post_id = (
      SELECT fp.id
      FROM forum_posts fp
      WHERE fp.topic_id = v_topic_id
        AND fp.imo_id = ft.imo_id
        AND fp.is_deleted = false
      ORDER BY fp.created_at DESC, fp.id DESC
      LIMIT 1
    ),
    last_activity_at = COALESCE(
      (
        SELECT fp.created_at
        FROM forum_posts fp
        WHERE fp.topic_id = v_topic_id
          AND fp.imo_id = ft.imo_id
          AND fp.is_deleted = false
        ORDER BY fp.created_at DESC, fp.id DESC
        LIMIT 1
      ),
      ft.created_at
    ),
    updated_at = now()
  WHERE ft.id = v_topic_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 2) Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,100}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_categories_imo_slug_unique UNIQUE (imo_id, slug),
  CONSTRAINT forum_categories_id_imo_unique UNIQUE (id, imo_id)
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  category_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES user_profiles(id),
  title text NOT NULL CHECK (char_length(title) BETWEEN 8 AND 180),
  body_markdown text NOT NULL CHECK (char_length(body_markdown) BETWEEN 1 AND 20000),
  body_plain text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'locked', 'archived')),
  accepted_post_id uuid,
  reply_count integer NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_post_id uuid,
  is_pinned boolean NOT NULL DEFAULT false,
  pinned_until timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_tsv tsvector NOT NULL DEFAULT ''::tsvector,
  CONSTRAINT forum_topics_id_imo_unique UNIQUE (id, imo_id),
  CONSTRAINT forum_topics_category_imo_fkey
    FOREIGN KEY (category_id, imo_id)
    REFERENCES forum_categories(id, imo_id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES user_profiles(id),
  parent_post_id uuid REFERENCES forum_posts(id) ON DELETE SET NULL,
  body_markdown text NOT NULL CHECK (char_length(body_markdown) BETWEEN 1 AND 20000),
  body_plain text NOT NULL DEFAULT '',
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_tsv tsvector NOT NULL DEFAULT ''::tsvector,
  CONSTRAINT forum_posts_id_imo_unique UNIQUE (id, imo_id),
  CONSTRAINT forum_posts_topic_imo_fkey
    FOREIGN KEY (topic_id, imo_id)
    REFERENCES forum_topics(id, imo_id)
    ON DELETE CASCADE
);

ALTER TABLE forum_topics
  ADD CONSTRAINT forum_topics_accepted_post_imo_fkey
  FOREIGN KEY (accepted_post_id, imo_id)
  REFERENCES forum_posts(id, imo_id)
  ON DELETE SET NULL;

ALTER TABLE forum_topics
  ADD CONSTRAINT forum_topics_last_post_imo_fkey
  FOREIGN KEY (last_post_id, imo_id)
  REFERENCES forum_posts(id, imo_id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS forum_topic_follows (
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_topic_follows_pk PRIMARY KEY (topic_id, user_id),
  CONSTRAINT forum_topic_follows_topic_imo_fkey
    FOREIGN KEY (topic_id, imo_id)
    REFERENCES forum_topics(id, imo_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_post_votes (
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_post_votes_pk PRIMARY KEY (post_id, user_id),
  CONSTRAINT forum_post_votes_post_imo_fkey
    FOREIGN KEY (post_id, imo_id)
    REFERENCES forum_posts(id, imo_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('topic', 'post')),
  entity_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 100),
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  reported_by uuid NOT NULL REFERENCES user_profiles(id),
  assigned_to uuid REFERENCES user_profiles(id),
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faq_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id uuid NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,140}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 8 AND 180),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 8 AND 500),
  body_markdown text NOT NULL CHECK (char_length(body_markdown) BETWEEN 1 AND 40000),
  body_plain text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source_topic_id uuid,
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  published_by uuid REFERENCES user_profiles(id),
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  updated_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_tsv tsvector NOT NULL DEFAULT ''::tsvector,
  CONSTRAINT faq_articles_imo_slug_unique UNIQUE (imo_id, slug),
  CONSTRAINT faq_articles_topic_imo_fkey
    FOREIGN KEY (source_topic_id, imo_id)
    REFERENCES forum_topics(id, imo_id)
    ON DELETE SET NULL
);

-- ============================================================================
-- 3) Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_forum_categories_imo_id_id
  ON forum_categories (imo_id, id);
CREATE INDEX IF NOT EXISTS idx_forum_categories_imo_sort_active
  ON forum_categories (imo_id, sort_order, is_active);

CREATE INDEX IF NOT EXISTS idx_forum_topics_imo_id_id
  ON forum_topics (imo_id, id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_imo_created_at
  ON forum_topics (imo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_imo_category_last_activity
  ON forum_topics (imo_id, category_id, last_activity_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_imo_status_last_activity
  ON forum_topics (imo_id, status, last_activity_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_imo_author_created_at
  ON forum_topics (imo_id, author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_hot_feed_not_deleted
  ON forum_topics (imo_id, last_activity_at DESC, id DESC)
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_forum_topics_search_tsv
  ON forum_topics USING GIN (search_tsv);

CREATE INDEX IF NOT EXISTS idx_forum_posts_imo_id_id
  ON forum_posts (imo_id, id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_imo_created_at
  ON forum_posts (imo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_imo_topic_created_at
  ON forum_posts (imo_id, topic_id, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_imo_author_created_at
  ON forum_posts (imo_id, author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_search_tsv
  ON forum_posts USING GIN (search_tsv);

CREATE INDEX IF NOT EXISTS idx_forum_topic_follows_imo_topic
  ON forum_topic_follows (imo_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_follows_imo_user_created
  ON forum_topic_follows (imo_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_post_votes_imo_post
  ON forum_post_votes (imo_id, post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_votes_imo_user_created
  ON forum_post_votes (imo_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_reports_imo_id_id
  ON forum_reports (imo_id, id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_imo_status_created
  ON forum_reports (imo_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_reports_imo_entity
  ON forum_reports (imo_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_imo_reported_by_created
  ON forum_reports (imo_id, reported_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_faq_articles_imo_id_id
  ON faq_articles (imo_id, id);
CREATE INDEX IF NOT EXISTS idx_faq_articles_imo_created_at
  ON faq_articles (imo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_articles_imo_status_published
  ON faq_articles (imo_id, status, published_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_faq_articles_search_tsv
  ON faq_articles USING GIN (search_tsv);

-- ============================================================================
-- 4) Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_forum_categories_updated_at ON forum_categories;
CREATE TRIGGER trigger_forum_categories_updated_at
  BEFORE UPDATE ON forum_categories
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_updated_at();

DROP TRIGGER IF EXISTS trigger_forum_topics_derived_fields ON forum_topics;
CREATE TRIGGER trigger_forum_topics_derived_fields
  BEFORE INSERT OR UPDATE OF title, body_markdown ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_topic_derived_fields();

DROP TRIGGER IF EXISTS trigger_forum_topics_updated_at ON forum_topics;
CREATE TRIGGER trigger_forum_topics_updated_at
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_updated_at();

DROP TRIGGER IF EXISTS trigger_forum_topics_validate_post_refs ON forum_topics;
CREATE TRIGGER trigger_forum_topics_validate_post_refs
  BEFORE INSERT OR UPDATE OF accepted_post_id, last_post_id ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION forum_validate_topic_post_refs();

DROP TRIGGER IF EXISTS trigger_forum_posts_derived_fields ON forum_posts;
CREATE TRIGGER trigger_forum_posts_derived_fields
  BEFORE INSERT OR UPDATE OF body_markdown ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_post_derived_fields();

DROP TRIGGER IF EXISTS trigger_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER trigger_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_updated_at();

DROP TRIGGER IF EXISTS trigger_forum_posts_sync_topic_activity ON forum_posts;
CREATE TRIGGER trigger_forum_posts_sync_topic_activity
  AFTER INSERT OR UPDATE OR DELETE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION forum_sync_topic_activity_from_posts();

DROP TRIGGER IF EXISTS trigger_forum_post_votes_updated_at ON forum_post_votes;
CREATE TRIGGER trigger_forum_post_votes_updated_at
  BEFORE UPDATE ON forum_post_votes
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_updated_at();

DROP TRIGGER IF EXISTS trigger_forum_reports_updated_at ON forum_reports;
CREATE TRIGGER trigger_forum_reports_updated_at
  BEFORE UPDATE ON forum_reports
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_updated_at();

DROP TRIGGER IF EXISTS trigger_faq_articles_derived_fields ON faq_articles;
CREATE TRIGGER trigger_faq_articles_derived_fields
  BEFORE INSERT OR UPDATE OF title, summary, body_markdown ON faq_articles
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_faq_derived_fields();

DROP TRIGGER IF EXISTS trigger_faq_articles_updated_at ON faq_articles;
CREATE TRIGGER trigger_faq_articles_updated_at
  BEFORE UPDATE ON faq_articles
  FOR EACH ROW
  EXECUTE FUNCTION forum_set_updated_at();

-- ============================================================================
-- 5) RLS
-- ============================================================================

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topic_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_articles ENABLE ROW LEVEL SECURITY;

-- forum_categories
DROP POLICY IF EXISTS "forum_categories_select" ON forum_categories;
CREATE POLICY "forum_categories_select"
  ON forum_categories FOR SELECT TO authenticated
  USING ((imo_id = get_my_imo_id()) OR is_super_admin());

DROP POLICY IF EXISTS "forum_categories_manage_admin" ON forum_categories;
CREATE POLICY "forum_categories_manage_admin"
  ON forum_categories FOR ALL TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin())
  WITH CHECK ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

-- forum_topics
DROP POLICY IF EXISTS "forum_topics_select" ON forum_topics;
CREATE POLICY "forum_topics_select"
  ON forum_topics FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND (
        is_deleted = false
        OR author_id = auth.uid()
        OR is_imo_admin()
      )
    )
  );

DROP POLICY IF EXISTS "forum_topics_insert_own" ON forum_topics;
CREATE POLICY "forum_topics_insert_own"
  ON forum_topics FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND author_id = auth.uid()
      AND is_deleted = false
      AND status = 'open'
      AND accepted_post_id IS NULL
      AND last_post_id IS NULL
    )
  );

DROP POLICY IF EXISTS "forum_topics_update_own" ON forum_topics;
CREATE POLICY "forum_topics_update_own"
  ON forum_topics FOR UPDATE TO authenticated
  USING (
    imo_id = get_my_imo_id()
    AND author_id = auth.uid()
    AND is_deleted = false
    AND status IN ('open', 'resolved')
  )
  WITH CHECK (
    imo_id = get_my_imo_id()
    AND author_id = auth.uid()
    AND is_deleted = false
    AND status IN ('open', 'resolved')
  );

DROP POLICY IF EXISTS "forum_topics_moderate_admin" ON forum_topics;
CREATE POLICY "forum_topics_moderate_admin"
  ON forum_topics FOR UPDATE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin())
  WITH CHECK ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "forum_topics_delete_admin" ON forum_topics;
CREATE POLICY "forum_topics_delete_admin"
  ON forum_topics FOR DELETE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

-- forum_posts
DROP POLICY IF EXISTS "forum_posts_select" ON forum_posts;
CREATE POLICY "forum_posts_select"
  ON forum_posts FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND (
        is_deleted = false
        OR author_id = auth.uid()
        OR is_imo_admin()
      )
    )
  );

DROP POLICY IF EXISTS "forum_posts_insert_own" ON forum_posts;
CREATE POLICY "forum_posts_insert_own"
  ON forum_posts FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND author_id = auth.uid()
      AND is_deleted = false
    )
  );

DROP POLICY IF EXISTS "forum_posts_update_own" ON forum_posts;
CREATE POLICY "forum_posts_update_own"
  ON forum_posts FOR UPDATE TO authenticated
  USING (
    imo_id = get_my_imo_id()
    AND author_id = auth.uid()
    AND is_deleted = false
  )
  WITH CHECK (
    imo_id = get_my_imo_id()
    AND author_id = auth.uid()
    AND is_deleted = false
  );

DROP POLICY IF EXISTS "forum_posts_moderate_admin" ON forum_posts;
CREATE POLICY "forum_posts_moderate_admin"
  ON forum_posts FOR UPDATE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin())
  WITH CHECK ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "forum_posts_delete_admin" ON forum_posts;
CREATE POLICY "forum_posts_delete_admin"
  ON forum_posts FOR DELETE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

-- forum_topic_follows
DROP POLICY IF EXISTS "forum_topic_follows_select" ON forum_topic_follows;
CREATE POLICY "forum_topic_follows_select"
  ON forum_topic_follows FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND (user_id = auth.uid() OR is_imo_admin())
    )
  );

DROP POLICY IF EXISTS "forum_topic_follows_insert_own" ON forum_topic_follows;
CREATE POLICY "forum_topic_follows_insert_own"
  ON forum_topic_follows FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (imo_id = get_my_imo_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "forum_topic_follows_delete_own_or_admin" ON forum_topic_follows;
CREATE POLICY "forum_topic_follows_delete_own_or_admin"
  ON forum_topic_follows FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND (user_id = auth.uid() OR is_imo_admin())
    )
  );

-- forum_post_votes
DROP POLICY IF EXISTS "forum_post_votes_select" ON forum_post_votes;
CREATE POLICY "forum_post_votes_select"
  ON forum_post_votes FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND (user_id = auth.uid() OR is_imo_admin())
    )
  );

DROP POLICY IF EXISTS "forum_post_votes_insert_own" ON forum_post_votes;
CREATE POLICY "forum_post_votes_insert_own"
  ON forum_post_votes FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (imo_id = get_my_imo_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "forum_post_votes_update_own" ON forum_post_votes;
CREATE POLICY "forum_post_votes_update_own"
  ON forum_post_votes FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (imo_id = get_my_imo_id() AND user_id = auth.uid())
  )
  WITH CHECK (
    is_super_admin()
    OR (imo_id = get_my_imo_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "forum_post_votes_delete_own" ON forum_post_votes;
CREATE POLICY "forum_post_votes_delete_own"
  ON forum_post_votes FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (imo_id = get_my_imo_id() AND user_id = auth.uid())
  );

-- forum_reports
DROP POLICY IF EXISTS "forum_reports_select" ON forum_reports;
CREATE POLICY "forum_reports_select"
  ON forum_reports FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND (reported_by = auth.uid() OR is_imo_admin())
    )
  );

DROP POLICY IF EXISTS "forum_reports_insert" ON forum_reports;
CREATE POLICY "forum_reports_insert"
  ON forum_reports FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND reported_by = auth.uid()
      AND status = 'open'
      AND resolved_at IS NULL
    )
  );

DROP POLICY IF EXISTS "forum_reports_update_admin" ON forum_reports;
CREATE POLICY "forum_reports_update_admin"
  ON forum_reports FOR UPDATE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin())
  WITH CHECK ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "forum_reports_delete_admin" ON forum_reports;
CREATE POLICY "forum_reports_delete_admin"
  ON forum_reports FOR DELETE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

-- faq_articles
DROP POLICY IF EXISTS "faq_articles_select" ON faq_articles;
CREATE POLICY "faq_articles_select"
  ON faq_articles FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND (
        status = 'published'
        OR is_imo_admin()
      )
    )
  );

DROP POLICY IF EXISTS "faq_articles_insert_admin" ON faq_articles;
CREATE POLICY "faq_articles_insert_admin"
  ON faq_articles FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND is_imo_admin()
      AND created_by = auth.uid()
      AND updated_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faq_articles_update_admin" ON faq_articles;
CREATE POLICY "faq_articles_update_admin"
  ON faq_articles FOR UPDATE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin())
  WITH CHECK (
    is_super_admin()
    OR (
      imo_id = get_my_imo_id()
      AND is_imo_admin()
      AND updated_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faq_articles_delete_admin" ON faq_articles;
CREATE POLICY "faq_articles_delete_admin"
  ON faq_articles FOR DELETE TO authenticated
  USING ((imo_id = get_my_imo_id() AND is_imo_admin()) OR is_super_admin());

-- ============================================================================
-- 6) Comments
-- ============================================================================

COMMENT ON TABLE forum_categories IS
  'IMO-scoped forum categories. Managed by admins/moderators.';
COMMENT ON TABLE forum_topics IS
  'IMO-scoped forum topics. Soft-delete supported via is_deleted/deleted_at.';
COMMENT ON TABLE forum_posts IS
  'IMO-scoped forum replies/posts. Soft-delete supported via is_deleted/deleted_at.';
COMMENT ON TABLE forum_topic_follows IS
  'User follows for topic notification/preferences.';
COMMENT ON TABLE forum_post_votes IS
  'Per-user vote state for forum posts.';
COMMENT ON TABLE forum_reports IS
  'Moderation reports for topic/post content.';
COMMENT ON TABLE faq_articles IS
  'Curated FAQ articles for each IMO, optionally sourced from forum topics.';
