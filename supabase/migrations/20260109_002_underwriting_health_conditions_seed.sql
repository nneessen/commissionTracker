-- supabase/migrations/20260109_002_underwriting_health_conditions_seed.sql
-- AI-Powered Underwriting Wizard - Health Conditions Seed Data

-- ============================================================================
-- CARDIOVASCULAR CONDITIONS
-- ============================================================================

INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES
-- Heart Disease / CAD
('heart_disease', 'Heart Disease / Coronary Artery Disease', 'cardiovascular', 7, 1, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of heart disease",
      "options": ["Coronary Artery Disease (CAD)", "Congestive Heart Failure (CHF)", "Cardiomyopathy", "Valve Disease", "Other"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "procedures",
      "type": "multiselect",
      "label": "Procedures performed",
      "options": ["Angioplasty/Stent", "Bypass Surgery (CABG)", "Valve Replacement", "Pacemaker", "Defibrillator (ICD)", "None"],
      "required": true
    },
    {
      "id": "ejection_fraction",
      "type": "number",
      "label": "Last known ejection fraction (%)",
      "min": 10,
      "max": 80,
      "required": false
    },
    {
      "id": "symptoms_controlled",
      "type": "select",
      "label": "Are symptoms controlled?",
      "options": ["Yes, fully controlled", "Mostly controlled", "Partially controlled", "Not well controlled"],
      "required": true
    },
    {
      "id": "medications",
      "type": "multiselect",
      "label": "Current medications",
      "options": ["Beta Blocker", "ACE Inhibitor/ARB", "Statin", "Blood Thinner", "Diuretic", "Nitrate", "Other", "None"],
      "required": true
    }
  ]
}'::jsonb),

-- Heart Attack (MI)
('heart_attack', 'Heart Attack (Myocardial Infarction)', 'cardiovascular', 8, 2, '{
  "questions": [
    {
      "id": "date_of_event",
      "type": "date",
      "label": "Date of heart attack",
      "required": true
    },
    {
      "id": "number_of_events",
      "type": "select",
      "label": "Number of heart attacks",
      "options": ["1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Treatment received",
      "options": ["Angioplasty/Stent", "Bypass Surgery (CABG)", "Medication only", "Cardiac Rehab"],
      "required": true
    },
    {
      "id": "ejection_fraction_post",
      "type": "number",
      "label": "Post-event ejection fraction (%)",
      "min": 10,
      "max": 80,
      "required": false
    },
    {
      "id": "complications",
      "type": "multiselect",
      "label": "Any complications?",
      "options": ["Heart failure", "Arrhythmia", "Cardiogenic shock", "None"],
      "required": true
    },
    {
      "id": "full_recovery",
      "type": "select",
      "label": "Made full recovery?",
      "options": ["Yes", "Mostly", "Partial", "No"],
      "required": true
    }
  ]
}'::jsonb),

-- Stroke / TIA
('stroke', 'Stroke / TIA', 'cardiovascular', 8, 3, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of event",
      "options": ["Ischemic Stroke", "Hemorrhagic Stroke", "TIA (Mini-Stroke)"],
      "required": true
    },
    {
      "id": "date_of_event",
      "type": "date",
      "label": "Date of event",
      "required": true
    },
    {
      "id": "number_of_events",
      "type": "select",
      "label": "Number of strokes/TIAs",
      "options": ["1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "residual_effects",
      "type": "multiselect",
      "label": "Residual effects",
      "options": ["Speech difficulty", "Paralysis/weakness", "Vision problems", "Cognitive changes", "None"],
      "required": true
    },
    {
      "id": "cause_identified",
      "type": "select",
      "label": "Was a cause identified?",
      "options": ["AFib", "Carotid artery disease", "Blood clot", "Aneurysm", "Unknown", "Other"],
      "required": true
    },
    {
      "id": "on_blood_thinners",
      "type": "select",
      "label": "Currently on blood thinners?",
      "options": ["Yes", "No"],
      "required": true
    }
  ]
}'::jsonb),

-- Atrial Fibrillation
('afib', 'Atrial Fibrillation (AFib)', 'cardiovascular', 5, 4, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of AFib",
      "options": ["Paroxysmal (intermittent)", "Persistent", "Permanent"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Rate control medication", "Rhythm control medication", "Blood thinner", "Cardioversion", "Ablation", "Pacemaker", "None"],
      "required": true
    },
    {
      "id": "stroke_history",
      "type": "select",
      "label": "Any history of stroke/TIA?",
      "options": ["Yes", "No"],
      "required": true
    },
    {
      "id": "chads_score_known",
      "type": "select",
      "label": "Do you know your CHADS-VASc score?",
      "options": ["0", "1", "2", "3 or higher", "Unknown"],
      "required": false
    }
  ]
}'::jsonb),

-- High Blood Pressure
('high_blood_pressure', 'High Blood Pressure (Hypertension)', 'cardiovascular', 3, 5, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "current_reading",
      "type": "text",
      "label": "Most recent BP reading (e.g., 130/85)",
      "required": true
    },
    {
      "id": "controlled",
      "type": "select",
      "label": "Is it well controlled?",
      "options": ["Yes, consistently normal", "Mostly controlled", "Sometimes elevated", "Poorly controlled"],
      "required": true
    },
    {
      "id": "medication_count",
      "type": "select",
      "label": "Number of BP medications",
      "options": ["0 (diet/lifestyle only)", "1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "complications",
      "type": "multiselect",
      "label": "Any complications from high BP?",
      "options": ["Heart disease", "Kidney problems", "Eye problems", "None"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- METABOLIC CONDITIONS
-- ============================================================================

-- Diabetes
('diabetes', 'Diabetes', 'metabolic', 6, 10, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of diabetes",
      "options": ["Type 1", "Type 2", "Gestational (during pregnancy)", "Pre-diabetes"],
      "required": true
    },
    {
      "id": "diagnosis_age",
      "type": "number",
      "label": "Age at diagnosis",
      "min": 0,
      "max": 120,
      "required": true
    },
    {
      "id": "a1c_level",
      "type": "number",
      "label": "Most recent A1C level",
      "min": 4,
      "max": 15,
      "step": 0.1,
      "required": true
    },
    {
      "id": "treatment",
      "type": "select",
      "label": "Current treatment",
      "options": ["Diet and exercise only", "Oral medication only", "Insulin only", "Oral medication + Insulin", "Insulin pump"],
      "required": true
    },
    {
      "id": "complications",
      "type": "multiselect",
      "label": "Any complications?",
      "options": ["Retinopathy (eye)", "Neuropathy (nerve)", "Nephropathy (kidney)", "Amputation", "Heart disease", "None"],
      "required": true
    },
    {
      "id": "monitoring",
      "type": "select",
      "label": "How often do you monitor blood sugar?",
      "options": ["Multiple times daily", "Once daily", "Weekly", "Only at doctor visits"],
      "required": true
    }
  ]
}'::jsonb),

-- High Cholesterol
('high_cholesterol', 'High Cholesterol', 'metabolic', 2, 11, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "total_cholesterol",
      "type": "number",
      "label": "Most recent total cholesterol",
      "min": 100,
      "max": 400,
      "required": false
    },
    {
      "id": "ldl",
      "type": "number",
      "label": "Most recent LDL",
      "min": 30,
      "max": 300,
      "required": false
    },
    {
      "id": "on_statin",
      "type": "select",
      "label": "Taking statin medication?",
      "options": ["Yes", "No", "Tried but stopped due to side effects"],
      "required": true
    },
    {
      "id": "medication_count",
      "type": "select",
      "label": "Number of cholesterol medications",
      "options": ["0", "1", "2 or more"],
      "required": true
    },
    {
      "id": "controlled",
      "type": "select",
      "label": "Is cholesterol well controlled?",
      "options": ["Yes", "Mostly", "No"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- CANCER
-- ============================================================================

('cancer', 'Cancer (any type)', 'cancer', 9, 20, '{
  "questions": [
    {
      "id": "cancer_type",
      "type": "select",
      "label": "Type of cancer",
      "options": ["Breast", "Prostate", "Lung", "Colon/Colorectal", "Skin (Melanoma)", "Skin (Non-Melanoma)", "Thyroid", "Bladder", "Kidney", "Lymphoma", "Leukemia", "Pancreatic", "Brain", "Other"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "stage_at_diagnosis",
      "type": "select",
      "label": "Stage at diagnosis",
      "options": ["Stage 0 (in situ)", "Stage I", "Stage II", "Stage III", "Stage IV", "Unknown"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Treatment received",
      "options": ["Surgery", "Chemotherapy", "Radiation", "Immunotherapy", "Hormone therapy", "Watchful waiting", "Other"],
      "required": true
    },
    {
      "id": "current_status",
      "type": "select",
      "label": "Current status",
      "options": ["In remission - no evidence of disease", "In treatment", "Stable/chronic", "Recurrence"],
      "required": true
    },
    {
      "id": "remission_date",
      "type": "date",
      "label": "Date entered remission (if applicable)",
      "required": false
    },
    {
      "id": "follow_up",
      "type": "select",
      "label": "Current follow-up schedule",
      "options": ["Every 3 months", "Every 6 months", "Annually", "No longer requires follow-up", "Still in treatment"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- RESPIRATORY CONDITIONS
-- ============================================================================

-- COPD / Emphysema
('copd', 'COPD / Emphysema', 'respiratory', 6, 30, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Severity (GOLD stage if known)",
      "options": ["Mild", "Moderate", "Severe", "Very Severe", "Unknown"],
      "required": true
    },
    {
      "id": "oxygen_use",
      "type": "select",
      "label": "Do you use supplemental oxygen?",
      "options": ["No", "Yes, occasionally", "Yes, at night only", "Yes, continuously"],
      "required": true
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Hospitalizations in past 2 years for COPD",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "smoking_status",
      "type": "select",
      "label": "Current smoking status",
      "options": ["Never smoked", "Former smoker", "Current smoker"],
      "required": true
    },
    {
      "id": "inhalers",
      "type": "select",
      "label": "Number of inhaler medications",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    }
  ]
}'::jsonb),

-- Asthma
('asthma', 'Asthma', 'respiratory', 2, 31, '{
  "questions": [
    {
      "id": "diagnosis_age",
      "type": "number",
      "label": "Age at diagnosis",
      "min": 0,
      "max": 120,
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Current severity",
      "options": ["Intermittent (mild)", "Mild persistent", "Moderate persistent", "Severe persistent"],
      "required": true
    },
    {
      "id": "controller_medication",
      "type": "select",
      "label": "Using daily controller medication?",
      "options": ["No, rescue inhaler only", "Yes, inhaled steroid", "Yes, combination inhaler", "Yes, oral medication"],
      "required": true
    },
    {
      "id": "er_visits",
      "type": "select",
      "label": "ER visits for asthma in past 2 years",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Hospitalizations for asthma in past 5 years",
      "options": ["0", "1", "2 or more"],
      "required": true
    },
    {
      "id": "oral_steroids",
      "type": "select",
      "label": "Oral steroid courses in past year",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    }
  ]
}'::jsonb),

-- Sleep Apnea
('sleep_apnea', 'Sleep Apnea', 'respiratory', 3, 32, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of sleep apnea",
      "options": ["Obstructive (OSA)", "Central", "Mixed", "Unknown"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "ahi_score",
      "type": "select",
      "label": "AHI score (events per hour)",
      "options": ["Mild (5-15)", "Moderate (15-30)", "Severe (30+)", "Unknown"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "select",
      "label": "Current treatment",
      "options": ["CPAP/BiPAP - compliant", "CPAP/BiPAP - non-compliant", "Oral appliance", "Surgery performed", "No treatment", "Refused treatment"],
      "required": true
    },
    {
      "id": "compliance",
      "type": "select",
      "label": "If using CPAP, average hours per night?",
      "options": ["6+ hours", "4-6 hours", "Less than 4 hours", "Not using CPAP"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- MENTAL HEALTH CONDITIONS
-- ============================================================================

-- Depression
('depression', 'Depression', 'mental_health', 4, 40, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Current severity",
      "options": ["Mild", "Moderate", "Severe", "In remission"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Antidepressant medication", "Therapy/Counseling", "Both medication and therapy", "No current treatment"],
      "required": true
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Ever hospitalized for depression?",
      "options": ["No", "Yes, once", "Yes, more than once"],
      "required": true
    },
    {
      "id": "suicide_attempt",
      "type": "select",
      "label": "Any history of suicide attempt?",
      "options": ["No", "Yes"],
      "required": true
    },
    {
      "id": "work_impact",
      "type": "select",
      "label": "Has depression affected your work?",
      "options": ["No", "Yes, reduced hours", "Yes, disability leave", "Yes, unable to work"],
      "required": true
    }
  ]
}'::jsonb),

-- Anxiety
('anxiety', 'Anxiety Disorder', 'mental_health', 3, 41, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of anxiety disorder",
      "options": ["Generalized Anxiety (GAD)", "Panic Disorder", "Social Anxiety", "PTSD", "OCD", "Other/Unspecified"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Current severity",
      "options": ["Mild", "Moderate", "Severe", "In remission"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Anti-anxiety medication (benzodiazepine)", "Antidepressant (SSRI/SNRI)", "Therapy/Counseling", "No treatment"],
      "required": true
    },
    {
      "id": "panic_attacks",
      "type": "select",
      "label": "Frequency of panic attacks (if applicable)",
      "options": ["Never", "Rarely (few per year)", "Monthly", "Weekly", "Daily"],
      "required": false
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Ever hospitalized for anxiety?",
      "options": ["No", "Yes"],
      "required": true
    }
  ]
}'::jsonb),

-- Bipolar Disorder
('bipolar', 'Bipolar Disorder', 'mental_health', 6, 42, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of bipolar disorder",
      "options": ["Bipolar I", "Bipolar II", "Cyclothymic", "Unspecified"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "current_state",
      "type": "select",
      "label": "Current state",
      "options": ["Stable/Controlled", "Manic episode", "Depressive episode", "Mixed episode", "Hypomanic"],
      "required": true
    },
    {
      "id": "medications",
      "type": "multiselect",
      "label": "Current medications",
      "options": ["Mood stabilizer (Lithium)", "Anticonvulsant", "Antipsychotic", "Antidepressant", "None"],
      "required": true
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Psychiatric hospitalizations ever",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "compliance",
      "type": "select",
      "label": "Medication compliance",
      "options": ["Always compliant", "Mostly compliant", "Sometimes miss doses", "Often non-compliant"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- GASTROINTESTINAL CONDITIONS
-- ============================================================================

-- Crohn's Disease
('crohns', 'Crohn''s Disease', 'gastrointestinal', 5, 50, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "location",
      "type": "multiselect",
      "label": "Affected areas",
      "options": ["Small intestine", "Large intestine (colon)", "Both", "Upper GI", "Perianal"],
      "required": true
    },
    {
      "id": "current_status",
      "type": "select",
      "label": "Current disease status",
      "options": ["Remission", "Mild flare", "Moderate flare", "Severe/Active"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["5-ASA medication", "Steroids", "Immunomodulator", "Biologic (Humira, Remicade, etc.)", "No medication"],
      "required": true
    },
    {
      "id": "surgeries",
      "type": "select",
      "label": "Number of bowel surgeries",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "hospitalizations_2yr",
      "type": "select",
      "label": "Hospitalizations in past 2 years",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    }
  ]
}'::jsonb),

-- Ulcerative Colitis
('ulcerative_colitis', 'Ulcerative Colitis', 'gastrointestinal', 5, 51, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "extent",
      "type": "select",
      "label": "Extent of disease",
      "options": ["Proctitis (rectum only)", "Left-sided colitis", "Pancolitis (entire colon)", "Unknown"],
      "required": true
    },
    {
      "id": "current_status",
      "type": "select",
      "label": "Current disease status",
      "options": ["Remission", "Mild flare", "Moderate flare", "Severe/Active"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["5-ASA medication", "Steroids", "Immunomodulator", "Biologic", "No medication"],
      "required": true
    },
    {
      "id": "colectomy",
      "type": "select",
      "label": "Had colectomy (colon removal)?",
      "options": ["No", "Yes, partial", "Yes, total with J-pouch", "Yes, total with ostomy"],
      "required": true
    },
    {
      "id": "hospitalizations_2yr",
      "type": "select",
      "label": "Hospitalizations in past 2 years",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    }
  ]
}'::jsonb),

-- Liver Disease
('liver_disease', 'Liver Disease', 'gastrointestinal', 7, 52, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of liver disease",
      "options": ["Fatty liver (NAFLD/NASH)", "Hepatitis B", "Hepatitis C", "Alcoholic liver disease", "Cirrhosis", "Autoimmune hepatitis", "Other"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Current severity",
      "options": ["Mild/Early stage", "Moderate", "Cirrhosis - compensated", "Cirrhosis - decompensated"],
      "required": true
    },
    {
      "id": "hepatitis_status",
      "type": "select",
      "label": "If Hepatitis, treatment status",
      "options": ["Cured/Cleared", "In treatment", "Chronic/Not treated", "N/A"],
      "required": true
    },
    {
      "id": "liver_function_tests",
      "type": "select",
      "label": "Are liver function tests (LFTs) normal?",
      "options": ["Yes, normal", "Mildly elevated", "Moderately elevated", "Significantly elevated", "Unknown"],
      "required": true
    },
    {
      "id": "transplant",
      "type": "select",
      "label": "Liver transplant history",
      "options": ["No", "On waiting list", "Had transplant"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- NEUROLOGICAL CONDITIONS
-- ============================================================================

-- Epilepsy / Seizures
('epilepsy', 'Epilepsy / Seizure Disorder', 'neurological', 5, 60, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of seizures",
      "options": ["Generalized (grand mal)", "Partial/Focal", "Absence (petit mal)", "Multiple types", "Unknown"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "last_seizure",
      "type": "select",
      "label": "Time since last seizure",
      "options": ["Less than 6 months", "6-12 months", "1-2 years", "2-5 years", "5+ years seizure-free"],
      "required": true
    },
    {
      "id": "frequency",
      "type": "select",
      "label": "Seizure frequency (when active)",
      "options": ["Daily", "Weekly", "Monthly", "Few per year", "Rare"],
      "required": true
    },
    {
      "id": "medications",
      "type": "select",
      "label": "Number of seizure medications",
      "options": ["0 (no longer needed)", "1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "cause",
      "type": "select",
      "label": "Known cause",
      "options": ["Unknown/Idiopathic", "Head injury", "Brain tumor", "Stroke", "Congenital", "Other"],
      "required": true
    }
  ]
}'::jsonb),

-- Multiple Sclerosis
('ms', 'Multiple Sclerosis (MS)', 'neurological', 7, 61, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of MS",
      "options": ["Relapsing-Remitting (RRMS)", "Secondary Progressive (SPMS)", "Primary Progressive (PPMS)", "Progressive-Relapsing", "Unknown"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "relapses_2yr",
      "type": "select",
      "label": "Number of relapses in past 2 years",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "select",
      "label": "Current disease-modifying treatment",
      "options": ["Injectable (Copaxone, interferons)", "Oral (Tecfidera, Gilenya, etc.)", "Infusion (Ocrevus, Tysabri, etc.)", "None"],
      "required": true
    },
    {
      "id": "disability_level",
      "type": "select",
      "label": "Current disability level",
      "options": ["Minimal - fully independent", "Mild - some limitations", "Moderate - needs assistance", "Severe - significant disability"],
      "required": true
    },
    {
      "id": "mobility_aids",
      "type": "select",
      "label": "Use of mobility aids",
      "options": ["None needed", "Occasionally use cane", "Regular use of cane/walker", "Wheelchair"],
      "required": true
    }
  ]
}'::jsonb),

-- Parkinson's Disease
('parkinsons', 'Parkinson''s Disease', 'neurological', 7, 62, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "stage",
      "type": "select",
      "label": "Current stage",
      "options": ["Stage 1 - Mild, one side affected", "Stage 2 - Both sides, balance OK", "Stage 3 - Moderate, some balance issues", "Stage 4 - Severe, needs assistance", "Stage 5 - Wheelchair/bedridden"],
      "required": true
    },
    {
      "id": "symptoms",
      "type": "multiselect",
      "label": "Primary symptoms",
      "options": ["Tremor", "Rigidity", "Slowness of movement", "Balance problems", "Cognitive changes", "Speech difficulties"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Levodopa/Carbidopa", "Dopamine agonists", "MAO-B inhibitors", "Deep brain stimulation", "Physical therapy", "None"],
      "required": true
    },
    {
      "id": "independence",
      "type": "select",
      "label": "Level of independence",
      "options": ["Fully independent", "Mostly independent", "Needs some help daily", "Needs significant help", "Requires full-time care"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- AUTOIMMUNE/MUSCULOSKELETAL CONDITIONS
-- ============================================================================

-- Rheumatoid Arthritis
('rheumatoid_arthritis', 'Rheumatoid Arthritis', 'autoimmune', 4, 70, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Current severity",
      "options": ["Mild - minimal joint involvement", "Moderate - multiple joints affected", "Severe - significant joint damage", "In remission"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["NSAIDs only", "Methotrexate", "Other DMARD", "Biologic (Humira, Enbrel, etc.)", "Steroids", "None"],
      "required": true
    },
    {
      "id": "joint_damage",
      "type": "select",
      "label": "Any permanent joint damage?",
      "options": ["No", "Mild", "Moderate", "Severe"],
      "required": true
    },
    {
      "id": "surgeries",
      "type": "select",
      "label": "Joint replacement surgeries",
      "options": ["0", "1", "2 or more"],
      "required": true
    },
    {
      "id": "functional_status",
      "type": "select",
      "label": "Functional status",
      "options": ["Normal activities", "Some limitations", "Significant limitations", "Disabled"],
      "required": true
    }
  ]
}'::jsonb),

-- Lupus
('lupus', 'Lupus (SLE)', 'autoimmune', 6, 71, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "organs_affected",
      "type": "multiselect",
      "label": "Organs affected",
      "options": ["Skin/Joints only", "Kidneys", "Heart", "Lungs", "Brain/Nervous system", "Blood"],
      "required": true
    },
    {
      "id": "current_status",
      "type": "select",
      "label": "Current disease status",
      "options": ["Remission", "Mild flare", "Moderate activity", "Severe/Active"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Hydroxychloroquine (Plaquenil)", "Steroids", "Immunosuppressants", "Biologic (Benlysta)", "None"],
      "required": true
    },
    {
      "id": "kidney_involvement",
      "type": "select",
      "label": "Lupus nephritis (kidney involvement)?",
      "options": ["No", "Yes, mild", "Yes, moderate", "Yes, severe/dialysis"],
      "required": true
    },
    {
      "id": "hospitalizations_2yr",
      "type": "select",
      "label": "Hospitalizations in past 2 years",
      "options": ["0", "1", "2", "3 or more"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- RENAL CONDITIONS
-- ============================================================================

-- Kidney Disease
('kidney_disease', 'Kidney Disease (CKD)', 'renal', 7, 80, '{
  "questions": [
    {
      "id": "cause",
      "type": "select",
      "label": "Cause of kidney disease",
      "options": ["Diabetes", "High blood pressure", "Polycystic kidney disease", "Glomerulonephritis", "Unknown", "Other"],
      "required": true
    },
    {
      "id": "stage",
      "type": "select",
      "label": "CKD Stage (based on GFR)",
      "options": ["Stage 1 (GFR 90+)", "Stage 2 (GFR 60-89)", "Stage 3a (GFR 45-59)", "Stage 3b (GFR 30-44)", "Stage 4 (GFR 15-29)", "Stage 5 (GFR <15)", "Unknown"],
      "required": true
    },
    {
      "id": "dialysis",
      "type": "select",
      "label": "On dialysis?",
      "options": ["No", "Yes - hemodialysis", "Yes - peritoneal dialysis"],
      "required": true
    },
    {
      "id": "transplant",
      "type": "select",
      "label": "Kidney transplant history",
      "options": ["No", "On waiting list", "Had transplant"],
      "required": true
    },
    {
      "id": "creatinine",
      "type": "number",
      "label": "Most recent creatinine level",
      "min": 0.5,
      "max": 15,
      "step": 0.1,
      "required": false
    },
    {
      "id": "progression",
      "type": "select",
      "label": "Is kidney function stable?",
      "options": ["Yes, stable", "Slowly declining", "Rapidly declining"],
      "required": true
    }
  ]
}'::jsonb),

-- ============================================================================
-- SUBSTANCE USE CONDITIONS
-- ============================================================================

-- Alcohol Abuse History
('alcohol_abuse', 'Alcohol Abuse / Alcoholism History', 'substance', 5, 90, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Nature of alcohol issue",
      "options": ["Alcohol Use Disorder (diagnosed)", "Heavy drinking (self-identified)", "DUI/DWI only", "Treatment for alcohol abuse"],
      "required": true
    },
    {
      "id": "last_drink",
      "type": "select",
      "label": "Time since last alcoholic drink",
      "options": ["Currently drinking", "Less than 1 year", "1-2 years", "2-5 years", "5+ years"],
      "required": true
    },
    {
      "id": "treatment_history",
      "type": "multiselect",
      "label": "Treatment history",
      "options": ["Inpatient rehab", "Outpatient program", "AA/Support groups", "Medication (Antabuse, Naltrexone)", "No formal treatment"],
      "required": true
    },
    {
      "id": "relapses",
      "type": "select",
      "label": "Number of relapses after treatment",
      "options": ["0", "1", "2", "3 or more", "N/A - no treatment"],
      "required": true
    },
    {
      "id": "liver_damage",
      "type": "select",
      "label": "Any liver damage from alcohol?",
      "options": ["No", "Fatty liver", "Alcoholic hepatitis", "Cirrhosis"],
      "required": true
    },
    {
      "id": "dui_history",
      "type": "select",
      "label": "DUI/DWI history",
      "options": ["None", "1", "2", "3 or more"],
      "required": true
    }
  ]
}'::jsonb),

-- Drug Abuse History
('drug_abuse', 'Drug Abuse / Addiction History', 'substance', 6, 91, '{
  "questions": [
    {
      "id": "substances",
      "type": "multiselect",
      "label": "Substances involved",
      "options": ["Opioids/Heroin", "Cocaine", "Methamphetamine", "Marijuana (heavy use)", "Benzodiazepines", "Prescription drug abuse", "Other"],
      "required": true
    },
    {
      "id": "last_use",
      "type": "select",
      "label": "Time since last use",
      "options": ["Currently using", "Less than 1 year", "1-2 years", "2-5 years", "5+ years"],
      "required": true
    },
    {
      "id": "iv_drug_use",
      "type": "select",
      "label": "History of IV drug use?",
      "options": ["No", "Yes"],
      "required": true
    },
    {
      "id": "treatment_history",
      "type": "multiselect",
      "label": "Treatment history",
      "options": ["Inpatient rehab", "Outpatient program", "Methadone/Suboxone program", "NA/Support groups", "No formal treatment"],
      "required": true
    },
    {
      "id": "relapses",
      "type": "select",
      "label": "Number of relapses after treatment",
      "options": ["0", "1", "2", "3 or more", "N/A - no treatment"],
      "required": true
    },
    {
      "id": "overdose_history",
      "type": "select",
      "label": "Any overdose history?",
      "options": ["No", "Yes, once", "Yes, multiple"],
      "required": true
    }
  ]
}'::jsonb)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================================================
-- Additional common conditions (simpler follow-ups)
-- ============================================================================

INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES
('thyroid_disorder', 'Thyroid Disorder', 'endocrine', 2, 12, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of thyroid condition",
      "options": ["Hypothyroid (underactive)", "Hyperthyroid (overactive)", "Thyroid nodules", "Thyroid cancer", "Graves disease", "Hashimotos"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "select",
      "label": "Current treatment",
      "options": ["Thyroid hormone replacement", "Anti-thyroid medication", "Radioactive iodine", "Surgery", "Monitoring only"],
      "required": true
    },
    {
      "id": "controlled",
      "type": "select",
      "label": "Are thyroid levels controlled?",
      "options": ["Yes, normal levels", "Mostly controlled", "Not well controlled"],
      "required": true
    }
  ]
}'::jsonb),

('peripheral_vascular', 'Peripheral Vascular Disease', 'cardiovascular', 6, 6, '{
  "questions": [
    {
      "id": "symptoms",
      "type": "multiselect",
      "label": "Symptoms experienced",
      "options": ["Claudication (leg pain with walking)", "Rest pain", "Non-healing wounds", "None currently"],
      "required": true
    },
    {
      "id": "procedures",
      "type": "multiselect",
      "label": "Procedures performed",
      "options": ["Angioplasty/Stent", "Bypass surgery", "Amputation", "None"],
      "required": true
    },
    {
      "id": "smoking",
      "type": "select",
      "label": "Smoking status",
      "options": ["Never", "Former", "Current"],
      "required": true
    }
  ]
}'::jsonb),

('hiv_aids', 'HIV/AIDS', 'infectious', 7, 100, '{
  "questions": [
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "viral_load",
      "type": "select",
      "label": "Current viral load status",
      "options": ["Undetectable", "Detectable but controlled", "Not well controlled", "Unknown"],
      "required": true
    },
    {
      "id": "cd4_count",
      "type": "select",
      "label": "Most recent CD4 count",
      "options": ["500+ (normal)", "200-499", "Below 200", "Unknown"],
      "required": true
    },
    {
      "id": "on_treatment",
      "type": "select",
      "label": "On antiretroviral therapy (ART)?",
      "options": ["Yes, compliant", "Yes, sometimes miss doses", "No"],
      "required": true
    },
    {
      "id": "opportunistic_infections",
      "type": "select",
      "label": "Any history of opportunistic infections?",
      "options": ["No", "Yes, in the past", "Yes, currently"],
      "required": true
    }
  ]
}'::jsonb)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
