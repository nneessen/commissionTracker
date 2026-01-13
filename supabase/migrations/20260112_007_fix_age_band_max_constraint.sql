-- supabase/migrations/20260112_007_fix_age_band_max_constraint.sql
-- Fix: age_band_max must be <= 120

CREATE OR REPLACE FUNCTION generate_age_rules_from_products(
  p_carrier_id uuid,
  p_imo_id uuid,
  p_user_id uuid,
  p_product_ids uuid[] DEFAULT NULL,
  p_strategy text DEFAULT 'skip_if_exists'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product record;
  v_created_count integer := 0;
  v_skipped_count integer := 0;
  v_products_processed integer := 0;
  v_rule_set_ids uuid[] := ARRAY[]::uuid[];
  v_rule_set_id uuid;
  v_existing_id uuid;
  v_default_outcome jsonb;
  v_min_age_predicate jsonb;
  v_max_age_predicate jsonb;
  v_priority integer;
  v_has_rules boolean;
BEGIN
  -- Validate strategy
  IF p_strategy NOT IN ('skip_if_exists', 'create_new_draft', 'upsert_draft') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid strategy. Must be: skip_if_exists, create_new_draft, or upsert_draft'
    );
  END IF;

  -- Verify user has access to this IMO
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id
    AND imo_id = p_imo_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not have access to this IMO'
    );
  END IF;

  -- Verify carrier belongs to IMO
  IF NOT EXISTS (
    SELECT 1 FROM carriers
    WHERE id = p_carrier_id
    AND imo_id = p_imo_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Carrier not found or does not belong to this IMO'
    );
  END IF;

  -- Default outcome
  v_default_outcome := jsonb_build_object(
    'eligibility', 'eligible',
    'healthClass', 'standard',
    'reason', 'Meets age requirements'
  );

  -- Process products
  FOR v_product IN
    SELECT id, name, min_age, max_age
    FROM products
    WHERE carrier_id = p_carrier_id
      AND is_active = true
      AND (p_product_ids IS NULL OR id = ANY(p_product_ids))
      AND (min_age IS NOT NULL OR max_age IS NOT NULL)
  LOOP
    v_products_processed := v_products_processed + 1;
    v_has_rules := false;

    -- Check for existing age rule set for this product
    SELECT id INTO v_existing_id
    FROM underwriting_rule_sets
    WHERE carrier_id = p_carrier_id
      AND imo_id = p_imo_id
      AND product_id = v_product.id
      AND scope = 'global'
      AND condition_code IS NULL
      AND source = 'imported'
      AND name LIKE 'Age Eligibility:%'
    ORDER BY version DESC NULLS LAST
    LIMIT 1;

    -- Handle based on strategy
    IF v_existing_id IS NOT NULL THEN
      IF p_strategy = 'skip_if_exists' THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      ELSIF p_strategy = 'upsert_draft' THEN
        -- Check if existing is approved
        IF EXISTS (
          SELECT 1 FROM underwriting_rule_sets
          WHERE id = v_existing_id AND review_status = 'approved'
        ) THEN
          v_skipped_count := v_skipped_count + 1;
          CONTINUE;
        END IF;
        -- Delete existing draft
        DELETE FROM underwriting_rule_sets WHERE id = v_existing_id;
      END IF;
    END IF;

    -- Create rule set for this product
    INSERT INTO underwriting_rule_sets (
      carrier_id,
      imo_id,
      product_id,
      name,
      description,
      scope,
      condition_code,
      source,
      review_status,
      created_by,
      default_outcome,
      variant,
      version
    ) VALUES (
      p_carrier_id,
      p_imo_id,
      v_product.id,
      'Age Eligibility: ' || v_product.name,
      'Auto-generated age eligibility rules for ' || v_product.name ||
        CASE
          WHEN v_product.min_age IS NOT NULL AND v_product.max_age IS NOT NULL
          THEN ' (ages ' || v_product.min_age || '-' || v_product.max_age || ')'
          WHEN v_product.min_age IS NOT NULL
          THEN ' (min age ' || v_product.min_age || ')'
          ELSE ' (max age ' || v_product.max_age || ')'
        END,
      'global',
      NULL,
      'imported',
      'draft',
      p_user_id,
      v_default_outcome,
      'generated',
      COALESCE((
        SELECT MAX(version) + 1
        FROM underwriting_rule_sets
        WHERE carrier_id = p_carrier_id
        AND product_id = v_product.id
        AND name LIKE 'Age Eligibility:%'
      ), 1)
    )
    RETURNING id INTO v_rule_set_id;

    v_priority := 1;

    -- Create min age rule if applicable (only if min_age > 0)
    IF v_product.min_age IS NOT NULL AND v_product.min_age > 0 THEN
      v_min_age_predicate := jsonb_build_object(
        'version', 2,
        'root', jsonb_build_object(
          'type', 'all',
          'children', jsonb_build_array(
            jsonb_build_object(
              'type', 'numeric',
              'field', 'client.age',
              'operator', 'lt',
              'value', v_product.min_age
            )
          )
        )
      );

      INSERT INTO underwriting_rules (
        rule_set_id,
        priority,
        name,
        description,
        predicate,
        predicate_version,
        age_band_min,
        age_band_max,
        outcome_eligibility,
        outcome_health_class,
        outcome_reason,
        outcome_concerns
      ) VALUES (
        v_rule_set_id,
        v_priority,
        'Below Minimum Age',
        'Client is below the minimum age of ' || v_product.min_age || ' for this product',
        v_min_age_predicate,
        2,
        0,
        v_product.min_age - 1,
        'ineligible',
        'decline'::health_class,
        'Client is below minimum age of ' || v_product.min_age || ' for this product',
        ARRAY['age_below_minimum']
      );

      v_priority := v_priority + 1;
      v_has_rules := true;
    END IF;

    -- Create max age rule if applicable (only if max_age < 120, otherwise no practical upper limit)
    IF v_product.max_age IS NOT NULL AND v_product.max_age < 120 THEN
      v_max_age_predicate := jsonb_build_object(
        'version', 2,
        'root', jsonb_build_object(
          'type', 'all',
          'children', jsonb_build_array(
            jsonb_build_object(
              'type', 'numeric',
              'field', 'client.age',
              'operator', 'gt',
              'value', v_product.max_age
            )
          )
        )
      );

      INSERT INTO underwriting_rules (
        rule_set_id,
        priority,
        name,
        description,
        predicate,
        predicate_version,
        age_band_min,
        age_band_max,
        outcome_eligibility,
        outcome_health_class,
        outcome_reason,
        outcome_concerns
      ) VALUES (
        v_rule_set_id,
        v_priority,
        'Above Maximum Age',
        'Client is above the maximum age of ' || v_product.max_age || ' for this product',
        v_max_age_predicate,
        2,
        v_product.max_age + 1,
        120,  -- Max allowed by constraint
        'ineligible',
        'decline'::health_class,
        'Client is above maximum age of ' || v_product.max_age || ' for this product',
        ARRAY['age_above_maximum']
      );

      v_has_rules := true;
    END IF;

    -- If no rules were created (edge cases), delete the empty rule set
    IF NOT v_has_rules THEN
      DELETE FROM underwriting_rule_sets WHERE id = v_rule_set_id;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    v_rule_set_ids := array_append(v_rule_set_ids, v_rule_set_id);
    v_created_count := v_created_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created', v_created_count,
    'skipped', v_skipped_count,
    'products_processed', v_products_processed,
    'rule_set_ids', to_jsonb(v_rule_set_ids)
  );
END;
$$;
