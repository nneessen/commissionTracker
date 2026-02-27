-- SBLI EasyTrak Digital Term knockout/acceptance rules
-- Product: Term (term_life)
-- Carrier ID: ae01bb32-69c1-4c82-9d08-4b6f978114bc
-- Product ID: a9d87c75-07d4-4ac6-9a74-974aa8f284be
--
-- Source: EasyTrak Digital Term Underwriting Knockout Conditions guide
-- Any condition listed = decline. These are knockout conditions within the past 5 years
-- (some have different lookback periods: cancer 10yr, felony 10yr, DUI 5yr, etc.)

DO $$
DECLARE
  v_carrier_id uuid := 'ae01bb32-69c1-4c82-9d08-4b6f978114bc';
  v_product_id uuid := 'a9d87c75-07d4-4ac6-9a74-974aa8f284be';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'term_life';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_count int := 0;
BEGIN

  -- =====================================================================
  -- V1: carrier_condition_acceptance rules (all knockouts = declined)
  -- =====================================================================

  -- ========================================
  -- MENTAL HEALTH (past 5 years)
  -- ========================================

  -- Major depression (3+ meds, lost work, or sees psychiatrist)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'depression', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Major depression requiring 3+ meds, loss of work, or psychiatrist visit (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bipolar', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Bipolar depression (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'schizophrenia', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Schizophrenia (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'severe_mental_illness', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Psychotic disorder (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'suicide_attempt', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Suicidal ideation or suicide attempt (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- DIABETES (past 5 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes', v_imo_id, 'case_by_case',
    NULL, 0.5, 'Knockout if: Insulin required OR age <40 OR age 40+ with A1C >7. Otherwise may be eligible.', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_juvenile', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Diabetes age <40', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_insulin_early', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Diabetes requiring insulin', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_uncontrolled', v_imo_id, 'declined',
    NULL, 0, 'Knockout: A1C >7 at age 40+', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- RESPIRATORY (past 5 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'asthma', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Asthma (not seasonal allergies) requiring hospital/ER/immediate care visit (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'emphysema', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Emphysema (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'copd', v_imo_id, 'declined',
    NULL, 0, 'Knockout: COPD (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- CARDIAC (past 5 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Heart disease / CAD (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_attack', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Heart attack (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_surgery', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Heart surgery (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'coronary_bypass', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Coronary artery bypass (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'valve_disorder', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Valve disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'afib', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Irregular heartbeat (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'congestive_heart_failure', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Congestive heart failure (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiomyopathy', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Cardiomyopathy (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- VASCULAR (past 5 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'stroke', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Stroke / cerebrovascular disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'tia', v_imo_id, 'declined',
    NULL, 0, 'Knockout: TIA (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'peripheral_vascular', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Peripheral vascular disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pad', v_imo_id, 'declined',
    NULL, 0, 'Knockout: PAD (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- KIDNEY/LIVER (past 5 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_kidney_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Chronic kidney disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Kidney disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cirrhosis', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Liver cirrhosis (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hepatitis_c', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Chronic hepatitis (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Liver disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pancreatitis', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Disease of the pancreas (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- NEUROLOGICAL (past 5 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'als', v_imo_id, 'declined',
    NULL, 0, 'Knockout: ALS (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alzheimers', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Alzheimer''s disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'parkinsons', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Parkinson''s disease (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dementia', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Dementia / cognitive impairment (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Degenerative muscle/nerve
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ms', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Multiple Sclerosis (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_sclerosis', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Multiple Sclerosis (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'paralysis', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Paralysis (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'muscular_dystrophy', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Muscular Dystrophy (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Seizure/epilepsy (other than simple/partial or petit mal)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'epilepsy', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Seizure/epilepsy (other than simple/partial or petit mal) (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- AUTOIMMUNE / CONNECTIVE TISSUE (past 5 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'rheumatoid_arthritis', v_imo_id, 'declined',
    NULL, 0, 'Knockout: RA with ongoing steroids or immunosuppressants (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lupus', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Lupus with ongoing steroids or immunosuppressants (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'sle_lupus', v_imo_id, 'declined',
    NULL, 0, 'Knockout: SLE Lupus with steroids/immunosuppressants (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'scleroderma', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Connective tissue disease with steroids/immunosuppressants (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- IBD (past 5 years, with hospitalization in 2yr)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ulcerative_colitis', v_imo_id, 'declined',
    NULL, 0, 'Knockout: UC with hospitalization or ER/immediate care visit in past 2yr', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'crohns', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Crohn''s with hospitalization or ER/immediate care visit in past 2yr', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- CANCER (past 10 years)
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Cancer (excluding basal/squamous cell carcinoma) in past 10yr', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'leukemia', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Leukemia (past 10yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'melanoma', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Melanoma (past 10yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lymphoma', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Lymphoma (past 10yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'internal_cancer', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Internal cancer (past 10yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- HIV/AIDS
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_aids', v_imo_id, 'declined',
    NULL, 0, 'Knockout: HIV/AIDS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aids', v_imo_id, 'declined',
    NULL, 0, 'Knockout: AIDS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_positive', v_imo_id, 'declined',
    NULL, 0, 'Knockout: HIV Positive', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- LIFESTYLE RISKS
  -- ========================================

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alcohol_abuse', v_imo_id, 'declined',
    NULL, 0, 'Knockout: >20 drinks/week OR counseling/treatment for alcohol recommended (past 7yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'drug_abuse', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Narcotic/barbiturate/amphetamine/hallucinogen/heroin/cocaine/illegal drug use or non-prescribed meds', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'felony_conviction', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Felony conviction, pending charges, or on parole (past 10yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dui_dwi', v_imo_id, 'declined',
    NULL, 0, 'Knockout: DUI/DWI, reckless driving, license suspended/revoked (past 5yr)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Pending diagnostics
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pending_diagnostics', v_imo_id, 'declined',
    NULL, 0, 'Knockout: Awaiting test results (excl HIV/allergy/pregnancy/fertility) in past 2yr', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  RAISE NOTICE 'SBLI Term v1: inserted/updated % acceptance rules', v_count;

  -- =====================================================================
  -- V2: underwriting_rule_sets + underwriting_rules
  -- =====================================================================

  v_count := 0;

  CREATE TEMP TABLE _sbli_conditions (
    code text,
    display_name text,
    question_ref text,
    outcome_elig text DEFAULT 'ineligible',
    outcome_class text DEFAULT 'decline',
    outcome_reason text
  ) ON COMMIT DROP;

  INSERT INTO _sbli_conditions (code, display_name, question_ref, outcome_reason) VALUES
    -- Mental Health
    ('depression', 'Major Depression', '5yr', 'Major depression requiring 3+ meds, loss of work, or psychiatrist'),
    ('bipolar', 'Bipolar Depression', '5yr', 'Bipolar depression'),
    ('schizophrenia', 'Schizophrenia', '5yr', 'Schizophrenia'),
    ('severe_mental_illness', 'Psychotic Disorder', '5yr', 'Psychotic disorder'),
    ('suicide_attempt', 'Suicidal Ideation/Attempt', '5yr', 'Suicidal ideation or suicide attempt'),
    -- Diabetes
    ('diabetes_juvenile', 'Diabetes (Age <40)', '5yr', 'Diabetes age <40'),
    ('diabetes_insulin_early', 'Diabetes (Insulin)', '5yr', 'Diabetes requiring insulin'),
    ('diabetes_uncontrolled', 'Diabetes (A1C >7)', '5yr', 'Diabetes age 40+ with A1C >7'),
    -- Respiratory
    ('asthma', 'Asthma (ER/Hospital)', '5yr', 'Asthma requiring hospital/ER visit'),
    ('emphysema', 'Emphysema', '5yr', 'Emphysema'),
    ('copd', 'COPD', '5yr', 'COPD'),
    -- Cardiac
    ('heart_disease', 'Heart Disease / CAD', '5yr', 'Heart disease / coronary artery disease'),
    ('heart_attack', 'Heart Attack', '5yr', 'Heart attack'),
    ('heart_surgery', 'Heart Surgery', '5yr', 'Heart surgery'),
    ('coronary_bypass', 'Coronary Bypass', '5yr', 'Coronary artery bypass surgery'),
    ('valve_disorder', 'Valve Disease', '5yr', 'Valve disease'),
    ('afib', 'Irregular Heartbeat', '5yr', 'Irregular heartbeat / AFib'),
    ('congestive_heart_failure', 'CHF', '5yr', 'Congestive heart failure'),
    ('cardiomyopathy', 'Cardiomyopathy', '5yr', 'Cardiomyopathy'),
    -- Vascular
    ('stroke', 'Stroke', '5yr', 'Stroke / cerebrovascular disease'),
    ('tia', 'TIA', '5yr', 'Transient ischemic attack'),
    ('peripheral_vascular', 'PVD', '5yr', 'Peripheral vascular disease'),
    ('pad', 'PAD', '5yr', 'Peripheral arterial disease'),
    -- Kidney/Liver
    ('chronic_kidney_disease', 'CKD', '5yr', 'Chronic kidney disease'),
    ('kidney_disease', 'Kidney Disease', '5yr', 'Kidney disease'),
    ('cirrhosis', 'Cirrhosis', '5yr', 'Liver cirrhosis'),
    ('hepatitis_c', 'Chronic Hepatitis', '5yr', 'Chronic hepatitis'),
    ('liver_disease', 'Liver Disease', '5yr', 'Liver disease'),
    ('pancreatitis', 'Pancreatic Disease', '5yr', 'Disease of the pancreas'),
    -- Neurological
    ('als', 'ALS', '5yr', 'ALS'),
    ('alzheimers', 'Alzheimer''s', '5yr', 'Alzheimer''s disease'),
    ('parkinsons', 'Parkinson''s', '5yr', 'Parkinson''s disease'),
    ('dementia', 'Dementia', '5yr', 'Dementia / cognitive impairment'),
    ('ms', 'Multiple Sclerosis', '5yr', 'Multiple sclerosis'),
    ('multiple_sclerosis', 'Multiple Sclerosis', '5yr', 'Multiple sclerosis'),
    ('paralysis', 'Paralysis', '5yr', 'Paralysis'),
    ('muscular_dystrophy', 'Muscular Dystrophy', '5yr', 'Muscular dystrophy'),
    ('epilepsy', 'Seizure/Epilepsy', '5yr', 'Seizure/epilepsy (other than simple/partial or petit mal)'),
    -- Autoimmune
    ('rheumatoid_arthritis', 'Rheumatoid Arthritis', '5yr', 'RA with steroids/immunosuppressants'),
    ('lupus', 'Lupus', '5yr', 'Lupus with steroids/immunosuppressants'),
    ('sle_lupus', 'SLE Lupus', '5yr', 'SLE Lupus with steroids/immunosuppressants'),
    ('scleroderma', 'Scleroderma', '5yr', 'Connective tissue disease with steroids/immunosuppressants'),
    -- IBD
    ('ulcerative_colitis', 'Ulcerative Colitis', '2yr hosp', 'UC with hospitalization/ER in past 2yr'),
    ('crohns', 'Crohn''s Disease', '2yr hosp', 'Crohn''s with hospitalization/ER in past 2yr'),
    -- Cancer (10yr)
    ('cancer', 'Cancer', '10yr', 'Cancer (excl basal/squamous cell)'),
    ('leukemia', 'Leukemia', '10yr', 'Leukemia'),
    ('melanoma', 'Melanoma', '10yr', 'Melanoma'),
    ('lymphoma', 'Lymphoma', '10yr', 'Lymphoma'),
    ('internal_cancer', 'Internal Cancer', '10yr', 'Internal cancer'),
    -- HIV
    ('hiv_aids', 'HIV/AIDS', 'ever', 'HIV/AIDS'),
    ('aids', 'AIDS', 'ever', 'AIDS'),
    ('hiv_positive', 'HIV Positive', 'ever', 'HIV Positive'),
    -- Lifestyle
    ('alcohol_abuse', 'Alcohol Abuse', '7yr', '>20 drinks/week or counseling recommended'),
    ('drug_abuse', 'Drug Abuse', 'ever', 'Illegal drug use or non-prescribed medications'),
    ('felony_conviction', 'Felony', '10yr', 'Felony conviction/pending/parole'),
    ('dui_dwi', 'DUI/DWI', '5yr', 'DUI/DWI, reckless driving, license suspended/revoked'),
    ('pending_diagnostics', 'Pending Tests', '2yr', 'Awaiting test results (excl HIV/allergy/pregnancy/fertility)'),
    ('opioid_usage', 'Opioid Use', 'ever', 'Narcotic/opioid use without prescription'),
    ('kidney_failure', 'Kidney Failure', '5yr', 'Kidney failure'),
    ('angioplasty', 'Angioplasty', '5yr', 'Angioplasty'),
    ('cardiac_stent', 'Stent Placement', '5yr', 'Stent placement'),
    ('pacemaker', 'Pacemaker', '5yr', 'Pacemaker'),
    ('defibrillator', 'Defibrillator', '5yr', 'Defibrillator (ICD)'),
    ('aneurysm', 'Aneurysm', '5yr', 'Aneurysm'),
    ('hodgkins_disease', 'Hodgkin''s Disease', '10yr', 'Hodgkin''s disease'),
    ('organ_transplant', 'Organ Transplant', '5yr', 'Organ transplant'),
    ('hospice_care', 'Hospice Care', '5yr', 'Hospice care'),
    ('nursing_facility', 'Nursing Facility', '5yr', 'Nursing facility confinement'),
    ('adl_impairment', 'ADL Impairment', '5yr', 'Activities of daily living impairment'),
    ('oxygen_required', 'Oxygen Required', '5yr', 'Oxygen required for breathing'),
    ('bed_confinement', 'Bed Confinement', '5yr', 'Bed confinement'),
    ('cancer_active', 'Cancer - Active Treatment', '10yr', 'Cancer - active treatment'),
    ('cancer_metastatic', 'Cancer - Metastatic', '10yr', 'Metastatic cancer'),
    ('liver_failure', 'Liver Failure', '5yr', 'Liver failure'),
    ('mental_facility', 'Mental Facility', '5yr', 'Mental facility confinement'),
    ('chronic_lung_disease', 'Chronic Lung Disease', '5yr', 'Chronic lung disease'),
    ('cystic_fibrosis', 'Cystic Fibrosis', '5yr', 'Cystic fibrosis'),
    ('transplant_advised', 'Transplant Advised', '5yr', 'Organ transplant medically advised'),
    ('terminal_condition', 'Terminal Condition', 'ever', 'Terminal medical condition');

  -- Insert v2 rule sets
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, is_active, version, default_outcome, source, review_status, source_type, needs_review
  )
  SELECT
    gen_random_uuid(),
    v_imo_id,
    v_carrier_id,
    v_product_id,
    'condition'::rule_set_scope,
    c.code,
    'default',
    'SBLI Term - ' || c.display_name,
    'EasyTrak knockout (' || c.question_ref || '): ' || c.outcome_reason,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _sbli_conditions c
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_product_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'SBLI Term v2: inserted % new rule sets', v_count;

  -- Insert rules
  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - Knockout',
    jsonb_build_object(
      'version', 2,
      'root', jsonb_build_object(
        'type', 'condition_presence',
        'field', 'conditions',
        'operator', 'includes_any',
        'value', jsonb_build_array(c.code)
      )
    ),
    2,
    c.outcome_elig,
    c.outcome_class::health_class,
    'EasyTrak knockout (' || c.question_ref || '): ' || c.outcome_reason
  FROM underwriting_rule_sets rs
  JOIN _sbli_conditions c ON c.code = rs.condition_code
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_product_id
    AND rs.scope = 'condition'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r
      WHERE r.rule_set_id = rs.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'SBLI Term v2: inserted % new rules', v_count;

END $$;
