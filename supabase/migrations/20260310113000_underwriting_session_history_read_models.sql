BEGIN;

CREATE INDEX IF NOT EXISTS idx_underwriting_sessions_created_by_created_at
  ON public.underwriting_sessions(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_underwriting_sessions_agency_imo_created_at
  ON public.underwriting_sessions(agency_id, imo_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.list_my_underwriting_sessions_v1(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  created_at TIMESTAMPTZ,
  client_name TEXT,
  client_age INTEGER,
  client_gender TEXT,
  client_state TEXT,
  health_tier TEXT,
  requested_face_amount NUMERIC,
  requested_face_amounts JSONB,
  requested_product_types TEXT[],
  result_source TEXT,
  selected_term_years INTEGER,
  eligibility_summary JSONB,
  top_recommendation JSONB,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH search_input AS (
    SELECT
      GREATEST(COALESCE(p_page, 0), 0) AS page_number,
      GREATEST(COALESCE(p_page_size, 20), 1) AS page_size,
      NULLIF(BTRIM(p_search), '') AS search_term
  ),
  session_scope AS (
    SELECT
      s.id AS session_id,
      s.created_at,
      s.client_name,
      s.client_age,
      s.client_gender,
      s.client_state,
      s.health_tier,
      s.requested_face_amount,
      s.requested_face_amounts,
      s.requested_product_types,
      s.result_source,
      s.selected_term_years,
      s.eligibility_summary
    FROM public.underwriting_sessions AS s
    CROSS JOIN search_input AS si
    WHERE s.created_by = auth.uid()
      AND (
        si.search_term IS NULL
        OR COALESCE(s.client_name, '') ILIKE '%' || si.search_term || '%'
        OR COALESCE(s.client_state, '') ILIKE '%' || si.search_term || '%'
        OR COALESCE(s.health_tier, '') ILIKE '%' || si.search_term || '%'
      )
  ),
  page_rows AS (
    SELECT
      ss.*,
      COUNT(*) OVER () AS total_count
    FROM session_scope AS ss
    ORDER BY ss.created_at DESC
    LIMIT (SELECT page_size FROM search_input)
    OFFSET (
      SELECT page_number * page_size
      FROM search_input
    )
  )
  SELECT
    pr.session_id,
    pr.created_at,
    pr.client_name,
    pr.client_age,
    pr.client_gender,
    pr.client_state,
    pr.health_tier,
    pr.requested_face_amount,
    COALESCE(pr.requested_face_amounts, '[]'::jsonb) AS requested_face_amounts,
    COALESCE(pr.requested_product_types, '{}'::TEXT[]) AS requested_product_types,
    pr.result_source,
    pr.selected_term_years,
    COALESCE(pr.eligibility_summary, '{}'::jsonb) AS eligibility_summary,
    (
      SELECT jsonb_build_object(
        'carrierId', rec.carrier_id,
        'carrierName', COALESCE(carrier.name, 'Unknown'),
        'productId', rec.product_id,
        'productName', product.name,
        'monthlyPremium', rec.monthly_premium,
        'healthClassResult', rec.health_class_result,
        'recommendationRank', rec.recommendation_rank
      )
      FROM public.underwriting_session_recommendations AS rec
      LEFT JOIN public.carriers AS carrier
        ON carrier.id = rec.carrier_id
      LEFT JOIN public.products AS product
        ON product.id = rec.product_id
      WHERE rec.session_id = pr.session_id
      ORDER BY
        rec.recommendation_rank ASC NULLS LAST,
        rec.score DESC NULLS LAST,
        rec.created_at ASC
      LIMIT 1
    ) AS top_recommendation,
    pr.total_count
  FROM page_rows AS pr
  ORDER BY pr.created_at DESC;
$$;

COMMENT ON FUNCTION public.list_my_underwriting_sessions_v1(INTEGER, INTEGER, TEXT) IS
'Returns a paginated underwriting session history summary for the authenticated user. Uses a compact read model for list views and derives the actor from auth.uid().';

REVOKE ALL ON FUNCTION public.list_my_underwriting_sessions_v1(INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_underwriting_sessions_v1(INTEGER, INTEGER, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_agency_underwriting_sessions_v1(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  created_at TIMESTAMPTZ,
  client_name TEXT,
  client_age INTEGER,
  client_gender TEXT,
  client_state TEXT,
  health_tier TEXT,
  requested_face_amount NUMERIC,
  requested_face_amounts JSONB,
  requested_product_types TEXT[],
  result_source TEXT,
  selected_term_years INTEGER,
  eligibility_summary JSONB,
  top_recommendation JSONB,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH actor_profile AS (
    SELECT
      up.imo_id,
      up.agency_id
    FROM public.user_profiles AS up
    WHERE up.id = auth.uid()
  ),
  search_input AS (
    SELECT
      GREATEST(COALESCE(p_page, 0), 0) AS page_number,
      GREATEST(COALESCE(p_page_size, 20), 1) AS page_size,
      NULLIF(BTRIM(p_search), '') AS search_term
  ),
  session_scope AS (
    SELECT
      s.id AS session_id,
      s.created_at,
      s.client_name,
      s.client_age,
      s.client_gender,
      s.client_state,
      s.health_tier,
      s.requested_face_amount,
      s.requested_face_amounts,
      s.requested_product_types,
      s.result_source,
      s.selected_term_years,
      s.eligibility_summary
    FROM public.underwriting_sessions AS s
    INNER JOIN actor_profile AS ap
      ON ap.imo_id = s.imo_id
     AND ap.agency_id = s.agency_id
    CROSS JOIN search_input AS si
    WHERE ap.agency_id IS NOT NULL
      AND (
        si.search_term IS NULL
        OR COALESCE(s.client_name, '') ILIKE '%' || si.search_term || '%'
        OR COALESCE(s.client_state, '') ILIKE '%' || si.search_term || '%'
        OR COALESCE(s.health_tier, '') ILIKE '%' || si.search_term || '%'
      )
  ),
  page_rows AS (
    SELECT
      ss.*,
      COUNT(*) OVER () AS total_count
    FROM session_scope AS ss
    ORDER BY ss.created_at DESC
    LIMIT (SELECT page_size FROM search_input)
    OFFSET (
      SELECT page_number * page_size
      FROM search_input
    )
  )
  SELECT
    pr.session_id,
    pr.created_at,
    pr.client_name,
    pr.client_age,
    pr.client_gender,
    pr.client_state,
    pr.health_tier,
    pr.requested_face_amount,
    COALESCE(pr.requested_face_amounts, '[]'::jsonb) AS requested_face_amounts,
    COALESCE(pr.requested_product_types, '{}'::TEXT[]) AS requested_product_types,
    pr.result_source,
    pr.selected_term_years,
    COALESCE(pr.eligibility_summary, '{}'::jsonb) AS eligibility_summary,
    (
      SELECT jsonb_build_object(
        'carrierId', rec.carrier_id,
        'carrierName', COALESCE(carrier.name, 'Unknown'),
        'productId', rec.product_id,
        'productName', product.name,
        'monthlyPremium', rec.monthly_premium,
        'healthClassResult', rec.health_class_result,
        'recommendationRank', rec.recommendation_rank
      )
      FROM public.underwriting_session_recommendations AS rec
      LEFT JOIN public.carriers AS carrier
        ON carrier.id = rec.carrier_id
      LEFT JOIN public.products AS product
        ON product.id = rec.product_id
      WHERE rec.session_id = pr.session_id
      ORDER BY
        rec.recommendation_rank ASC NULLS LAST,
        rec.score DESC NULLS LAST,
        rec.created_at ASC
      LIMIT 1
    ) AS top_recommendation,
    pr.total_count
  FROM page_rows AS pr
  ORDER BY pr.created_at DESC;
$$;

COMMENT ON FUNCTION public.list_agency_underwriting_sessions_v1(INTEGER, INTEGER, TEXT) IS
'Returns a paginated underwriting session history summary for the authenticated user''s agency. The function derives IMO and agency ownership from auth.uid() and still relies on RLS for row access.';

REVOKE ALL ON FUNCTION public.list_agency_underwriting_sessions_v1(INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_agency_underwriting_sessions_v1(INTEGER, INTEGER, TEXT) TO authenticated;

COMMIT;
