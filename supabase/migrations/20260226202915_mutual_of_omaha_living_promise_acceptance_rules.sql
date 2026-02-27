-- Mutual of Omaha Living Promise acceptance rules
-- Product: Whole Life (simplified issue / final expense)
-- Carrier ID: d619cc12-0a24-4242-9a2d-3dada1fb4b1e
--
-- Application structure:
--   Part One "Yes" → DECLINE (knockout questions for severe/recent conditions)
--   Part Two "Yes" → GRADED BENEFIT (less severe conditions, still limited benefit)
--   All "No" → STANDARD (full benefit, immediate coverage)

DO $$
DECLARE
  v_carrier_id uuid := 'd619cc12-0a24-4242-9a2d-3dada1fb4b1e';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'whole_life';
  v_count int := 0;
BEGIN

  -- ========================================
  -- PART ONE: DECLINE RULES
  -- ========================================

  -- AIDS/HIV
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_aids', v_imo_id, 'declined',
    NULL, 0, 'Part One: AIDS/HIV = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aids', v_imo_id, 'declined',
    NULL, 0, 'Part One: AIDS = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_positive', v_imo_id, 'declined',
    NULL, 0, 'Part One: HIV Positive = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Bedridden/Nursing home/Hospice
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bed_confinement', v_imo_id, 'declined',
    NULL, 0, 'Part One: Bedridden/confined to bed = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'nursing_facility', v_imo_id, 'declined',
    NULL, 0, 'Part One: Nursing home confinement = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospice_care', v_imo_id, 'declined',
    NULL, 0, 'Part One: Hospice care = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ADL assistance
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'adl_impairment', v_imo_id, 'declined',
    NULL, 0, 'Part One: Requires assistance with activities of daily living = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Alzheimer's/Dementia/ALS
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alzheimers', v_imo_id, 'declined',
    NULL, 0, 'Part One: Alzheimer''s disease = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dementia', v_imo_id, 'declined',
    NULL, 0, 'Part One: Dementia = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'als', v_imo_id, 'declined',
    NULL, 0, 'Part One: ALS (Lou Gehrig''s Disease) = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cancer (within 2 years)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer', v_imo_id, 'declined',
    NULL, 0, 'Part One: Cancer within 2 years = DECLINE. Part Two: Cancer 2-4 years ago = GRADED', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Heart disease/surgery
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_disease', v_imo_id, 'declined',
    NULL, 0, 'Part One: Heart disease/coronary artery disease = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_surgery', v_imo_id, 'declined',
    NULL, 0, 'Part One: Heart surgery history = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Pending surgery/testing
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pending_diagnostics', v_imo_id, 'declined',
    NULL, 0, 'Part One: Pending surgery or diagnostic testing = DECLINE', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- PART TWO: GRADED BENEFIT RULES
  -- ========================================

  -- Kidney disease/Lupus/Scleroderma
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_disease', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Kidney disease = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_kidney_disease', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Chronic kidney disease = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lupus', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Lupus = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'scleroderma', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Scleroderma = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Bipolar/Schizophrenia/Parkinson's/MS
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bipolar', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Bipolar disorder = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'schizophrenia', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Schizophrenia = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'parkinsons', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Parkinson''s disease = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ms', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Multiple Sclerosis = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_sclerosis', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Multiple Sclerosis = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Coronary artery disease/heart attack/bypass/angioplasty/cardiomyopathy/pacemaker/valve disease (2yr)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_attack', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Heart attack within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'coronary_bypass', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Coronary bypass surgery within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angioplasty', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Angioplasty within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiomyopathy', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Cardiomyopathy within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pacemaker', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Pacemaker within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'valve_disorder', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Heart valve disease within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Stroke/TIA (2yr)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'stroke', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Stroke within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'tia', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: TIA (mini-stroke) within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Felony (2yr)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'felony_conviction', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Felony conviction within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Alcohol/drug abuse (2yr)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alcohol_abuse', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Alcohol abuse within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'drug_abuse', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Drug abuse/unlawful drug use within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hospitalized for mental/nervous disorder (2yr)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'mental_facility', v_imo_id, 'approved',
    'graded', 0.7, 'Part Two: Hospitalized for mental/nervous disorder within 2 years = GRADED BENEFIT', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'approved', health_class_result = 'graded', notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  RAISE NOTICE 'Mutual of Omaha Living Promise: inserted/updated % acceptance rules', v_count;
END $$;
