-- supabase/migrations/20260110_008_fix_seed_decision_tree.sql
-- Fix the decision tree seeding function (ROW_NUMBER in aggregate error)

-- Drop and recreate the function with fixed priority assignment
CREATE OR REPLACE FUNCTION create_default_decision_tree_for_imo(p_imo_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tree_id UUID;
  v_rules JSONB;
  v_term_carriers JSONB;
  v_whole_carriers JSONB;
  v_senior_carriers JSONB;
  v_young_adult_carriers JSONB;
  v_all_carriers JSONB;
  v_high_face_carriers JSONB;
  v_low_face_carriers JSONB;
BEGIN
  -- Check if default tree already exists for this IMO
  SELECT id INTO v_tree_id
  FROM underwriting_decision_trees
  WHERE imo_id = p_imo_id AND is_default = true;

  IF v_tree_id IS NOT NULL THEN
    RETURN v_tree_id; -- Already has a default tree
  END IF;

  -- Build carrier recommendations by querying actual products
  -- Use subquery to assign row numbers first, then aggregate

  -- Term life carriers (for young adults)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'carrierId', carrier_id,
    'productIds', product_ids,
    'priority', rn
  )), '[]'::jsonb)
  INTO v_term_carriers
  FROM (
    SELECT
      c.id::text as carrier_id,
      COALESCE(prods.product_ids, '[]'::jsonb) as product_ids,
      ROW_NUMBER() OVER (ORDER BY c.name) as rn
    FROM carriers c
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(p.id::text) as product_ids
      FROM products p
      WHERE p.carrier_id = c.id
      AND p.product_type = 'term_life'
      AND p.is_active = true
      AND (p.min_age IS NULL OR p.min_age <= 35)
    ) prods
    WHERE c.is_active = true
    AND c.imo_id = p_imo_id
    AND prods.product_ids IS NOT NULL
  ) ranked;

  -- Whole life carriers
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'carrierId', carrier_id,
    'productIds', product_ids,
    'priority', rn
  )), '[]'::jsonb)
  INTO v_whole_carriers
  FROM (
    SELECT
      c.id::text as carrier_id,
      COALESCE(prods.product_ids, '[]'::jsonb) as product_ids,
      ROW_NUMBER() OVER (ORDER BY c.name) as rn
    FROM carriers c
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(p.id::text) as product_ids
      FROM products p
      WHERE p.carrier_id = c.id
      AND p.product_type = 'whole_life'
      AND p.is_active = true
    ) prods
    WHERE c.is_active = true
    AND c.imo_id = p_imo_id
    AND prods.product_ids IS NOT NULL
  ) ranked;

  -- Senior-focused carriers (max_age >= 80 or no max)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'carrierId', carrier_id,
    'productIds', product_ids,
    'priority', rn
  )), '[]'::jsonb)
  INTO v_senior_carriers
  FROM (
    SELECT
      c.id::text as carrier_id,
      COALESCE(prods.product_ids, '[]'::jsonb) as product_ids,
      ROW_NUMBER() OVER (ORDER BY c.name) as rn
    FROM carriers c
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(p.id::text) as product_ids
      FROM products p
      WHERE p.carrier_id = c.id
      AND p.is_active = true
      AND (p.max_age IS NULL OR p.max_age >= 80)
    ) prods
    WHERE c.is_active = true
    AND c.imo_id = p_imo_id
    AND prods.product_ids IS NOT NULL
  ) ranked;

  -- Young adult carriers (min_age <= 18)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'carrierId', carrier_id,
    'productIds', product_ids,
    'priority', rn
  )), '[]'::jsonb)
  INTO v_young_adult_carriers
  FROM (
    SELECT
      c.id::text as carrier_id,
      COALESCE(prods.product_ids, '[]'::jsonb) as product_ids,
      ROW_NUMBER() OVER (ORDER BY c.name) as rn
    FROM carriers c
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(p.id::text) as product_ids
      FROM products p
      WHERE p.carrier_id = c.id
      AND p.is_active = true
      AND (p.min_age IS NULL OR p.min_age <= 18)
      AND (p.max_age IS NULL OR p.max_age >= 35)
    ) prods
    WHERE c.is_active = true
    AND c.imo_id = p_imo_id
    AND prods.product_ids IS NOT NULL
  ) ranked;

  -- All carriers (fallback)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'carrierId', carrier_id,
    'productIds', product_ids,
    'priority', rn
  )), '[]'::jsonb)
  INTO v_all_carriers
  FROM (
    SELECT
      c.id::text as carrier_id,
      COALESCE(prods.product_ids, '[]'::jsonb) as product_ids,
      ROW_NUMBER() OVER (ORDER BY c.name) as rn
    FROM carriers c
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(p.id::text) as product_ids
      FROM products p
      WHERE p.carrier_id = c.id
      AND p.is_active = true
    ) prods
    WHERE c.is_active = true
    AND c.imo_id = p_imo_id
    AND prods.product_ids IS NOT NULL
  ) ranked;

  -- High face amount carriers (max_face_amount >= 500000)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'carrierId', carrier_id,
    'productIds', product_ids,
    'priority', rn
  )), '[]'::jsonb)
  INTO v_high_face_carriers
  FROM (
    SELECT
      c.id::text as carrier_id,
      COALESCE(prods.product_ids, '[]'::jsonb) as product_ids,
      ROW_NUMBER() OVER (ORDER BY c.name) as rn
    FROM carriers c
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(p.id::text) as product_ids
      FROM products p
      WHERE p.carrier_id = c.id
      AND p.is_active = true
      AND (p.max_face_amount IS NULL OR p.max_face_amount >= 500000)
    ) prods
    WHERE c.is_active = true
    AND c.imo_id = p_imo_id
    AND prods.product_ids IS NOT NULL
  ) ranked;

  -- Low face amount carriers (good for simplified issue)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'carrierId', carrier_id,
    'productIds', product_ids,
    'priority', rn
  )), '[]'::jsonb)
  INTO v_low_face_carriers
  FROM (
    SELECT
      c.id::text as carrier_id,
      COALESCE(prods.product_ids, '[]'::jsonb) as product_ids,
      ROW_NUMBER() OVER (ORDER BY c.name) as rn
    FROM carriers c
    CROSS JOIN LATERAL (
      SELECT jsonb_agg(p.id::text) as product_ids
      FROM products p
      WHERE p.carrier_id = c.id
      AND p.is_active = true
      AND (p.min_face_amount IS NULL OR p.min_face_amount <= 25000)
    ) prods
    WHERE c.is_active = true
    AND c.imo_id = p_imo_id
    AND prods.product_ids IS NOT NULL
  ) ranked;

  -- Build the rules JSON
  v_rules := jsonb_build_object('rules', jsonb_build_array(
    -- ============ AGE BAND RULES (Primary Routing) ============
    jsonb_build_object(
      'id', 'age-18-35-young-adult',
      'name', 'Young Adult (18-35)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'age', 'operator', '>=', 'value', 18),
        jsonb_build_object('field', 'age', 'operator', '<=', 'value', 35)
      )),
      'recommendations', COALESCE(v_young_adult_carriers, v_term_carriers, v_all_carriers),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'age-36-50-middle',
      'name', 'Middle Age (36-50)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'age', 'operator', '>=', 'value', 36),
        jsonb_build_object('field', 'age', 'operator', '<=', 'value', 50)
      )),
      'recommendations', COALESCE(v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'age-51-65-presenior',
      'name', 'Pre-Senior (51-65)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'age', 'operator', '>=', 'value', 51),
        jsonb_build_object('field', 'age', 'operator', '<=', 'value', 65)
      )),
      'recommendations', COALESCE(v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'age-66-plus-senior',
      'name', 'Senior (66+)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'age', 'operator', '>=', 'value', 66)
      )),
      'recommendations', COALESCE(v_senior_carriers, v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),

    -- ============ FACE AMOUNT RULES (Secondary Routing) ============
    jsonb_build_object(
      'id', 'face-under-50k',
      'name', 'Small Face (<$50K)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'face_amount', 'operator', '<', 'value', 50000)
      )),
      'recommendations', COALESCE(v_low_face_carriers, v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'face-50k-100k',
      'name', 'Medium Face ($50K-$100K)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'face_amount', 'operator', '>=', 'value', 50000),
        jsonb_build_object('field', 'face_amount', 'operator', '<=', 'value', 100000)
      )),
      'recommendations', COALESCE(v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'face-100k-250k',
      'name', 'Large Face ($100K-$250K)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'face_amount', 'operator', '>', 'value', 100000),
        jsonb_build_object('field', 'face_amount', 'operator', '<=', 'value', 250000)
      )),
      'recommendations', COALESCE(v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'face-250k-plus',
      'name', 'Jumbo Face ($250K+)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'face_amount', 'operator', '>', 'value', 250000)
      )),
      'recommendations', COALESCE(v_high_face_carriers, v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),

    -- ============ HEALTH-BASED ROUTING RULES ============
    jsonb_build_object(
      'id', 'preferred-plus-eligible',
      'name', 'Preferred Plus Eligible',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'tobacco', 'operator', '==', 'value', false),
        jsonb_build_object('field', 'bmi', 'operator', '<', 'value', 28)
      )),
      'recommendations', COALESCE(v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'tobacco-user',
      'name', 'Tobacco User',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'tobacco', 'operator', '==', 'value', true)
      )),
      'recommendations', COALESCE(v_all_carriers, '[]'::jsonb),
      'isActive', true
    ),
    jsonb_build_object(
      'id', 'high-bmi',
      'name', 'High BMI (>35)',
      'conditions', jsonb_build_object('all', jsonb_build_array(
        jsonb_build_object('field', 'bmi', 'operator', '>', 'value', 35)
      )),
      'recommendations', COALESCE(v_all_carriers, '[]'::jsonb),
      'isActive', true
    )
  ));

  -- Insert the decision tree
  INSERT INTO underwriting_decision_trees (
    imo_id,
    name,
    description,
    is_active,
    is_default,
    rules,
    created_by
  ) VALUES (
    p_imo_id,
    'Standard Underwriting Rules',
    'Default decision tree with age-based and face amount routing. Auto-populated with your carriers.',
    true,
    true,
    v_rules,
    NULL
  )
  RETURNING id INTO v_tree_id;

  RETURN v_tree_id;
END;
$$;

-- ============================================================================
-- Now seed the default trees for all existing IMOs
-- ============================================================================

DO $$
DECLARE
  v_imo RECORD;
  v_tree_id UUID;
BEGIN
  FOR v_imo IN SELECT id FROM imos LOOP
    v_tree_id := create_default_decision_tree_for_imo(v_imo.id);
    IF v_tree_id IS NOT NULL THEN
      RAISE NOTICE 'Created/found decision tree % for IMO %', v_tree_id, v_imo.id;
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION create_default_decision_tree_for_imo(UUID) IS
'Creates a default decision tree for an IMO with auto-populated carrier recommendations.
Fixed version that uses subqueries for ROW_NUMBER() before aggregation.';
