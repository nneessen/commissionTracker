-- supabase/migrations/20260121180000_baltimore_life_apriority_acceptance_rules.sql
-- Baltimore Life aPriority Level Term - Carrier Acceptance Rules
-- Form ICC20-8684(C) - Issue Ages 50-80, Coverage up to $150,000
--
-- Part A: Yes to any = DECLINE
-- Part B: Yes to any = SPECIAL rating class
-- Part C: Yes to any = SPECIAL rating class

-- ============================================================================
-- STEP 1: Insert Health Conditions (if not exists)
-- ============================================================================

-- ADL / Functional Impairments
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('ADL_IMPAIRMENT', 'Activities of Daily Living Impairment', 'Functional', true, 10, '{}'),
  ('HOSPITALIZATION_EXTENDED', 'Extended Hospitalization (5+ days)', 'Hospitalization', true, 8, '{}'),
  ('HOSPICE_CARE', 'Hospice Care', 'Terminal', true, 10, '{}'),
  ('NURSING_FACILITY', 'Nursing Facility Confinement', 'Hospitalization', true, 9, '{}'),
  ('BED_CONFINEMENT', 'Bed Confinement', 'Functional', true, 9, '{}')
ON CONFLICT (code) DO NOTHING;

-- Cancer Conditions
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('CANCER_ACTIVE', 'Cancer - Active Treatment', 'Cancer', true, 10, '{}'),
  ('CANCER_RECURRENCE', 'Cancer - Recurrence', 'Cancer', true, 10, '{}'),
  ('CANCER_METASTATIC', 'Cancer - Metastatic', 'Cancer', true, 10, '{}'),
  ('CANCER_MULTIPLE', 'Cancer - Multiple Occurrences', 'Cancer', true, 10, '{}'),
  ('CANCER_AMPUTATION', 'Cancer - Related Amputation', 'Cancer', true, 10, '{}'),
  ('LYMPHOMA', 'Lymphoma', 'Cancer', true, 9, '{}'),
  ('MELANOMA', 'Melanoma', 'Cancer', true, 8, '{}'),
  ('LEUKEMIA', 'Leukemia', 'Cancer', true, 9, '{}'),
  ('HODGKINS_DISEASE', 'Hodgkin''s Disease', 'Cancer', true, 9, '{}'),
  ('INTERNAL_CANCER', 'Internal Cancer', 'Cancer', true, 9, '{}')
ON CONFLICT (code) DO NOTHING;

-- Legal Issues
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('FELONY_CONVICTION', 'Felony Conviction', 'Legal', true, 10, '{}'),
  ('MISDEMEANOR_CONVICTION', 'Misdemeanor Conviction', 'Legal', true, 7, '{}'),
  ('PENDING_CHARGES', 'Pending Criminal Charges', 'Legal', true, 8, '{}'),
  ('DUI_DWI', 'DUI/DWI Conviction', 'Legal', true, 7, '{}')
ON CONFLICT (code) DO NOTHING;

-- Organ/Transplant
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('ORGAN_TRANSPLANT', 'Organ Transplant', 'Major Organ', true, 10, '{}'),
  ('TRANSPLANT_ADVISED', 'Organ Transplant - Medically Advised', 'Major Organ', true, 10, '{}'),
  ('TERMINAL_CONDITION', 'Terminal Medical Condition', 'Terminal', true, 10, '{}')
ON CONFLICT (code) DO NOTHING;

-- Kidney/Liver
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('CHRONIC_KIDNEY_DISEASE', 'Chronic Kidney Disease', 'Kidney', true, 9, '{}'),
  ('KIDNEY_DIALYSIS', 'Kidney Dialysis', 'Kidney', true, 10, '{}'),
  ('KIDNEY_FAILURE', 'Kidney Failure', 'Kidney', true, 10, '{}'),
  ('LIVER_FAILURE', 'Liver Failure', 'Liver', true, 10, '{}'),
  ('LIVER_DISEASE', 'Liver Disease', 'Liver', true, 8, '{}'),
  ('CIRRHOSIS', 'Cirrhosis', 'Liver', true, 10, '{}'),
  ('HEPATITIS_C', 'Hepatitis C', 'Liver', true, 8, '{}')
ON CONFLICT (code) DO NOTHING;

-- Cardiac Conditions
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('CONGESTIVE_HEART_FAILURE', 'Congestive Heart Failure', 'Cardiac', true, 10, '{}'),
  ('CARDIOMYOPATHY', 'Cardiomyopathy', 'Cardiac', true, 10, '{}'),
  ('ANGINA', 'Angina', 'Cardiac', true, 8, '{}'),
  ('HEART_ATTACK', 'Heart Attack / Myocardial Infarction', 'Cardiac', true, 9, '{}'),
  ('HEART_DISEASE', 'Heart Disease', 'Cardiac', true, 8, '{}'),
  ('CORONARY_BYPASS', 'Coronary Artery Bypass Surgery (CABG)', 'Cardiac Surgery', true, 9, '{}'),
  ('PACEMAKER', 'Pacemaker Placement', 'Cardiac Surgery', true, 7, '{}'),
  ('PACEMAKER_REPLACEMENT', 'Pacemaker Replacement', 'Cardiac Surgery', true, 6, '{}'),
  ('DEFIBRILLATOR', 'Defibrillator (ICD)', 'Cardiac Surgery', true, 9, '{}'),
  ('HEART_VALVE_REPLACEMENT', 'Heart Valve Replacement', 'Cardiac Surgery', true, 9, '{}'),
  ('ANGIOPLASTY', 'Angioplasty', 'Cardiac Surgery', true, 6, '{}'),
  ('CARDIAC_STENT', 'Cardiac Stent Placement', 'Cardiac Surgery', true, 6, '{}'),
  ('VASCULAR_SURGERY', 'Vascular Surgery', 'Cardiac Surgery', true, 8, '{}'),
  ('VASCULAR_GRAFT', 'Vascular Graft', 'Cardiac Surgery', true, 8, '{}'),
  ('AAA', 'Abdominal Aortic Aneurysm (AAA)', 'Cardiac', true, 9, '{}'),
  ('PAD', 'Peripheral Arterial Disease (PAD)', 'Cardiac', true, 7, '{}')
ON CONFLICT (code) DO NOTHING;

-- Neurological Conditions
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('ORGANIC_BRAIN_SYNDROME', 'Organic Brain Syndrome', 'Neurological', true, 10, '{}'),
  ('ALZHEIMERS', 'Alzheimer''s Disease', 'Neurological', true, 10, '{}'),
  ('DEMENTIA', 'Dementia', 'Neurological', true, 10, '{}'),
  ('ALS', 'ALS (Lou Gehrig''s Disease)', 'Neurological', true, 10, '{}'),
  ('PARKINSONS', 'Parkinson''s Disease', 'Neurological', true, 8, '{}'),
  ('STROKE', 'Stroke (CVA)', 'Neurological', true, 9, '{}'),
  ('TIA', 'Transient Ischemic Attack (TIA/Mini-Stroke)', 'Neurological', true, 7, '{}'),
  ('CEREBRAL_PALSY', 'Cerebral Palsy', 'Neurological', true, 8, '{}'),
  ('MUSCULAR_DYSTROPHY', 'Muscular Dystrophy', 'Neurological', true, 9, '{}'),
  ('MULTIPLE_SCLEROSIS', 'Multiple Sclerosis', 'Neurological', true, 9, '{}'),
  ('PARALYSIS', 'Paralysis (2+ Extremities)', 'Neurological', true, 9, '{}')
ON CONFLICT (code) DO NOTHING;

-- Mental Health
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('SCHIZOPHRENIA', 'Schizophrenia', 'Mental Health', true, 10, '{}'),
  ('MENTAL_INCAPACITY', 'Mental Incapacity', 'Mental Health', true, 10, '{}'),
  ('SUICIDE_ATTEMPT', 'Suicide Attempt', 'Mental Health', true, 10, '{}'),
  ('MENTAL_FACILITY', 'Mental Facility Confinement', 'Mental Health', true, 8, '{}')
ON CONFLICT (code) DO NOTHING;

-- HIV/AIDS
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('HIV_POSITIVE', 'HIV Positive', 'Immune', true, 10, '{}'),
  ('AIDS', 'AIDS', 'Immune', true, 10, '{}'),
  ('ARC', 'AIDS Related Complex (ARC)', 'Immune', true, 10, '{}'),
  ('IMMUNE_DEFICIENCY', 'Immune Deficiency Disorder', 'Immune', true, 9, '{}')
ON CONFLICT (code) DO NOTHING;

-- Diabetes
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('DIABETES_JUVENILE', 'Diabetes - Juvenile Onset (before age 25)', 'Diabetes', true, 10, '{}'),
  ('DIABETES_INSULIN_EARLY', 'Diabetes - Insulin Required before Age 40', 'Diabetes', true, 10, '{}'),
  ('INSULIN_SHOCK', 'Insulin Shock', 'Diabetes', true, 10, '{}'),
  ('DIABETIC_COMA', 'Diabetic Coma', 'Diabetes', true, 10, '{}'),
  ('DIABETES_AMPUTATION', 'Diabetes - Amputation', 'Diabetes', true, 10, '{}'),
  ('DIABETIC_NEUROPATHY', 'Diabetic Neuropathy', 'Diabetes', true, 7, '{}'),
  ('DIABETIC_RETINOPATHY', 'Diabetic Retinopathy', 'Diabetes', true, 7, '{}'),
  ('DIABETES_UNCONTROLLED', 'Diabetes - Uncontrolled Blood Sugar', 'Diabetes', true, 8, '{}'),
  ('DIABETES_INSULIN_WITH_HEART', 'Insulin Diabetes with Heart Disease', 'Diabetes', true, 9, '{}'),
  ('DIABETES_INSULIN_WITH_PAD', 'Insulin Diabetes with PAD', 'Diabetes', true, 9, '{}')
ON CONFLICT (code) DO NOTHING;

-- Respiratory
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('COPD', 'COPD', 'Respiratory', true, 8, '{}'),
  ('EMPHYSEMA', 'Emphysema', 'Respiratory', true, 9, '{}'),
  ('CHRONIC_BRONCHITIS', 'Chronic Bronchitis', 'Respiratory', true, 7, '{}'),
  ('LUNG_DISEASE', 'Lung Disease', 'Respiratory', true, 8, '{}'),
  ('OXYGEN_REQUIRED', 'Oxygen Required for Breathing', 'Respiratory', true, 9, '{}'),
  ('CYSTIC_FIBROSIS', 'Cystic Fibrosis', 'Respiratory', true, 10, '{}')
ON CONFLICT (code) DO NOTHING;

-- Autoimmune
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('SLE_LUPUS', 'Systemic Lupus (SLE)', 'Autoimmune', true, 8, '{}')
ON CONFLICT (code) DO NOTHING;

-- Substance Abuse
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('ALCOHOL_ABUSE', 'Alcohol Abuse', 'Substance Abuse', true, 8, '{}'),
  ('DRUG_ABUSE', 'Drug Abuse', 'Substance Abuse', true, 9, '{}')
ON CONFLICT (code) DO NOTHING;

-- Other/General
INSERT INTO underwriting_health_conditions (code, name, category, is_active, risk_weight, follow_up_schema)
VALUES
  ('MULTIPLE_HOSPITALIZATIONS', 'Multiple Hospitalizations (3+)', 'Hospitalization', true, 7, '{}'),
  ('PRESCRIPTION_MEDS_IMPAIRMENT', 'Prescription Medications for Listed Impairments', 'Medications', true, 5, '{}'),
  ('HYPERTENSION_UNCONTROLLED', 'Uncontrolled High Blood Pressure', 'Cardiac', true, 6, '{}'),
  ('PENDING_DIAGNOSTICS', 'Pending/Incomplete Diagnostic Testing', 'General', true, 6, '{}'),
  ('CHRONIC_PAIN_OPIATES', 'Chronic Pain - Opiate Treatment', 'Pain Management', true, 7, '{}')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 2: Ensure Baltimore Life carrier exists
-- ============================================================================

-- Note: You may need to adjust the IMO ID based on your tenant
-- This assumes carrier creation is done through the app or already exists

-- ============================================================================
-- STEP 3: Create a function to insert acceptance rules for Baltimore Life
-- ============================================================================

-- This function will create all acceptance rules for a given carrier_id and imo_id
-- Call it after you have the Baltimore Life carrier ID

CREATE OR REPLACE FUNCTION setup_baltimore_life_apriority_rules(
  p_carrier_id UUID,
  p_imo_id UUID,
  p_user_id UUID
) RETURNS TABLE(inserted_count INT, part_a_count INT, part_b_count INT, part_c_count INT) AS $$
DECLARE
  v_part_a_count INT := 0;
  v_part_b_count INT := 0;
  v_part_c_count INT := 0;
  v_total INT := 0;
BEGIN
  -- ========================================
  -- PART A: DECLINE RULES (Yes = Decline)
  -- ========================================

  -- Part A, Question 1a - ADL Impairment (past 12 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ADL_IMPAIRMENT', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1a: Required constant human assistance with ADLs in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 1b - Extended Hospitalization
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HOSPITALIZATION_EXTENDED', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1b: Hospitalized 5+ consecutive days in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HOSPICE_CARE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1b: Hospice care in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'NURSING_FACILITY', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1b: Nursing facility confinement in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 1c - Cancer treatment (past 12 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CANCER_ACTIVE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1c: Cancer treatment in past 12 months (excl. basal/squamous cell) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CANCER_RECURRENCE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1c: Cancer recurrence in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 1d - Legal issues
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'FELONY_CONVICTION', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1d: Felony conviction/plea in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'MISDEMEANOR_CONVICTION', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1d: Misdemeanor conviction/plea in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PENDING_CHARGES', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q1d: Pending criminal charges = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 2a - Organ transplant / Terminal condition (ever)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ORGAN_TRANSPLANT', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2a: Organ transplant (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'TRANSPLANT_ADVISED', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2a: Organ transplant medically advised = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'TERMINAL_CONDITION', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2a: Terminal condition (death expected within 12 months) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 2b - Chronic conditions (ever)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CHRONIC_KIDNEY_DISEASE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Chronic kidney disease (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'KIDNEY_DIALYSIS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Dialysis (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'KIDNEY_FAILURE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Kidney failure (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'LIVER_FAILURE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Liver failure (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CIRRHOSIS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Cirrhosis (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CONGESTIVE_HEART_FAILURE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Congestive heart failure (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CARDIOMYOPATHY', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Cardiomyopathy (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ORGANIC_BRAIN_SYNDROME', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Organic brain syndrome (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ALZHEIMERS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Alzheimer''s disease (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DEMENTIA', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Dementia (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ALS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: ALS / Lou Gehrig''s disease (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'SCHIZOPHRENIA', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Schizophrenia (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'MENTAL_INCAPACITY', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2b: Mental incapacity (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 2c - HIV/AIDS (ever)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'AIDS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2c: AIDS (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ARC', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2c: AIDS Related Complex (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HIV_POSITIVE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2c: HIV positive (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'IMMUNE_DEFICIENCY', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2c: Immune deficiency disorder (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 2d - Cancer history (ever)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CANCER_MULTIPLE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2d: Multiple cancer occurrences (ever, excl. basal/squamous) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CANCER_METASTATIC', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2d: Metastatic cancer (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CANCER_AMPUTATION', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2d: Cancer-related amputation (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 2e - Severe diabetes (ever)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'INSULIN_SHOCK', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2e: Insulin shock (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETIC_COMA', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2e: Diabetic coma (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETES_AMPUTATION', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2e: Diabetes-related amputation (ever) = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETES_INSULIN_EARLY', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2e: Insulin required before age 40 = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETES_JUVENILE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q2e: Diabetes diagnosed before age 25 = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 3 - Stroke/TIA/HepC (past 12 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'STROKE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q3: Stroke in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'TIA', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q3: TIA (mini-stroke) in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HEPATITIS_C', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q3: Hepatitis C in past 12 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 4a - Respiratory (past 24 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'COPD', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4a: COPD in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'LUNG_DISEASE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4a: Lung disease in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'EMPHYSEMA', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4a: Emphysema in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CHRONIC_BRONCHITIS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4a: Chronic bronchitis in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'OXYGEN_REQUIRED', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4a: Oxygen required in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 4b - Major cardiac (past 24 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ANGINA', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4b: Angina in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HEART_ATTACK', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4b: Heart attack in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CORONARY_BYPASS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4b: CABG surgery in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PACEMAKER', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4b: Initial pacemaker placement in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DEFIBRILLATOR', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4b: Defibrillator in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HEART_VALVE_REPLACEMENT', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4b: Heart valve replacement in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'AAA', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4b: Abdominal aortic aneurysm repair in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 4c - Neuromuscular (past 24 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CEREBRAL_PALSY', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4c: Cerebral palsy in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'MUSCULAR_DYSTROPHY', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4c: Muscular dystrophy in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'MULTIPLE_SCLEROSIS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4c: Multiple sclerosis in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CYSTIC_FIBROSIS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4c: Cystic fibrosis in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'SLE_LUPUS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4c: Systemic lupus (SLE) in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PARALYSIS', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4c: Paralysis of 2+ extremities in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 4d - Mental health/substance (past 24 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'SUICIDE_ATTEMPT', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4d: Suicide attempt in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ALCOHOL_ABUSE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4d: Alcohol abuse in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DRUG_ABUSE', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q4d: Drug abuse in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- Part A, Question 5 - DUI (past 24 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DUI_DWI', p_imo_id, p_user_id, 'declined',
    NULL, 0, 'Part A Q5: DUI/DWI conviction in past 24 months = DECLINE', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = 'declined', health_class_result = NULL, notes = EXCLUDED.notes, updated_at = NOW();
  v_part_a_count := v_part_a_count + 1;

  -- ========================================
  -- PART B: TABLE_RATED/SPECIAL RULES (Yes = Special Rating Class)
  -- Note: Using 'table_rated' acceptance with 'standard' health class for Special
  -- ========================================

  -- Part B, Question 1a - Cancer/Neuro (past 36 months) - if not declined by Part A
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'LYMPHOMA', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1a: Lymphoma in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING; -- Don't override decline
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'MELANOMA', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1a: Melanoma in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'LEUKEMIA', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1a: Leukemia in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'INTERNAL_CANCER', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1a: Internal cancer in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HODGKINS_DISEASE', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1a: Hodgkin''s disease in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PARKINSONS', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1a: Parkinson''s disease in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'LIVER_DISEASE', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1a: Liver disease in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  -- Part B, Question 1b - Cardiac procedures (past 36 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HEART_DISEASE', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1b: Heart disease in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'ANGIOPLASTY', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1b: Angioplasty in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CARDIAC_STENT', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1b: Cardiac stent in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'VASCULAR_GRAFT', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1b: Vascular graft in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PACEMAKER_REPLACEMENT', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1b: Pacemaker replacement in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'VASCULAR_SURGERY', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1b: Vascular surgery in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  -- Part B, Question 1d - Diabetic complications (past 36 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETIC_NEUROPATHY', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1d: Diabetic neuropathy in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETIC_RETINOPATHY', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1d: Diabetic retinopathy in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETES_UNCONTROLLED', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1d: Uncontrolled blood sugar in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  -- Part B, Question 1e - Insulin diabetes with cardiac (past 36 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETES_INSULIN_WITH_HEART', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1e: Insulin diabetes with heart disease in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'DIABETES_INSULIN_WITH_PAD', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1e: Insulin diabetes with PAD in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PAD', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q1e: Peripheral arterial disease in past 36 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  -- Part B, Question 2 - Multiple hospitalizations (past 24 months)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'MULTIPLE_HOSPITALIZATIONS', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q2: 3+ hospital/facility confinements in past 24 months = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'MENTAL_FACILITY', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.5, 'Part B Q2: Mental facility confinement (3+ times in 24 months) = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_b_count := v_part_b_count + 1;

  -- ========================================
  -- PART C: TABLE_RATED/SPECIAL RULES (Yes = Special Rating Class)
  -- ========================================

  -- Part C, Question 1 - Prescription meds for listed impairments
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PRESCRIPTION_MEDS_IMPAIRMENT', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.6, 'Part C Q1: Taking prescription meds for listed impairments = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_c_count := v_part_c_count + 1;

  -- Part C, Question 2 - Uncontrolled high blood pressure
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'HYPERTENSION_UNCONTROLLED', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.6, 'Part C Q2: Uncontrolled high blood pressure = SPECIAL rating class (Q2a asks about compliance)', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_c_count := v_part_c_count + 1;

  -- Part C, Question 3 - Pending diagnostics
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'PENDING_DIAGNOSTICS', p_imo_id, p_user_id, 'table_rated',
    'standard', 0.6, 'Part C Q3: Pending/incomplete diagnostic testing in past 2 years = SPECIAL rating class', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_c_count := v_part_c_count + 1;

  -- Part D, Question 1 - Chronic pain opiates (age 60+, $75k+)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, created_by, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    p_carrier_id, 'CHRONIC_PAIN_OPIATES', p_imo_id, p_user_id, 'case_by_case',
    NULL, 0.4, 'Part D Q1: Chronic pain opiate treatment (age 60+, $75k+) = Additional underwriting required', 'manual', 'term_life', 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO NOTHING;
  v_part_c_count := v_part_c_count + 1;

  v_total := v_part_a_count + v_part_b_count + v_part_c_count;

  RETURN QUERY SELECT v_total, v_part_a_count, v_part_b_count, v_part_c_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Usage Instructions:
-- ============================================================================
-- After running this migration, call the function with your Baltimore Life carrier ID:
--
-- SELECT * FROM setup_baltimore_life_apriority_rules(
--   'your-baltimore-life-carrier-uuid',
--   'your-imo-uuid',
--   'your-user-uuid'
-- );
--
-- This will create all acceptance rules for Baltimore Life aPriority Level Term
-- ============================================================================

COMMENT ON FUNCTION setup_baltimore_life_apriority_rules IS
'Creates carrier acceptance rules for Baltimore Life aPriority Level Term product.
Form ICC20-8684(C) - Issue Ages 50-80, Coverage up to $150,000.
Part A = Decline, Part B = Special rating, Part C = Special rating.';
