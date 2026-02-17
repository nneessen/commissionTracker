-- P0 Performance Fix: get_premium_matrices_for_imo
-- Avg 1,166ms per call × 9,546 calls = 11,131 seconds total execution time.
--
-- Root cause: PostgREST wraps RPC results and applies LIMIT/OFFSET externally.
-- The full 47K-row result set is generated on EVERY paginated call, then most rows
-- are discarded. With ~48 pages, the function runs 48× for the same data.
--
-- Fix: Add native p_limit/p_offset params so the SQL itself only produces the
-- requested page. Each call now scans only its slice via the existing index.

CREATE OR REPLACE FUNCTION get_premium_matrices_for_imo(
  p_imo_id UUID,
  p_limit INT DEFAULT NULL,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  imo_id UUID,
  product_id UUID,
  age INT,
  face_amount INT,
  gender TEXT,
  tobacco_class TEXT,
  health_class TEXT,
  term_years INT,
  monthly_premium NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  product_name TEXT,
  product_type TEXT,
  carrier_id UUID,
  min_age INT,
  max_age INT,
  min_face_amount INT,
  max_face_amount INT,
  is_active BOOLEAN,
  product_metadata JSONB,
  carrier_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pm.id,
    pm.imo_id,
    pm.product_id,
    pm.age,
    pm.face_amount,
    pm.gender::TEXT,
    pm.tobacco_class::TEXT,
    pm.health_class::TEXT,
    pm.term_years,
    pm.monthly_premium,
    pm.created_at,
    pm.updated_at,
    pm.created_by,
    p.name AS product_name,
    p.product_type::TEXT,
    p.carrier_id,
    p.min_age,
    p.max_age,
    p.min_face_amount,
    p.max_face_amount,
    p.is_active,
    p.metadata AS product_metadata,
    c.name AS carrier_name
  FROM premium_matrix pm
  INNER JOIN products p ON pm.product_id = p.id AND p.is_active = true
  LEFT JOIN carriers c ON p.carrier_id = c.id
  WHERE pm.imo_id = p_imo_id
  ORDER BY pm.product_id, pm.age, pm.face_amount
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION get_premium_matrices_for_imo(UUID, INT, INT) IS
'Returns premium matrix rows for an IMO with product/carrier info.
Supports native pagination via p_limit/p_offset to avoid PostgREST
re-executing the full query for each page.';

GRANT EXECUTE ON FUNCTION get_premium_matrices_for_imo(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_premium_matrices_for_imo(UUID, INT, INT) TO service_role;
