-- ELCO Mutual Silver Eagle acceptance rules
-- Product: Whole Life (simplified issue / final expense)
-- Carrier ID: a04c25c3-edd8-404a-91d8-cd39e5faf2e8
-- Product type: whole_life (Silver Eagle specific rules)
--
-- This is a 5-tier system — the most granular simplified issue product:
--   Part A "Yes" → GUARANTEED ISSUE (worst benefit tier, everyone qualifies)
--   Part B "Yes" → MODIFIED BENEFIT
--   Part C "Yes" → GRADED BENEFIT
--   Part D "Yes" → STANDARD (full benefit)
--   Part E "Yes" → STANDARD PLUS (enhanced benefit)
--   All "No" → PREFERRED (best tier for this product)
--
-- NOTE: Silver Eagle and Golden Eagle are both under ELCO Mutual (same carrier_id).
-- Silver Eagle rules use product_type='whole_life' which is also used by Golden Eagle.
-- Since the unique constraint is (carrier_id, condition_code, product_type, imo_id),
-- conditions shared between products will use the Silver Eagle's tier (last write wins
-- via ON CONFLICT DO UPDATE). Silver Eagle is the more detailed product.

DO $$
DECLARE
  v_carrier_id uuid := 'a04c25c3-edd8-404a-91d8-cd39e5faf2e8';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'whole_life';
  v_count int := 0;
BEGIN

  -- ========================================
  -- PART A: GUARANTEED ISSUE
  -- (Worst benefit tier — reduced/return-of-premium benefit for 2-3 years)
  -- ========================================

  -- ADL assistance
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'adl_impairment', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: ADL assistance required = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Oxygen/quadriplegia
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'oxygen_required', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Oxygen required = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'paralysis', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Quadriplegia/paralysis = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hospitalized/bedridden/hospice/nursing home/2+ weeks hospital (12mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospitalization_extended', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Extended hospitalization within 12 months = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bed_confinement', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Bedridden = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospice_care', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Hospice care = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'nursing_facility', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Nursing home confinement = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Terminal illness (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'terminal_condition', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Terminal illness within 24 months = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- AIDS/HIV
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_aids', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: HIV/AIDS = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aids', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: AIDS = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_positive', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: HIV Positive = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Alzheimer's/dementia/memory loss/ALS/mental incapacity/Huntington's/muscular dystrophy/cystic fibrosis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alzheimers', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Alzheimer''s = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dementia', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Dementia/memory loss = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'als', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: ALS = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'mental_incapacity', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Mental incapacity = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'muscular_dystrophy', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Muscular dystrophy = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cystic_fibrosis', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Cystic fibrosis = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Liver failure/cirrhosis/CHF/cardiomyopathy/pulmonary fibrosis/ESRD/dialysis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_failure', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Liver failure = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cirrhosis', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Cirrhosis = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'congestive_heart_failure', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: CHF = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiomyopathy', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Cardiomyopathy = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_failure', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: ESRD/kidney failure = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_dialysis', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Kidney dialysis = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Multiple cancers/metastasis/recurrence (10yr)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_multiple', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Multiple cancers = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_metastatic', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Metastatic cancer = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_recurrence', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Cancer recurrence within 10 years = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Organ/bone marrow transplant/stem cell treatment
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'organ_transplant', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Organ/bone marrow transplant = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Pulmonary fibrosis (mapped to chronic_lung_disease)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_lung_disease', v_imo_id, 'approved',
    'guaranteed_issue', 1.0, 'Silver Eagle Part A: Pulmonary fibrosis = GUARANTEED ISSUE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'guaranteed_issue', approval_likelihood = 1.0, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- PART B: MODIFIED BENEFIT
  -- ========================================

  -- Advised surgery but not completed (12mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pending_diagnostics', v_imo_id, 'approved',
    'modified', 0.9, 'Silver Eagle Part B: Advised surgery not completed within 12 months = MODIFIED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'modified', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- PART C: GRADED BENEFIT
  -- ========================================

  -- Parkinson's/Lupus/Paraplegia (36mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'parkinsons', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Parkinson''s within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lupus', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Lupus within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Angina/coronary artery disease/heart surgery/bypass/angioplasty/stent/aortic aneurysm/pulmonary hypertension/pacemaker (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angina', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Angina within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_disease', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Coronary artery disease within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_surgery', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Heart surgery within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'coronary_bypass', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Coronary bypass within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angioplasty', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Angioplasty within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiac_stent', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Cardiac stent within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aneurysm', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Aortic aneurysm within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pacemaker', v_imo_id, 'approved',
    'graded', 0.85, 'Silver Eagle Part C: Pacemaker within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', approval_likelihood = 0.85, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- PART D: STANDARD (Full Benefit)
  -- ========================================

  -- Grand mal epilepsy 6+/yr (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'epilepsy', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Grand mal epilepsy 6+/yr within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Insulin-dependent diabetes (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Insulin-dependent diabetes within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Crohn's/ulcerative colitis (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'crohns', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Crohn''s disease within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ulcerative_colitis', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Ulcerative colitis within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Bipolar (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bipolar', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Bipolar disorder within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Respiratory disease/COPD/emphysema/chronic bronchitis (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'copd', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: COPD within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'emphysema', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Emphysema within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_bronchitis', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Chronic bronchitis within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Diabetes diagnosed before 25
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_juvenile', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Diabetes diagnosed before age 25 = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hospitalized for depression/PTSD/mental illness (12mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'mental_facility', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Hospitalized for depression/PTSD/mental illness within 12 months = STANDARD', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cancer surgery/chemo/radiation (48mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_active', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Cancer surgery/chemo/radiation within 48 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Atrial fib/TIA (36mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'afib', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Atrial fibrillation within 36 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'tia', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: TIA within 36 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Chronic pancreatitis/kidney disease/hepatitis/MS/sickle cell/blood disorders (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pancreatitis', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Chronic pancreatitis within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_disease', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Kidney disease within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_kidney_disease', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Chronic kidney disease within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hepatitis_c', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Hepatitis within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ms', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Multiple sclerosis within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_sclerosis', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Multiple sclerosis within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Stroke/heart attack/defibrillator (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'stroke', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Stroke within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_attack', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Heart attack within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'defibrillator', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Defibrillator within 24 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Neuropathy/retinopathy + insulin diabetes (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_neuropathy', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Diabetic neuropathy with insulin diabetes within 24 months = STANDARD', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_retinopathy', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Diabetic retinopathy with insulin diabetes within 24 months = STANDARD', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Alcohol/drug abuse (36mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alcohol_abuse', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Alcohol abuse within 36 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'drug_abuse', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Drug abuse within 36 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Felony/DUI/reckless driving (36mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'felony_conviction', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: Felony conviction within 36 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dui_dwi', v_imo_id, 'approved',
    'standard', 0.9, 'Silver Eagle Part D: DUI/DWI within 36 months = STANDARD (full benefit)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard', approval_likelihood = 0.9, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- PART E: STANDARD PLUS (Enhanced Benefit)
  -- ========================================

  -- Peripheral vascular disease (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'peripheral_vascular', v_imo_id, 'approved',
    'standard_plus', 0.95, 'Silver Eagle Part E: Peripheral vascular disease within 24 months = STANDARD PLUS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard_plus', approval_likelihood = 0.95, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Diabetic neuropathy standalone (24mo) — mapped to neuropathy since diabetic_neuropathy is used in Part D
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'neuropathy', v_imo_id, 'approved',
    'standard_plus', 0.95, 'Silver Eagle Part E: Peripheral neuropathy within 24 months = STANDARD PLUS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'standard_plus', approval_likelihood = 0.95, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  RAISE NOTICE 'ELCO Silver Eagle: inserted/updated % acceptance rules', v_count;
END $$;
