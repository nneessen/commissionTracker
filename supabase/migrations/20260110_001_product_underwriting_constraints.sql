-- Migration: Product Underwriting Constraints Helper Functions
-- Date: 2026-01-10
-- Description: Adds SQL functions for checking product underwriting constraints
--              stored in the products.metadata JSONB column

-- Function to get the maximum face amount allowed for a product given client age
-- Returns NULL if no constraints are defined (meaning unlimited)
CREATE OR REPLACE FUNCTION get_product_max_face_amount(
  p_product_id UUID,
  p_client_age INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_metadata JSONB;
  v_tier JSONB;
  v_max_face INTEGER;
BEGIN
  -- Get product metadata
  SELECT metadata INTO v_metadata
  FROM products
  WHERE id = p_product_id AND is_active = TRUE;

  IF v_metadata IS NULL THEN
    -- No metadata, check product-level max
    SELECT max_face_amount INTO v_max_face
    FROM products
    WHERE id = p_product_id;
    RETURN v_max_face;
  END IF;

  -- Check age-tiered limits first
  IF v_metadata ? 'ageTieredFaceAmounts' AND
     v_metadata->'ageTieredFaceAmounts' ? 'tiers' THEN
    FOR v_tier IN SELECT * FROM jsonb_array_elements(v_metadata->'ageTieredFaceAmounts'->'tiers')
    LOOP
      IF p_client_age >= (v_tier->>'minAge')::INTEGER AND
         p_client_age <= (v_tier->>'maxAge')::INTEGER THEN
        RETURN (v_tier->>'maxFaceAmount')::INTEGER;
      END IF;
    END LOOP;
  END IF;

  -- Fall back to product-level max_face_amount
  SELECT max_face_amount INTO v_max_face
  FROM products
  WHERE id = p_product_id;

  RETURN v_max_face;
END;
$$;

-- Function to check if client has any knockout conditions for a product
-- Returns TRUE if client should be knocked out (disqualified)
CREATE OR REPLACE FUNCTION has_knockout_condition(
  p_product_id UUID,
  p_condition_codes TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_metadata JSONB;
  v_knockout_codes TEXT[];
BEGIN
  -- Handle empty input
  IF p_condition_codes IS NULL OR array_length(p_condition_codes, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT metadata INTO v_metadata
  FROM products
  WHERE id = p_product_id AND is_active = TRUE;

  IF v_metadata IS NULL OR
     NOT (v_metadata ? 'knockoutConditions') OR
     NOT (v_metadata->'knockoutConditions' ? 'conditionCodes') THEN
    RETURN FALSE; -- No knockout conditions defined
  END IF;

  -- Extract knockout codes from JSONB
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(v_metadata->'knockoutConditions'->'conditionCodes')
  ) INTO v_knockout_codes;

  -- Check for intersection (overlap) between client conditions and knockouts
  RETURN p_condition_codes && v_knockout_codes;
END;
$$;

-- Function to get the full underwriting threshold for a product given client age
-- Returns NULL if no threshold is defined (meaning no full UW requirement)
CREATE OR REPLACE FUNCTION get_full_underwriting_threshold(
  p_product_id UUID,
  p_client_age INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_metadata JSONB;
  v_band JSONB;
  v_base_threshold INTEGER;
BEGIN
  SELECT metadata INTO v_metadata
  FROM products
  WHERE id = p_product_id AND is_active = TRUE;

  IF v_metadata IS NULL OR NOT (v_metadata ? 'fullUnderwritingThreshold') THEN
    RETURN NULL; -- No threshold defined
  END IF;

  -- Check age bands first (more specific)
  IF v_metadata->'fullUnderwritingThreshold' ? 'ageBands' THEN
    FOR v_band IN SELECT * FROM jsonb_array_elements(v_metadata->'fullUnderwritingThreshold'->'ageBands')
    LOOP
      IF p_client_age >= (v_band->>'minAge')::INTEGER AND
         p_client_age <= (v_band->>'maxAge')::INTEGER THEN
        RETURN (v_band->>'threshold')::INTEGER;
      END IF;
    END LOOP;
  END IF;

  -- Fall back to base threshold
  v_base_threshold := (v_metadata->'fullUnderwritingThreshold'->>'faceAmountThreshold')::INTEGER;
  RETURN v_base_threshold;
END;
$$;

-- Composite function to check full product eligibility
-- Returns a JSON object with eligibility details
CREATE OR REPLACE FUNCTION check_product_eligibility(
  p_product_id UUID,
  p_client_age INTEGER,
  p_requested_face_amount INTEGER,
  p_condition_codes TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product RECORD;
  v_max_face INTEGER;
  v_full_uw_threshold INTEGER;
  v_has_knockout BOOLEAN;
  v_is_eligible BOOLEAN := TRUE;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_requires_full_uw BOOLEAN := FALSE;
BEGIN
  -- Get product details
  SELECT id, name, min_age, max_age, min_face_amount, max_face_amount
  INTO v_product
  FROM products
  WHERE id = p_product_id AND is_active = TRUE;

  IF v_product.id IS NULL THEN
    RETURN jsonb_build_object(
      'isEligible', FALSE,
      'reasons', ARRAY['Product not found or inactive']
    );
  END IF;

  -- Check age eligibility
  IF v_product.min_age IS NOT NULL AND p_client_age < v_product.min_age THEN
    v_is_eligible := FALSE;
    v_reasons := array_append(v_reasons,
      format('Client age %s below minimum %s', p_client_age, v_product.min_age));
  END IF;

  IF v_product.max_age IS NOT NULL AND p_client_age > v_product.max_age THEN
    v_is_eligible := FALSE;
    v_reasons := array_append(v_reasons,
      format('Client age %s above maximum %s', p_client_age, v_product.max_age));
  END IF;

  -- Check face amount against age-tiered limits
  v_max_face := get_product_max_face_amount(p_product_id, p_client_age);
  IF v_max_face IS NOT NULL AND p_requested_face_amount > v_max_face THEN
    v_is_eligible := FALSE;
    v_reasons := array_append(v_reasons,
      format('Requested $%s exceeds max $%s for age %s',
        p_requested_face_amount, v_max_face, p_client_age));
  END IF;

  -- Check knockout conditions
  v_has_knockout := has_knockout_condition(p_product_id, p_condition_codes);
  IF v_has_knockout THEN
    v_is_eligible := FALSE;
    v_reasons := array_append(v_reasons, 'Client has knockout condition');
  END IF;

  -- Check full underwriting threshold (informational, not disqualifying)
  v_full_uw_threshold := get_full_underwriting_threshold(p_product_id, p_client_age);
  IF v_full_uw_threshold IS NOT NULL AND p_requested_face_amount > v_full_uw_threshold THEN
    v_requires_full_uw := TRUE;
  END IF;

  RETURN jsonb_build_object(
    'isEligible', v_is_eligible,
    'reasons', v_reasons,
    'maxAllowedFaceAmount', v_max_face,
    'requiresFullUnderwriting', v_requires_full_uw,
    'fullUnderwritingThreshold', v_full_uw_threshold
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_product_max_face_amount(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION has_knockout_condition(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_full_underwriting_threshold(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_product_eligibility(UUID, INTEGER, INTEGER, TEXT[]) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_product_max_face_amount IS
  'Returns the maximum face amount allowed for a product given client age. Checks age-tiered limits in metadata, falls back to product-level max_face_amount.';

COMMENT ON FUNCTION has_knockout_condition IS
  'Returns TRUE if the client has any health conditions that knock them out of eligibility for this product.';

COMMENT ON FUNCTION get_full_underwriting_threshold IS
  'Returns the face amount threshold above which full medical underwriting is required. Returns NULL if no threshold is defined.';

COMMENT ON FUNCTION check_product_eligibility IS
  'Comprehensive eligibility check combining age, face amount, and knockout conditions. Returns JSON with eligibility details.';
