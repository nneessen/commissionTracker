-- Contracting Dashboard Recruits RPC
-- Paginates contracting data by recruit (agent) instead of by contract request row.
-- Returns nested request rows per recruit for efficient manager/trainer CRUD workflows.

CREATE OR REPLACE FUNCTION public.get_contracting_dashboard_recruits(
  p_status TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_carrier_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  recruit_id UUID,
  recruit JSONB,
  request_count INTEGER,
  status_counts JSONB,
  requested_latest DATE,
  writing_received_latest DATE,
  requests JSONB,
  total_recruit_count BIGINT,
  total_request_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 200);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_search TEXT := NULLIF(BTRIM(p_search_query), '');
BEGIN
  RETURN QUERY
  WITH filtered AS MATERIALIZED (
    SELECT
      ccr.*,
      up.first_name AS recruit_first_name,
      up.last_name AS recruit_last_name,
      up.email AS recruit_email,
      up.contract_level AS recruit_contract_level,
      c.name AS carrier_name,
      c.contracting_metadata AS carrier_contracting_metadata,
      c.commission_structure AS carrier_commission_structure
    FROM public.carrier_contract_requests ccr
    JOIN public.user_profiles up
      ON up.id = ccr.recruit_id
    LEFT JOIN public.carriers c
      ON c.id = ccr.carrier_id
    WHERE
      (
        p_status IS NULL
        OR cardinality(p_status) = 0
        OR ccr.status = ANY (p_status)
      )
      AND (p_start_date IS NULL OR ccr.requested_date >= p_start_date)
      AND (p_end_date IS NULL OR ccr.requested_date <= p_end_date)
      AND (p_carrier_id IS NULL OR ccr.carrier_id = p_carrier_id)
      AND (
        v_search IS NULL
        OR COALESCE(up.first_name, '') ILIKE ('%' || v_search || '%')
        OR COALESCE(up.last_name, '') ILIKE ('%' || v_search || '%')
        OR COALESCE(up.email, '') ILIKE ('%' || v_search || '%')
        OR COALESCE(c.name, '') ILIKE ('%' || v_search || '%')
        OR COALESCE(ccr.writing_number, '') ILIKE ('%' || v_search || '%')
      )
  ),
  recruit_rollups AS MATERIALIZED (
    SELECT
      f.recruit_id,
      jsonb_build_object(
        'id', f.recruit_id,
        'first_name', MAX(f.recruit_first_name),
        'last_name', MAX(f.recruit_last_name),
        'email', MAX(f.recruit_email),
        'contract_level', MAX(f.recruit_contract_level)
      ) AS recruit,
      COUNT(*)::INTEGER AS request_count,
      MAX(f.requested_date) AS requested_latest,
      MAX(f.writing_received_date) AS writing_received_latest
    FROM filtered f
    GROUP BY f.recruit_id
  ),
  recruit_counts AS (
    SELECT COUNT(*)::BIGINT AS total_recruit_count
    FROM recruit_rollups
  ),
  request_counts AS (
    SELECT COUNT(*)::BIGINT AS total_request_count
    FROM filtered
  ),
  paged_recruits AS MATERIALIZED (
    SELECT rr.*
    FROM recruit_rollups rr
    ORDER BY
      rr.requested_latest DESC NULLS LAST,
      COALESCE(rr.recruit->>'last_name', '') ASC,
      COALESCE(rr.recruit->>'first_name', '') ASC,
      rr.recruit_id ASC
    OFFSET v_offset
    LIMIT v_page_size
  ),
  page_rows AS (
    SELECT
      pr.recruit_id,
      pr.recruit,
      pr.request_count,
      COALESCE(sc.status_counts, '{}'::JSONB) AS status_counts,
      pr.requested_latest,
      pr.writing_received_latest,
      COALESCE(req.requests, '[]'::JSONB) AS requests,
      rc.total_recruit_count,
      qc.total_request_count
    FROM paged_recruits pr
    CROSS JOIN recruit_counts rc
    CROSS JOIN request_counts qc
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(s.status, s.count_by_status) AS status_counts
      FROM (
        SELECT
          f.status,
          COUNT(*)::INTEGER AS count_by_status
        FROM filtered f
        WHERE f.recruit_id = pr.recruit_id
        GROUP BY f.status
      ) s
    ) sc ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        (
          to_jsonb(f)
          - 'recruit_first_name'
          - 'recruit_last_name'
          - 'recruit_email'
          - 'recruit_contract_level'
          - 'carrier_name'
          - 'carrier_contracting_metadata'
          - 'carrier_commission_structure'
        )
        || jsonb_build_object(
          'carrier',
          CASE
            WHEN f.carrier_name IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', f.carrier_id,
              'name', f.carrier_name,
              'contracting_metadata', f.carrier_contracting_metadata,
              'commission_structure', f.carrier_commission_structure
            )
          END,
          'recruit', jsonb_build_object(
            'id', f.recruit_id,
            'first_name', f.recruit_first_name,
            'last_name', f.recruit_last_name,
            'email', f.recruit_email,
            'contract_level', f.recruit_contract_level
          ),
          'contract_document', NULL
        )
        ORDER BY
          f.requested_date DESC NULLS LAST,
          f.request_order ASC,
          COALESCE(f.carrier_name, '') ASC
      ) AS requests
      FROM filtered f
      WHERE f.recruit_id = pr.recruit_id
    ) req ON TRUE
  )
  SELECT *
  FROM page_rows

  UNION ALL

  SELECT
    NULL::UUID AS recruit_id,
    NULL::JSONB AS recruit,
    NULL::INTEGER AS request_count,
    NULL::JSONB AS status_counts,
    NULL::DATE AS requested_latest,
    NULL::DATE AS writing_received_latest,
    NULL::JSONB AS requests,
    COALESCE((SELECT total_recruit_count FROM recruit_counts), 0) AS total_recruit_count,
    COALESCE((SELECT total_request_count FROM request_counts), 0) AS total_request_count
  WHERE NOT EXISTS (SELECT 1 FROM page_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contracting_dashboard_recruits(
  TEXT[],
  DATE,
  DATE,
  TEXT,
  UUID,
  INTEGER,
  INTEGER
) TO authenticated;

COMMENT ON FUNCTION public.get_contracting_dashboard_recruits(
  TEXT[],
  DATE,
  DATE,
  TEXT,
  UUID,
  INTEGER,
  INTEGER
) IS 'Returns contracting dashboard rows paginated by recruit, with nested contract requests and page totals.';

INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_contracting_dashboard_recruits', '20260223173000')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
