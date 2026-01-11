-- supabase/migrations/20260111_002_quick_quote_add_metadata.sql
-- Migration: Add product metadata to Quick Quote RPC function
-- Includes underwriting constraints (ageTieredFaceAmounts, etc.)

-- Drop existing function (needed when changing return type)
DROP FUNCTION IF EXISTS get_premium_matrices_for_imo(UUID);

CREATE OR REPLACE FUNCTION get_premium_matrices_for_imo(p_imo_id UUID)
RETURNS TABLE (
  id UUID,
  imo_id UUID,
  product_id UUID,
  age INTEGER,
  face_amount INTEGER,
  gender TEXT,
  tobacco_class TEXT,
  health_class TEXT,
  term_years INTEGER,
  monthly_premium NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  -- Product fields (flattened)
  product_name TEXT,
  product_type TEXT,
  carrier_id UUID,
  min_age INTEGER,
  max_age INTEGER,
  min_face_amount INTEGER,
  max_face_amount INTEGER,
  is_active BOOLEAN,
  product_metadata JSONB,  -- NEW: includes underwriting constraints
  -- Carrier fields
  carrier_name TEXT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
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
    p.metadata AS product_metadata,  -- NEW
    c.name AS carrier_name
  FROM premium_matrix pm
  INNER JOIN products p ON pm.product_id = p.id AND p.is_active = true
  LEFT JOIN carriers c ON p.carrier_id = c.id
  WHERE pm.imo_id = p_imo_id
  ORDER BY pm.product_id, pm.age, pm.face_amount;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_premium_matrices_for_imo(UUID) TO authenticated;

COMMENT ON FUNCTION get_premium_matrices_for_imo IS
  'Fetches all premium matrix entries for an IMO with product/carrier data.
   Includes product metadata for underwriting constraints.
   Bypasses PostgREST row limit for Quick Quote feature.';
