-- American Amicable Dignity Solutions (Whole Life) acceptance rules
-- Product: Dignity Solutions (whole_life)
-- Carrier ID: 045536d6-c8bc-4d47-81e3-c3831bdc8826
-- Product ID: 2320b7f8-1ba6-4cda-86c2-0c26e4f70968
--
-- Source: Dignity Solutions Impairment Guide + Prescription Reference Guide
-- 4-tier system: No Coverage / Return of Premium / Graded / Immediate
-- For v1, most restrictive tier per condition; full tier info in notes.

DO $$
DECLARE
  v_carrier_id uuid := '045536d6-c8bc-4d47-81e3-c3831bdc8826';
  v_product_id uuid := '2320b7f8-1ba6-4cda-86c2-0c26e4f70968';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'whole_life';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_count int := 0;
BEGIN

  -- =====================================================================
  -- V1: carrier_condition_acceptance rules
  -- =====================================================================

  -- ========================================
  -- NO COVERAGE conditions (= declined)
  -- These conditions are ALWAYS No Coverage regardless of criteria
  -- ========================================

  -- ADL Impairment
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'adl_impairment', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Require assistance with bathing, dressing, eating, or toileting', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- AIDS
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aids', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: AIDS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_aids', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: HIV/AIDS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_positive', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: HIV Positive', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Alzheimer's
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alzheimers', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Alzheimer''s disease', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ALS
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'als', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: ALS (Lou Gehrig''s Disease)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Bed Confinement
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bed_confinement', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Currently confined to a bed', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- CHF
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'congestive_heart_failure', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Congestive Heart Failure', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Dementia
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dementia', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Dementia', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hospice Care / Home Health Care
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospice_care', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Currently receiving hospice or home health care', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Currently Hospitalized
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospitalization_extended', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Currently hospitalized', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Kidney Dialysis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_dialysis', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Kidney Dialysis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Liver Failure / Liver Disease
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_failure', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Liver failure', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_disease', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Liver Disease tiers: Liver failure=No Coverage | 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Mental Incapacity
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'mental_incapacity', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Mental incapacity', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Nursing Facility
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'nursing_facility', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Currently confined to nursing facility', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Organ Transplant
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'organ_transplant', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Had or been medically advised to have organ transplant', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'transplant_advised', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Organ transplant medically advised', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Oxygen Equipment
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'oxygen_required', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Oxygen tiers: Currently using=No Coverage | Required within past 2yr=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Terminal Condition
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'terminal_condition', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Terminal condition expected to result in death in next 12 months', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cerebral Palsy / Down Syndrome
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cerebral_palsy', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Down Syndrome / developmental disability', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- TIERED conditions (case_by_case with notes)
  -- ========================================

  -- Alcohol Abuse
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alcohol_abuse', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Within past 2yr=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Drug Abuse
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'drug_abuse', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Within past 2yr=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Angina
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angina', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Angina tiers: 2yr diagnosed/treated=Return of Premium | 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Angioplasty
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angioplasty', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Angioplasty tiers: Within 2yr=Return of Premium | Within 3yr=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Aneurysm
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aneurysm', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Aneurysm tiers: Within 2yr=Return of Premium | Within 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cancer
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Cancer tiers: Currently have=No Coverage | Multiple occurrences=Return of Premium | Within 2yr=Return of Premium | Within 3yr=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_multiple', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Multiple cancer occurrences=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_active', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Currently have cancer', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'leukemia', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Leukemia: same cancer tiers apply', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'melanoma', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Melanoma: same cancer tiers apply', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lymphoma', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Lymphoma: same cancer tiers apply', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'internal_cancer', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Internal cancer: same cancer tiers apply', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hodgkins_disease', v_imo_id, 'case_by_case',
    NULL, 0.2, 'Hodgkin''s: same cancer tiers apply', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cardiomyopathy
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiomyopathy', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Cardiomyopathy: Ever diagnosed/treated=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Chronic Bronchitis / COPD / Emphysema
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'copd', v_imo_id, 'case_by_case',
    NULL, 0.3, 'COPD tiers: 2yr diagnosed/treated=Return of Premium | 3yr diagnosed/treated/hospitalized/medicated=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_bronchitis', v_imo_id, 'case_by_case',
    NULL, 0.3, 'See COPD tiers', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'emphysema', v_imo_id, 'case_by_case',
    NULL, 0.3, 'See COPD tiers', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cirrhosis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cirrhosis', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Cirrhosis tiers: 2yr diagnosed/treated=Return of Premium | 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Coronary Bypass
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'coronary_bypass', v_imo_id, 'case_by_case',
    NULL, 0.3, 'CABG tiers: Within 2yr=Return of Premium | Within 3yr=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cardiac Stent
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiac_stent', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Stent tiers: Within 2yr=Return of Premium | Within 3yr=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Vascular Surgery / Circulatory Surgery
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'vascular_surgery', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Circulatory Surgery tiers: Within 2yr=Return of Premium | Within 3yr=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Crohn's Disease
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'crohns', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Crohn''s: Diagnosed prior to age 20 or within past 12mo=No Coverage (see impairment guide)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Defibrillator
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'defibrillator', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Defibrillator: Inserted within 2yr=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Diabetes (tiered)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes', v_imo_id, 'case_by_case',
    NULL, 0.4, 'Diabetes tiers: With complications (retinopathy/nephropathy/neuropathy)=Return of Premium | Insulin prior to age 50=Return of Premium | Insulin shock/diabetic coma=Return of Premium | Controlled with oral meds only=Immediate', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_retinopathy', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Diabetes with retinopathy=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_neuropathy', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Diabetes with neuropathy=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_insulin_early', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Insulin taken prior to age 50=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Heart Attack
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_attack', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Heart Attack tiers: Within 2yr=Return of Premium | Within 3yr=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Heart Surgery
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_surgery', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Heart Surgery tiers: Within 2yr=Return of Premium | Within 3yr=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hepatitis C
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hepatitis_c', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Hepatitis C tiers: 2yr diagnosed/treated=Return of Premium | 3yr diagnosed/treated/hospitalized/medicated=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Chronic Kidney Disease / Kidney Failure / Kidney Disease
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_kidney_disease', v_imo_id, 'case_by_case',
    NULL, 0.3, 'CKD: Diagnosed/treated/medicated=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_disease', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Kidney disease (dialysis/insufficiency/failure/polycystic/transplant)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_failure', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Kidney Failure: Diagnosed/treated/medicated=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- MS
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ms', v_imo_id, 'case_by_case',
    NULL, 0.3, 'MS: 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_sclerosis', v_imo_id, 'case_by_case',
    NULL, 0.3, 'MS: 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Muscular Dystrophy
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'muscular_dystrophy', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Muscular Dystrophy: 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Pacemaker
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pacemaker', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Pacemaker: Inserted within 2yr=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Paralysis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'paralysis', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Paralysis of 2+ extremities: 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Pancreatitis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pancreatitis', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Chronic Pancreatitis: 2yr diagnosed/treated=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Parkinson's
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'parkinsons', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Parkinson''s: 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Seizures / Epilepsy
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'epilepsy', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Seizures: 3yr diagnosed/treated/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Stroke
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'stroke', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Stroke tiers: 2yr diagnosed=Return of Premium | 3yr diagnosed/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- TIA
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'tia', v_imo_id, 'case_by_case',
    NULL, 0.3, 'TIA tiers: 2yr diagnosed=Return of Premium | 3yr diagnosed/hospitalized=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- SLE / Lupus
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lupus', v_imo_id, 'case_by_case',
    NULL, 0.3, 'SLE: 2yr diagnosed/treated=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'sle_lupus', v_imo_id, 'case_by_case',
    NULL, 0.3, 'SLE: 2yr diagnosed/treated=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Ulcerative Colitis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ulcerative_colitis', v_imo_id, 'case_by_case',
    NULL, 0.3, 'UC: 3yr diagnosed/treated/hospitalized/medicated=Graded', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Pending Diagnostics
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pending_diagnostics', v_imo_id, 'case_by_case',
    NULL, 0.3, 'Pending tests/surgery/hospitalization recommended within 2yr=Return of Premium', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Suicide Attempt
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'suicide_attempt', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Suicide attempt', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Rheumatoid Arthritis (only minimal/slight impairment qualifies)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'rheumatoid_arthritis', v_imo_id, 'case_by_case',
    NULL, 0.3, 'RA: Minimal/slight impairment=Immediate | All others=No Coverage (per impairment guide)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Scleroderma / Connective Tissue Disease
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'scleroderma', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Connective Tissue Disease (per impairment guide)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Schizophrenia / Severe Mental Illness
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'schizophrenia', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Schizophrenia (per impairment guide)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'severe_mental_illness', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Severe mental illness', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bipolar', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Bipolar disorder', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cystic Fibrosis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cystic_fibrosis', v_imo_id, 'declined',
    NULL, 0, 'No Coverage: Cystic Fibrosis (per impairment guide)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  RAISE NOTICE 'AA Dignity Solutions v1: inserted/updated % acceptance rules', v_count;

  -- =====================================================================
  -- V2: underwriting_rule_sets + underwriting_rules
  -- =====================================================================

  v_count := 0;

  CREATE TEMP TABLE _aa_ds_conditions (
    code text,
    display_name text,
    tier text,
    outcome_elig text,
    outcome_class text,
    outcome_reason text
  ) ON COMMIT DROP;

  INSERT INTO _aa_ds_conditions (code, display_name, tier, outcome_elig, outcome_class, outcome_reason) VALUES
    -- NO COVERAGE
    ('adl_impairment', 'ADL Impairment', 'No Coverage', 'ineligible', 'decline', 'Requires assistance with ADLs'),
    ('aids', 'AIDS', 'No Coverage', 'ineligible', 'decline', 'AIDS'),
    ('hiv_aids', 'HIV/AIDS', 'No Coverage', 'ineligible', 'decline', 'HIV/AIDS'),
    ('hiv_positive', 'HIV Positive', 'No Coverage', 'ineligible', 'decline', 'HIV Positive'),
    ('alzheimers', 'Alzheimer''s', 'No Coverage', 'ineligible', 'decline', 'Alzheimer''s disease'),
    ('als', 'ALS', 'No Coverage', 'ineligible', 'decline', 'ALS (Lou Gehrig''s Disease)'),
    ('bed_confinement', 'Bed Confinement', 'No Coverage', 'ineligible', 'decline', 'Currently confined to bed'),
    ('congestive_heart_failure', 'CHF', 'No Coverage', 'ineligible', 'decline', 'Congestive Heart Failure'),
    ('dementia', 'Dementia', 'No Coverage', 'ineligible', 'decline', 'Dementia'),
    ('hospice_care', 'Hospice/Home Health', 'No Coverage', 'ineligible', 'decline', 'Hospice or home health care'),
    ('hospitalization_extended', 'Hospitalized', 'No Coverage', 'ineligible', 'decline', 'Currently hospitalized'),
    ('kidney_dialysis', 'Kidney Dialysis', 'No Coverage', 'ineligible', 'decline', 'Kidney dialysis'),
    ('kidney_disease', 'Kidney Disease', 'No Coverage', 'ineligible', 'decline', 'Kidney disease (dialysis/insufficiency/failure)'),
    ('liver_failure', 'Liver Failure', 'No Coverage', 'ineligible', 'decline', 'Liver failure'),
    ('mental_incapacity', 'Mental Incapacity', 'No Coverage', 'ineligible', 'decline', 'Mental incapacity'),
    ('nursing_facility', 'Nursing Facility', 'No Coverage', 'ineligible', 'decline', 'Confined to nursing facility'),
    ('organ_transplant', 'Organ Transplant', 'No Coverage', 'ineligible', 'decline', 'Organ transplant'),
    ('transplant_advised', 'Transplant Advised', 'No Coverage', 'ineligible', 'decline', 'Transplant medically advised'),
    ('terminal_condition', 'Terminal Condition', 'No Coverage', 'ineligible', 'decline', 'Terminal condition (12mo)'),
    ('cerebral_palsy', 'Down Syndrome', 'No Coverage', 'ineligible', 'decline', 'Down Syndrome / developmental disability'),
    ('suicide_attempt', 'Suicide Attempt', 'No Coverage', 'ineligible', 'decline', 'Suicide attempt'),
    ('schizophrenia', 'Schizophrenia', 'No Coverage', 'ineligible', 'decline', 'Schizophrenia'),
    ('severe_mental_illness', 'Severe Mental Illness', 'No Coverage', 'ineligible', 'decline', 'Severe mental illness'),
    ('bipolar', 'Bipolar Disorder', 'No Coverage', 'ineligible', 'decline', 'Bipolar disorder'),
    ('cancer_active', 'Active Cancer', 'No Coverage', 'ineligible', 'decline', 'Currently have cancer'),
    ('scleroderma', 'Connective Tissue Disease', 'No Coverage', 'ineligible', 'decline', 'Connective tissue disease'),
    ('cystic_fibrosis', 'Cystic Fibrosis', 'No Coverage', 'ineligible', 'decline', 'Cystic fibrosis'),
    -- RETURN OF PREMIUM (most restrictive tier for tiered conditions)
    ('alcohol_abuse', 'Alcohol Abuse', 'Return of Premium', 'eligible', 'modified', 'Within 2yr: Return of Premium'),
    ('drug_abuse', 'Drug Abuse', 'Return of Premium', 'eligible', 'modified', 'Within 2yr: Return of Premium'),
    ('angina', 'Angina', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('angioplasty', 'Angioplasty', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('aneurysm', 'Aneurysm', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('cancer', 'Cancer', 'Tiered', 'eligible', 'modified', 'Current=No Coverage, Multiple=RoP, 2yr=RoP, 3yr=Graded'),
    ('cancer_multiple', 'Multiple Cancer', 'Return of Premium', 'eligible', 'modified', 'Multiple occurrences=RoP'),
    ('cardiomyopathy', 'Cardiomyopathy', 'Return of Premium', 'eligible', 'modified', 'Ever diagnosed=Return of Premium'),
    ('copd', 'COPD', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('chronic_bronchitis', 'Chronic Bronchitis', 'Tiered', 'eligible', 'modified', 'See COPD tiers'),
    ('emphysema', 'Emphysema', 'Tiered', 'eligible', 'modified', 'See COPD tiers'),
    ('cirrhosis', 'Cirrhosis', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('coronary_bypass', 'CABG', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('cardiac_stent', 'Cardiac Stent', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('vascular_surgery', 'Circulatory Surgery', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('defibrillator', 'Defibrillator', 'Return of Premium', 'eligible', 'modified', '2yr=RoP'),
    ('diabetes', 'Diabetes', 'Tiered', 'eligible', 'modified', 'With complications=RoP, Oral meds only=Immediate'),
    ('diabetic_retinopathy', 'Diabetic Retinopathy', 'Return of Premium', 'eligible', 'modified', 'Diabetes with retinopathy=RoP'),
    ('diabetic_neuropathy', 'Diabetic Neuropathy', 'Return of Premium', 'eligible', 'modified', 'Diabetes with neuropathy=RoP'),
    ('diabetes_insulin_early', 'Insulin Before 50', 'Return of Premium', 'eligible', 'modified', 'Insulin prior to age 50=RoP'),
    ('heart_attack', 'Heart Attack', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('heart_surgery', 'Heart Surgery', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('hepatitis_c', 'Hepatitis C', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('chronic_kidney_disease', 'CKD', 'Return of Premium', 'eligible', 'modified', 'Diagnosed/treated=RoP'),
    ('kidney_failure', 'Kidney Failure', 'Return of Premium', 'eligible', 'modified', 'Diagnosed/treated=RoP'),
    ('pacemaker', 'Pacemaker', 'Return of Premium', 'eligible', 'modified', '2yr=RoP'),
    ('pending_diagnostics', 'Pending Tests', 'Return of Premium', 'eligible', 'modified', 'Pending within 2yr=RoP'),
    ('lupus', 'Lupus (SLE)', 'Return of Premium', 'eligible', 'modified', '2yr diagnosed/treated=RoP'),
    ('sle_lupus', 'SLE Lupus', 'Return of Premium', 'eligible', 'modified', '2yr diagnosed/treated=RoP'),
    ('oxygen_required', 'Oxygen Equipment', 'Tiered', 'eligible', 'modified', 'Current=No Coverage, 2yr=RoP'),
    ('pancreatitis', 'Chronic Pancreatitis', 'Return of Premium', 'eligible', 'modified', '2yr diagnosed/treated=RoP'),
    ('rheumatoid_arthritis', 'Rheumatoid Arthritis', 'Tiered', 'eligible', 'modified', 'Minimal=Immediate, Others=No Coverage'),
    ('crohns', 'Crohn''s Disease', 'Tiered', 'eligible', 'modified', 'Age<20 or 12mo=No Coverage, otherwise case by case'),
    -- GRADED (3yr lookback conditions)
    ('ms', 'Multiple Sclerosis', 'Graded', 'eligible', 'graded', '3yr diagnosed/treated/hospitalized=Graded'),
    ('multiple_sclerosis', 'Multiple Sclerosis', 'Graded', 'eligible', 'graded', '3yr diagnosed/treated/hospitalized=Graded'),
    ('muscular_dystrophy', 'Muscular Dystrophy', 'Graded', 'eligible', 'graded', '3yr diagnosed/treated/hospitalized=Graded'),
    ('paralysis', 'Paralysis', 'Graded', 'eligible', 'graded', '3yr 2+ extremities=Graded'),
    ('parkinsons', 'Parkinson''s', 'Graded', 'eligible', 'graded', '3yr diagnosed/treated/hospitalized=Graded'),
    ('epilepsy', 'Seizures', 'Graded', 'eligible', 'graded', '3yr diagnosed/treated/hospitalized=Graded'),
    ('stroke', 'Stroke', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('tia', 'TIA', 'Tiered', 'eligible', 'modified', '2yr=RoP, 3yr=Graded'),
    ('ulcerative_colitis', 'Ulcerative Colitis', 'Graded', 'eligible', 'graded', '3yr diagnosed/treated/hospitalized=Graded'),
    ('liver_disease', 'Liver Disease', 'Tiered', 'eligible', 'graded', 'Failure=No Coverage, 3yr=Graded'),
    ('leukemia', 'Leukemia', 'Tiered', 'eligible', 'modified', 'Same cancer tiers'),
    ('melanoma', 'Melanoma', 'Tiered', 'eligible', 'modified', 'Same cancer tiers'),
    ('lymphoma', 'Lymphoma', 'Tiered', 'eligible', 'modified', 'Same cancer tiers'),
    ('internal_cancer', 'Internal Cancer', 'Tiered', 'eligible', 'modified', 'Same cancer tiers'),
    ('hodgkins_disease', 'Hodgkin''s Disease', 'Tiered', 'eligible', 'modified', 'Same cancer tiers');

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
    'AA Dignity Solutions - ' || c.display_name,
    c.tier || ': ' || c.outcome_reason,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _aa_ds_conditions c
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_product_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'AA Dignity Solutions v2: inserted % new rule sets', v_count;

  -- Insert rules
  v_count := 0;

  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - ' || c.tier,
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
    c.tier || ': ' || c.outcome_reason
  FROM underwriting_rule_sets rs
  JOIN _aa_ds_conditions c ON c.code = rs.condition_code
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_product_id
    AND rs.scope = 'condition'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r
      WHERE r.rule_set_id = rs.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'AA Dignity Solutions v2: inserted % new rules', v_count;

END $$;
