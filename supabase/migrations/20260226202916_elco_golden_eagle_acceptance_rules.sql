-- ELCO Mutual Golden Eagle acceptance rules
-- Product: Whole Life (simplified issue / final expense)
-- Carrier ID: a04c25c3-edd8-404a-91d8-cd39e5faf2e8
--
-- Application structure:
--   Part 1 "Yes" → DECLINE (severe/disqualifying conditions)
--   Part 2 "Yes" → GRADED BENEFIT (moderate conditions, limited benefit period)
--   All "No" → STANDARD (full benefit, immediate coverage)

DO $$
DECLARE
  v_carrier_id uuid := 'a04c25c3-edd8-404a-91d8-cd39e5faf2e8';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'whole_life';
  v_count int := 0;
BEGIN

  -- ========================================
  -- PART 1: DECLINE RULES
  -- ========================================

  -- ADL assistance
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'adl_impairment', v_imo_id, 'declined',
    NULL, 0, 'Part 1: ADL assistance required = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Insulin shock/diabetic coma/amputation/insulin before 40/diabetes before 25
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'insulin_shock', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Insulin shock = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_coma', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Diabetic coma = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_amputation', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Diabetes-related amputation = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_insulin_early', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Insulin required before age 40 = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_juvenile', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Diabetes diagnosed before age 25 = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Organ transplant/terminal illness/hospitalized/hospice
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'organ_transplant', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Organ transplant = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'terminal_condition', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Terminal illness = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospice_care', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Hospice care = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospitalization_extended', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Extended hospitalization = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Kidney disease/dialysis/kidney or liver failure/CHF/cardiomyopathy/organic brain syndrome/Alzheimer's/dementia/ALS/schizophrenia/bipolar/mental incapacity
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_dialysis', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Kidney dialysis = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_failure', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Kidney failure = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_failure', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Liver failure = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'congestive_heart_failure', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Congestive heart failure = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiomyopathy', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Cardiomyopathy = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'organic_brain_syndrome', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Organic brain syndrome = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alzheimers', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Alzheimer''s disease = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dementia', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Dementia = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'als', v_imo_id, 'declined',
    NULL, 0, 'Part 1: ALS (Lou Gehrig''s Disease) = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'schizophrenia', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Schizophrenia = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bipolar', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Bipolar disorder = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'mental_incapacity', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Mental incapacity = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- AIDS/HIV
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_aids', v_imo_id, 'declined',
    NULL, 0, 'Part 1: HIV/AIDS = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aids', v_imo_id, 'declined',
    NULL, 0, 'Part 1: AIDS = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_positive', v_imo_id, 'declined',
    NULL, 0, 'Part 1: HIV Positive = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Multiple cancers/metastasis/current cancer treatment
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_multiple', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Multiple cancers = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_metastatic', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Metastatic cancer = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_active', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Currently in cancer treatment = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Felony/probation/parole (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'felony_conviction', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Felony/probation/parole within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- DUI (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dui_dwi', v_imo_id, 'declined',
    NULL, 0, 'Part 1: DUI within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Internal cancer/leukemia/lymphoma/melanoma/Hodgkin's/Parkinson's/stroke/TIA/cirrhosis/liver disease/attempted suicide/alcohol or drug abuse (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'internal_cancer', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Internal cancer within 24 months = DECLINE. Part 2: 24-48 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'leukemia', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Leukemia within 24 months = DECLINE. Part 2: 24-48 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lymphoma', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Lymphoma within 24 months = DECLINE. Part 2: 24-48 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'melanoma', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Melanoma within 24 months = DECLINE. Part 2: 24-48 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hodgkins_disease', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Hodgkin''s disease within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'parkinsons', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Parkinson''s within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'stroke', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Stroke within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'tia', v_imo_id, 'declined',
    NULL, 0, 'Part 1: TIA within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cirrhosis', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Cirrhosis within 24 months = DECLINE. Part 2: 24-48 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_disease', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Liver disease within 24 months = DECLINE. Part 2: 24-48 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'suicide_attempt', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Attempted suicide within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alcohol_abuse', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Alcohol abuse within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'drug_abuse', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Drug abuse within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- COPD/emphysema/chronic bronchitis/oxygen (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'copd', v_imo_id, 'declined',
    NULL, 0, 'Part 1: COPD within 24 months = DECLINE. Part 2: 24-36 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'emphysema', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Emphysema within 24 months = DECLINE. Part 2: 24-36 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_bronchitis', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Chronic bronchitis within 24 months = DECLINE. Part 2: 24-36 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'oxygen_required', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Oxygen required within 24 months = DECLINE. Part 2: 24-36 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Angina/heart disease/heart attack/uncontrolled BP/heart or vascular surgery (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angina', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Angina within 24 months = DECLINE. Part 2: angioplasty/stent/angina/heart attack/heart surgery 24-36 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_disease', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Heart disease within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_attack', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Heart attack within 24 months = DECLINE. Part 2: 24-36 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hypertension_uncontrolled', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Uncontrolled blood pressure within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_surgery', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Heart/vascular surgery within 24 months = DECLINE. Part 2: 24-36 months = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'vascular_surgery', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Vascular surgery within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Neuromuscular/brain disease/MS/cystic fibrosis/lupus/paralysis (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ms', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Multiple Sclerosis within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_sclerosis', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Multiple Sclerosis within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cystic_fibrosis', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Cystic fibrosis within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lupus', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Lupus within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'paralysis', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Paralysis within 24 months = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'muscular_dystrophy', v_imo_id, 'declined',
    NULL, 0, 'Part 1: Muscular dystrophy = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- PART 2: GRADED BENEFIT RULES
  -- (Conditions not already covered by Part 1)
  -- ========================================

  -- Angioplasty/stent (36mo) - distinct from Part 1's general heart conditions
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angioplasty', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Angioplasty within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiac_stent', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Cardiac stent within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'coronary_bypass', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Coronary bypass within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Diabetic complications (36mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_neuropathy', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Diabetic complications within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_retinopathy', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Diabetic retinopathy within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_uncontrolled', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Uncontrolled diabetes within 36 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- 3+ hospitalizations (24mo)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_hospitalizations', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: 3+ hospitalizations within 24 months = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Kidney disease (Part 2 - separate from kidney_dialysis/kidney_failure which are Part 1)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_disease', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Kidney disease (non-failure/non-dialysis) = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_kidney_disease', v_imo_id, 'approved',
    'graded', 0.7, 'Part 2: Chronic kidney disease (non-failure/non-dialysis) = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  RAISE NOTICE 'ELCO Golden Eagle: inserted/updated % acceptance rules', v_count;
END $$;
