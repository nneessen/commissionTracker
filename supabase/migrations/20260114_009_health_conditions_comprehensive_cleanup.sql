-- supabase/migrations/20260114_009_health_conditions_comprehensive_cleanup.sql
-- Comprehensive health conditions cleanup:
-- 1. Remove duplicate conditions (variants handled by follow-up questions)
-- 2. Remove symptom entries (not actual conditions)
-- 3. Add follow-up schemas to legitimate conditions missing them
-- 4. Add missing common conditions for life insurance underwriting
-- 5. Add new categories: blood, musculoskeletal

BEGIN;

-- ============================================================================
-- PHASE 1: REMOVE DUPLICATES AND SYMPTOMS
-- ============================================================================

-- First, clean up any carrier_condition_acceptance references
DELETE FROM carrier_condition_acceptance WHERE condition_code IN (
  'peripheral_vascular_disease',  -- duplicate of peripheral_vascular
  'diabetes_early_onset',         -- duplicate of diabetes (age captured in follow-up)
  'diabetes_with_complications',  -- duplicate of diabetes (complications in follow-up)
  'asthma_severe',               -- duplicate of asthma (severity in follow-up)
  'rheumatoid_arthritis_severe', -- duplicate of rheumatoid_arthritis (severity in follow-up)
  'multiple_myeloma',            -- duplicate of cancer (type selection in follow-up)
  'lymphoma',                    -- duplicate of cancer (type selection in follow-up)
  'melanoma',                    -- duplicate of cancer (type selection in follow-up)
  'edema_fluid_retention',       -- symptom, not a condition
  'nausea',                      -- symptom, not a condition
  'hepatitis_a_e',               -- can use liver_disease with hepatitis type
  'aortic_insufficiency',        -- consolidating into valve_disorder
  'aortic_stenosis',             -- consolidating into valve_disorder
  'mitral_insufficiency'         -- consolidating into valve_disorder
);

-- Delete the duplicate/symptom conditions
DELETE FROM underwriting_health_conditions WHERE code IN (
  'peripheral_vascular_disease',
  'diabetes_early_onset',
  'diabetes_with_complications',
  'asthma_severe',
  'rheumatoid_arthritis_severe',
  'multiple_myeloma',
  'lymphoma',
  'melanoma',
  'edema_fluid_retention',
  'nausea',
  'hepatitis_a_e',
  'aortic_insufficiency',
  'aortic_stenosis',
  'mitral_insufficiency'
);

-- ============================================================================
-- PHASE 2: UPDATE CONDITIONS WITH MISSING FOLLOW-UP SCHEMAS
-- ============================================================================

-- Congestive Heart Failure
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "diagnosis_date",
        "type": "date",
        "label": "Date of diagnosis",
        "required": true
      },
      {
        "id": "cause",
        "type": "select",
        "label": "Cause of heart failure",
        "options": ["Coronary artery disease", "High blood pressure", "Cardiomyopathy", "Heart valve disease", "Unknown", "Other"],
        "required": true
      },
      {
        "id": "ejection_fraction",
        "type": "select",
        "label": "Most recent ejection fraction (EF)",
        "options": ["55% or higher (Normal)", "40-54% (Mildly reduced)", "30-39% (Moderately reduced)", "Below 30% (Severely reduced)", "Unknown"],
        "required": true
      },
      {
        "id": "nyha_class",
        "type": "select",
        "label": "NYHA functional class",
        "options": ["Class I - No symptoms", "Class II - Mild symptoms with activity", "Class III - Moderate symptoms, limited activity", "Class IV - Severe symptoms at rest"],
        "required": true
      },
      {
        "id": "hospitalizations_2yr",
        "type": "select",
        "label": "Hospitalizations for CHF in past 2 years",
        "options": ["0", "1", "2", "3 or more"],
        "required": true
      },
      {
        "id": "devices",
        "type": "multiselect",
        "label": "Any implanted devices?",
        "options": ["Pacemaker", "ICD (Defibrillator)", "CRT (Cardiac resynchronization)", "LVAD (Ventricular assist device)", "None"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 8,
  sort_order = 7
WHERE code = 'congestive_heart_failure';

-- Heart Surgery History
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "surgery_type",
        "type": "multiselect",
        "label": "Type of heart surgery",
        "options": ["Coronary bypass (CABG)", "Valve repair", "Valve replacement", "Aneurysm repair", "Heart transplant", "Congenital defect repair", "Other"],
        "required": true
      },
      {
        "id": "surgery_date",
        "type": "date",
        "label": "Date of most recent surgery",
        "required": true
      },
      {
        "id": "complications",
        "type": "select",
        "label": "Any complications from surgery?",
        "options": ["No complications", "Minor complications, resolved", "Ongoing complications"],
        "required": true
      },
      {
        "id": "current_status",
        "type": "select",
        "label": "Current cardiac status",
        "options": ["Fully recovered, no limitations", "Recovered with some limitations", "Ongoing cardiac issues"],
        "required": true
      },
      {
        "id": "follow_up",
        "type": "select",
        "label": "Current follow-up schedule",
        "options": ["Annual checkups", "Every 6 months", "Every 3 months", "More frequent"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 6,
  sort_order = 8
WHERE code = 'heart_surgery';

-- Vascular Surgery
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "surgery_type",
        "type": "multiselect",
        "label": "Type of vascular surgery",
        "options": ["Carotid endarterectomy", "Aortic aneurysm repair", "Peripheral bypass", "Stent placement", "Amputation", "Other"],
        "required": true
      },
      {
        "id": "surgery_date",
        "type": "date",
        "label": "Date of most recent surgery",
        "required": true
      },
      {
        "id": "underlying_condition",
        "type": "select",
        "label": "Underlying condition",
        "options": ["Peripheral artery disease", "Aneurysm", "Blood clot", "Carotid stenosis", "Other"],
        "required": true
      },
      {
        "id": "complications",
        "type": "select",
        "label": "Any complications?",
        "options": ["None", "Minor, resolved", "Ongoing"],
        "required": true
      },
      {
        "id": "smoking_status",
        "type": "select",
        "label": "Current smoking status",
        "options": ["Never smoked", "Former smoker", "Current smoker"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 6,
  sort_order = 9
WHERE code = 'vascular_surgery';

-- Scleroderma
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "type",
        "type": "select",
        "label": "Type of scleroderma",
        "options": ["Limited (CREST syndrome)", "Diffuse systemic", "Localized (morphea)", "Unknown"],
        "required": true
      },
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
        "options": ["Skin only", "Lungs (pulmonary fibrosis)", "Heart", "Kidneys", "GI tract", "Blood vessels (Raynaud)"],
        "required": true
      },
      {
        "id": "treatment",
        "type": "multiselect",
        "label": "Current treatment",
        "options": ["Immunosuppressants", "Vasodilators", "ACE inhibitors", "Physical therapy", "No treatment"],
        "required": true
      },
      {
        "id": "progression",
        "type": "select",
        "label": "Disease progression",
        "options": ["Stable", "Slowly progressive", "Rapidly progressive"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 7,
  sort_order = 72
WHERE code = 'scleroderma';

-- Severe Mental Illness (Schizophrenia, etc.)
UPDATE underwriting_health_conditions SET
  name = 'Schizophrenia / Psychotic Disorder',
  follow_up_schema = '{
    "questions": [
      {
        "id": "type",
        "type": "select",
        "label": "Type of condition",
        "options": ["Schizophrenia", "Schizoaffective disorder", "Brief psychotic disorder", "Delusional disorder", "Other psychotic disorder"],
        "required": true
      },
      {
        "id": "diagnosis_date",
        "type": "date",
        "label": "Date first diagnosed",
        "required": true
      },
      {
        "id": "current_status",
        "type": "select",
        "label": "Current symptom status",
        "options": ["In remission, stable", "Mild symptoms, controlled", "Moderate symptoms", "Active/Severe symptoms"],
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
        "id": "treatment",
        "type": "multiselect",
        "label": "Current treatment",
        "options": ["Antipsychotic medication", "Therapy/counseling", "Case management", "No current treatment"],
        "required": true
      },
      {
        "id": "compliance",
        "type": "select",
        "label": "Treatment compliance",
        "options": ["Always compliant", "Mostly compliant", "Sometimes miss treatment", "Often non-compliant"],
        "required": true
      },
      {
        "id": "work_status",
        "type": "select",
        "label": "Current work/functional status",
        "options": ["Working full-time", "Working part-time", "Disability/unable to work", "Retired"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 7,
  sort_order = 43
WHERE code = 'severe_mental_illness';

-- Diverticulitis
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "diagnosis_date",
        "type": "date",
        "label": "Date first diagnosed",
        "required": true
      },
      {
        "id": "type",
        "type": "select",
        "label": "Current status",
        "options": ["Diverticulosis only (no inflammation)", "History of diverticulitis, now resolved", "Recurrent diverticulitis", "Complicated diverticulitis"],
        "required": true
      },
      {
        "id": "episodes",
        "type": "select",
        "label": "Number of diverticulitis episodes",
        "options": ["1", "2-3", "4 or more", "None - just diverticulosis"],
        "required": true
      },
      {
        "id": "complications",
        "type": "multiselect",
        "label": "Any complications?",
        "options": ["Abscess", "Perforation", "Fistula", "Bowel obstruction", "None"],
        "required": true
      },
      {
        "id": "surgery",
        "type": "select",
        "label": "Surgery performed?",
        "options": ["No", "Yes - partial colectomy", "Yes - with colostomy"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 3,
  sort_order = 53
WHERE code = 'diverticulitis';

-- Gallbladder Disorders
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "type",
        "type": "select",
        "label": "Type of gallbladder issue",
        "options": ["Gallstones (asymptomatic)", "Gallstones (symptomatic)", "Cholecystitis (inflammation)", "Gallbladder polyps", "Gallbladder removed"],
        "required": true
      },
      {
        "id": "diagnosis_date",
        "type": "date",
        "label": "Date of diagnosis/surgery",
        "required": true
      },
      {
        "id": "surgery",
        "type": "select",
        "label": "Cholecystectomy (removal)?",
        "options": ["No, managing conservatively", "Yes, laparoscopic", "Yes, open surgery", "Scheduled for surgery"],
        "required": true
      },
      {
        "id": "complications",
        "type": "select",
        "label": "Any complications?",
        "options": ["None", "Bile duct injury", "Pancreatitis", "Other"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 2,
  sort_order = 54
WHERE code = 'gallbladder_disorders';

-- Gastritis (rename to GERD/Gastritis)
UPDATE underwriting_health_conditions SET
  name = 'GERD / Gastritis / Acid Reflux',
  follow_up_schema = '{
    "questions": [
      {
        "id": "type",
        "type": "select",
        "label": "Primary condition",
        "options": ["GERD (acid reflux)", "Gastritis", "Peptic ulcer", "Barrett esophagus", "Hiatal hernia"],
        "required": true
      },
      {
        "id": "severity",
        "type": "select",
        "label": "Severity",
        "options": ["Mild - occasional symptoms", "Moderate - regular symptoms", "Severe - daily symptoms", "Controlled on medication"],
        "required": true
      },
      {
        "id": "treatment",
        "type": "select",
        "label": "Current treatment",
        "options": ["Lifestyle changes only", "Over-the-counter antacids", "Prescription PPI (omeprazole, etc.)", "Surgery (fundoplication)"],
        "required": true
      },
      {
        "id": "complications",
        "type": "multiselect",
        "label": "Any complications?",
        "options": ["Barrett esophagus", "Esophageal stricture", "GI bleeding", "None"],
        "required": true
      },
      {
        "id": "endoscopy",
        "type": "select",
        "label": "Had endoscopy?",
        "options": ["No", "Yes, normal", "Yes, found Barrett", "Yes, found ulcer/other"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 2,
  sort_order = 55
WHERE code = 'gastritis';

-- Narcolepsy
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "diagnosis_date",
        "type": "date",
        "label": "Date of diagnosis",
        "required": true
      },
      {
        "id": "type",
        "type": "select",
        "label": "Type of narcolepsy",
        "options": ["Type 1 (with cataplexy)", "Type 2 (without cataplexy)", "Unknown"],
        "required": true
      },
      {
        "id": "symptoms",
        "type": "multiselect",
        "label": "Current symptoms",
        "options": ["Excessive daytime sleepiness", "Cataplexy (sudden muscle weakness)", "Sleep paralysis", "Hallucinations", "Disrupted nighttime sleep"],
        "required": true
      },
      {
        "id": "treatment",
        "type": "multiselect",
        "label": "Current treatment",
        "options": ["Stimulant medication", "Sodium oxybate (Xyrem)", "Antidepressants", "Scheduled naps", "No treatment"],
        "required": true
      },
      {
        "id": "driving",
        "type": "select",
        "label": "Driving status",
        "options": ["Drives without restrictions", "Drives with precautions", "Does not drive"],
        "required": true
      },
      {
        "id": "work_impact",
        "type": "select",
        "label": "Impact on work",
        "options": ["None - working normally", "Some accommodations needed", "Significant limitations", "Unable to work"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 4,
  sort_order = 63
WHERE code = 'narcolepsy';

-- Paralysis
UPDATE underwriting_health_conditions SET
  follow_up_schema = '{
    "questions": [
      {
        "id": "type",
        "type": "select",
        "label": "Type of paralysis",
        "options": ["Paraplegia (lower body)", "Quadriplegia/Tetraplegia", "Hemiplegia (one side)", "Monoplegia (one limb)", "Partial/Incomplete"],
        "required": true
      },
      {
        "id": "cause",
        "type": "select",
        "label": "Cause of paralysis",
        "options": ["Spinal cord injury", "Stroke", "Multiple sclerosis", "Cerebral palsy", "ALS", "Guillain-Barré", "Unknown", "Other"],
        "required": true
      },
      {
        "id": "onset_date",
        "type": "date",
        "label": "Date of onset",
        "required": true
      },
      {
        "id": "level",
        "type": "select",
        "label": "If spinal injury, level",
        "options": ["Cervical (C1-C7)", "Thoracic (T1-T12)", "Lumbar (L1-L5)", "Sacral", "N/A"],
        "required": false
      },
      {
        "id": "mobility",
        "type": "select",
        "label": "Current mobility",
        "options": ["Independent with aids", "Manual wheelchair", "Power wheelchair", "Bed-bound"],
        "required": true
      },
      {
        "id": "complications",
        "type": "multiselect",
        "label": "Complications",
        "options": ["Pressure sores", "UTIs", "Respiratory issues", "Autonomic dysreflexia", "Chronic pain", "None"],
        "required": true
      },
      {
        "id": "assistance",
        "type": "select",
        "label": "Level of assistance needed",
        "options": ["Independent", "Part-time caregiver", "Full-time caregiver", "24-hour care"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 8,
  sort_order = 64
WHERE code = 'paralysis';

-- Opioid Usage
UPDATE underwriting_health_conditions SET
  name = 'Chronic Opioid/Pain Medication Use',
  follow_up_schema = '{
    "questions": [
      {
        "id": "reason",
        "type": "select",
        "label": "Reason for opioid use",
        "options": ["Chronic pain - back/spine", "Chronic pain - arthritis", "Chronic pain - neuropathy", "Cancer-related pain", "Post-surgical", "Other chronic condition"],
        "required": true
      },
      {
        "id": "duration",
        "type": "select",
        "label": "Duration of opioid use",
        "options": ["Less than 6 months", "6 months - 1 year", "1-3 years", "3+ years"],
        "required": true
      },
      {
        "id": "medication",
        "type": "select",
        "label": "Type of opioid medication",
        "options": ["Tramadol", "Codeine", "Hydrocodone (Vicodin)", "Oxycodone (Percocet, OxyContin)", "Morphine", "Fentanyl patch", "Methadone (for pain)"],
        "required": true
      },
      {
        "id": "dosage_trend",
        "type": "select",
        "label": "Dosage trend",
        "options": ["Stable/same dose", "Decreasing (tapering)", "Increasing over time"],
        "required": true
      },
      {
        "id": "prescriber",
        "type": "select",
        "label": "Who prescribes?",
        "options": ["Pain management specialist", "Primary care physician", "Oncologist", "Multiple doctors"],
        "required": true
      },
      {
        "id": "addiction_history",
        "type": "select",
        "label": "Any history of opioid addiction/misuse?",
        "options": ["No", "Yes, in the past", "Currently in recovery program"],
        "required": true
      }
    ]
  }'::jsonb,
  risk_weight = 5,
  sort_order = 92
WHERE code = 'opioid_usage';

-- ============================================================================
-- PHASE 3: ADD MISSING COMMON CONDITIONS
-- ============================================================================

-- NEW: PTSD (separate from anxiety for proper underwriting)
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('ptsd', 'PTSD (Post-Traumatic Stress Disorder)', 'mental_health', 5, 44, '{
  "questions": [
    {
      "id": "trauma_type",
      "type": "select",
      "label": "Type of traumatic event",
      "options": ["Combat/Military", "Assault/Violence", "Accident", "Natural disaster", "Childhood trauma", "Medical trauma", "Other/Prefer not to say"],
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
      "options": ["Mild - manageable symptoms", "Moderate - some daily impact", "Severe - significant impairment", "In remission"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Therapy (CBT, EMDR, etc.)", "Antidepressant medication", "Anti-anxiety medication", "Support group", "No current treatment"],
      "required": true
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Psychiatric hospitalizations",
      "options": ["None", "1", "2 or more"],
      "required": true
    },
    {
      "id": "work_impact",
      "type": "select",
      "label": "Impact on work",
      "options": ["None - working normally", "Some limitations", "On disability leave", "Unable to work"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: ADD/ADHD
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('adhd', 'ADD / ADHD', 'mental_health', 2, 45, '{
  "questions": [
    {
      "id": "diagnosis_age",
      "type": "select",
      "label": "Age at diagnosis",
      "options": ["Childhood (under 12)", "Adolescence (12-18)", "Adulthood (18+)"],
      "required": true
    },
    {
      "id": "type",
      "type": "select",
      "label": "Type",
      "options": ["Primarily inattentive (ADD)", "Primarily hyperactive", "Combined type"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "select",
      "label": "Current treatment",
      "options": ["Stimulant medication (Adderall, Ritalin, etc.)", "Non-stimulant medication (Strattera, etc.)", "Therapy/coaching only", "No current treatment"],
      "required": true
    },
    {
      "id": "controlled",
      "type": "select",
      "label": "Are symptoms well controlled?",
      "options": ["Yes, well managed", "Mostly controlled", "Partially controlled", "Not well controlled"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Eating Disorders
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('eating_disorder', 'Eating Disorder', 'mental_health', 6, 46, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of eating disorder",
      "options": ["Anorexia nervosa", "Bulimia nervosa", "Binge eating disorder", "ARFID", "Other"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date first diagnosed",
      "required": true
    },
    {
      "id": "current_status",
      "type": "select",
      "label": "Current status",
      "options": ["In full recovery", "In partial recovery", "Active - mild", "Active - moderate/severe"],
      "required": true
    },
    {
      "id": "lowest_bmi",
      "type": "select",
      "label": "Lowest BMI during illness",
      "options": ["Above 18", "16-18", "14-16", "Below 14", "Unknown"],
      "required": true
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Ever hospitalized?",
      "options": ["No", "Yes, once", "Yes, multiple times"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Treatment history",
      "options": ["Inpatient treatment", "Residential treatment", "Intensive outpatient", "Outpatient therapy", "Nutritional counseling"],
      "required": true
    },
    {
      "id": "medical_complications",
      "type": "multiselect",
      "label": "Medical complications",
      "options": ["Heart problems", "Electrolyte imbalances", "Bone loss (osteoporosis)", "Kidney problems", "Dental damage", "None"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Kidney Stones
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('kidney_stones', 'Kidney Stones', 'renal', 2, 81, '{
  "questions": [
    {
      "id": "first_episode",
      "type": "date",
      "label": "Date of first episode",
      "required": true
    },
    {
      "id": "number_episodes",
      "type": "select",
      "label": "Total number of episodes",
      "options": ["1", "2-3", "4-5", "More than 5"],
      "required": true
    },
    {
      "id": "stone_type",
      "type": "select",
      "label": "Type of stones (if known)",
      "options": ["Calcium oxalate", "Calcium phosphate", "Uric acid", "Struvite", "Cystine", "Unknown"],
      "required": false
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Treatment received",
      "options": ["Passed naturally", "Lithotripsy (shock waves)", "Ureteroscopy", "Surgery", "Stent placement"],
      "required": true
    },
    {
      "id": "prevention",
      "type": "select",
      "label": "On prevention treatment?",
      "options": ["Yes, medication", "Yes, dietary changes", "No prevention measures"],
      "required": true
    },
    {
      "id": "complications",
      "type": "multiselect",
      "label": "Any complications?",
      "options": ["UTI/Infection", "Hydronephrosis", "Chronic kidney problems", "None"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Polycystic Kidney Disease
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('pkd', 'Polycystic Kidney Disease (PKD)', 'renal', 6, 82, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of PKD",
      "options": ["Autosomal dominant (ADPKD)", "Autosomal recessive (ARPKD)", "Unknown"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "kidney_function",
      "type": "select",
      "label": "Current kidney function (GFR stage)",
      "options": ["Stage 1-2 (normal/mild)", "Stage 3a (mild-moderate)", "Stage 3b (moderate)", "Stage 4 (severe)", "Stage 5/Dialysis"],
      "required": true
    },
    {
      "id": "complications",
      "type": "multiselect",
      "label": "Complications",
      "options": ["High blood pressure", "Kidney infections", "Liver cysts", "Brain aneurysm", "Kidney pain", "None yet"],
      "required": true
    },
    {
      "id": "dialysis",
      "type": "select",
      "label": "On dialysis?",
      "options": ["No", "Yes", "Had kidney transplant"],
      "required": true
    },
    {
      "id": "family_history",
      "type": "select",
      "label": "Family history of PKD?",
      "options": ["Yes - parent(s) affected", "Yes - sibling(s) affected", "No known family history"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Heart Valve Disorder (consolidated)
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('valve_disorder', 'Heart Valve Disorder', 'cardiovascular', 5, 10, '{
  "questions": [
    {
      "id": "valve_affected",
      "type": "multiselect",
      "label": "Which valve(s) affected?",
      "options": ["Mitral valve", "Aortic valve", "Tricuspid valve", "Pulmonary valve"],
      "required": true
    },
    {
      "id": "type",
      "type": "select",
      "label": "Type of valve problem",
      "options": ["Stenosis (narrowing)", "Regurgitation (leaking)", "Prolapse", "Both stenosis and regurgitation"],
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Severity",
      "options": ["Mild (trace/1+)", "Moderate (2+)", "Moderate-severe (3+)", "Severe (4+)"],
      "required": true
    },
    {
      "id": "cause",
      "type": "select",
      "label": "Cause",
      "options": ["Congenital", "Rheumatic heart disease", "Degenerative/Age-related", "Infection (endocarditis)", "Unknown", "Other"],
      "required": true
    },
    {
      "id": "symptoms",
      "type": "select",
      "label": "Symptoms",
      "options": ["None (asymptomatic)", "Mild - occasional symptoms", "Moderate - regular symptoms", "Severe - limiting symptoms"],
      "required": true
    },
    {
      "id": "surgery",
      "type": "select",
      "label": "Had valve surgery?",
      "options": ["No", "Yes - repair", "Yes - mechanical valve replacement", "Yes - bioprosthetic valve", "Scheduled for surgery"],
      "required": true
    },
    {
      "id": "follow_up",
      "type": "select",
      "label": "Follow-up schedule",
      "options": ["Monitoring only (echo every 1-2 years)", "More frequent monitoring", "Under cardiology care"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Aneurysm
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('aneurysm', 'Aneurysm', 'cardiovascular', 7, 11, '{
  "questions": [
    {
      "id": "location",
      "type": "select",
      "label": "Location of aneurysm",
      "options": ["Abdominal aortic (AAA)", "Thoracic aortic", "Cerebral (brain)", "Peripheral artery", "Multiple locations"],
      "required": true
    },
    {
      "id": "size",
      "type": "select",
      "label": "Size (if known)",
      "options": ["Small (< 4cm / < 7mm for cerebral)", "Medium", "Large (> 5.5cm / > 10mm for cerebral)", "Unknown"],
      "required": true
    },
    {
      "id": "status",
      "type": "select",
      "label": "Current status",
      "options": ["Monitoring only - stable", "Monitoring - growing", "Repaired - endovascular (stent)", "Repaired - open surgery", "Ruptured in past"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date discovered/repaired",
      "required": true
    },
    {
      "id": "symptoms",
      "type": "select",
      "label": "Symptoms",
      "options": ["None (incidental finding)", "Mild symptoms", "Significant symptoms"],
      "required": true
    },
    {
      "id": "risk_factors",
      "type": "multiselect",
      "label": "Risk factors present",
      "options": ["Smoking history", "High blood pressure", "Family history", "Connective tissue disorder", "None of these"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Heart Murmur
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('heart_murmur', 'Heart Murmur', 'cardiovascular', 2, 12, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of murmur",
      "options": ["Innocent/Functional (no heart problem)", "Associated with valve issue", "Associated with other heart condition", "Unknown - under evaluation"],
      "required": true
    },
    {
      "id": "evaluated",
      "type": "select",
      "label": "Has murmur been evaluated?",
      "options": ["Yes - echocardiogram done, normal", "Yes - echocardiogram found valve issue", "Yes - echocardiogram found other issue", "No - just heard on exam"],
      "required": true
    },
    {
      "id": "grade",
      "type": "select",
      "label": "Grade of murmur (if known)",
      "options": ["Grade 1-2 (soft)", "Grade 3-4 (moderate)", "Grade 5-6 (loud)", "Unknown"],
      "required": false
    },
    {
      "id": "underlying_cause",
      "type": "select",
      "label": "Underlying cause (if any)",
      "options": ["None - innocent murmur", "Mitral valve prolapse", "Other valve problem", "Congenital heart defect", "Other"],
      "required": true
    },
    {
      "id": "follow_up",
      "type": "select",
      "label": "Follow-up required?",
      "options": ["No follow-up needed", "Periodic monitoring", "Under cardiology care"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Cardiomyopathy
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('cardiomyopathy', 'Cardiomyopathy', 'cardiovascular', 7, 13, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of cardiomyopathy",
      "options": ["Dilated (DCM)", "Hypertrophic (HCM)", "Restrictive", "Arrhythmogenic (ARVC)", "Takotsubo (stress)", "Unknown"],
      "required": true
    },
    {
      "id": "cause",
      "type": "select",
      "label": "Known cause",
      "options": ["Genetic/Familial", "Viral infection", "Alcohol-related", "Chemotherapy-related", "Pregnancy-related", "Unknown/Idiopathic"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "ejection_fraction",
      "type": "select",
      "label": "Most recent ejection fraction",
      "options": ["55%+ (Normal)", "40-54% (Mildly reduced)", "30-39% (Moderately reduced)", "Below 30% (Severely reduced)", "Unknown"],
      "required": true
    },
    {
      "id": "symptoms",
      "type": "select",
      "label": "Current symptoms",
      "options": ["None", "Mild - occasional", "Moderate - regular", "Severe - limiting"],
      "required": true
    },
    {
      "id": "devices",
      "type": "multiselect",
      "label": "Implanted devices",
      "options": ["ICD (Defibrillator)", "Pacemaker", "CRT device", "LVAD", "None"],
      "required": true
    },
    {
      "id": "family_history",
      "type": "select",
      "label": "Family history of cardiomyopathy or sudden death?",
      "options": ["Yes", "No", "Unknown"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Migraines
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('migraines', 'Migraines / Chronic Headaches', 'neurological', 2, 65, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of headaches",
      "options": ["Migraine with aura", "Migraine without aura", "Chronic daily headache", "Cluster headaches", "Tension headaches"],
      "required": true
    },
    {
      "id": "frequency",
      "type": "select",
      "label": "Frequency of headaches",
      "options": ["Rarely (few per year)", "Monthly", "Weekly", "Several per week", "Daily"],
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Typical severity",
      "options": ["Mild - can function", "Moderate - somewhat limiting", "Severe - incapacitating"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["OTC pain relievers only", "Prescription abortive (triptan)", "Preventive medication daily", "Botox injections", "CGRP inhibitor (Aimovig, etc.)", "No treatment"],
      "required": true
    },
    {
      "id": "er_visits",
      "type": "select",
      "label": "ER visits for headaches in past year",
      "options": ["0", "1-2", "3 or more"],
      "required": true
    },
    {
      "id": "work_miss",
      "type": "select",
      "label": "Work days missed per month due to headaches",
      "options": ["None", "1-2 days", "3-5 days", "More than 5 days"],
      "required": true
    },
    {
      "id": "neuroimaging",
      "type": "select",
      "label": "Had brain imaging (CT/MRI)?",
      "options": ["Yes, normal", "Yes, abnormal", "No"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Neuropathy
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('neuropathy', 'Peripheral Neuropathy', 'neurological', 4, 66, '{
  "questions": [
    {
      "id": "cause",
      "type": "select",
      "label": "Known cause",
      "options": ["Diabetes", "Chemotherapy", "B12 deficiency", "Alcohol-related", "Autoimmune", "Hereditary", "Unknown/Idiopathic"],
      "required": true
    },
    {
      "id": "type",
      "type": "select",
      "label": "Type of neuropathy",
      "options": ["Sensory (numbness, tingling)", "Motor (weakness)", "Autonomic (affecting organs)", "Mixed"],
      "required": true
    },
    {
      "id": "distribution",
      "type": "select",
      "label": "Areas affected",
      "options": ["Feet only", "Feet and hands", "Legs", "Arms", "Widespread"],
      "required": true
    },
    {
      "id": "progression",
      "type": "select",
      "label": "Is it progressing?",
      "options": ["Stable", "Slowly worsening", "Rapidly worsening", "Improving"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Pain medication", "Gabapentin/Lyrica", "Physical therapy", "Treating underlying cause", "No treatment"],
      "required": true
    },
    {
      "id": "functional_impact",
      "type": "select",
      "label": "Impact on daily function",
      "options": ["Minimal", "Some limitations", "Significant limitations", "Severe - mobility aids needed"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Dementia/Alzheimer's
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('dementia', 'Dementia / Alzheimer''s Disease', 'neurological', 9, 67, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of dementia",
      "options": ["Alzheimer disease", "Vascular dementia", "Lewy body dementia", "Frontotemporal dementia", "Mixed", "Mild cognitive impairment (MCI)", "Unknown type"],
      "required": true
    },
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
      "options": ["Early/Mild - independent", "Moderate - needs some assistance", "Moderately severe - needs significant help", "Severe - full-time care needed"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Cholinesterase inhibitor (Aricept, etc.)", "Memantine (Namenda)", "New treatments (Leqembi, etc.)", "No medication"],
      "required": true
    },
    {
      "id": "living_situation",
      "type": "select",
      "label": "Current living situation",
      "options": ["Living independently", "Living with family/caregiver", "Assisted living", "Memory care facility", "Nursing home"],
      "required": true
    },
    {
      "id": "wandering",
      "type": "select",
      "label": "Any wandering or safety concerns?",
      "options": ["No", "Occasionally", "Yes, frequent"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Blood Clots / DVT / PE
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('blood_clots', 'Blood Clots (DVT / Pulmonary Embolism)', 'cardiovascular', 5, 14, '{
  "questions": [
    {
      "id": "type",
      "type": "multiselect",
      "label": "Type of blood clot(s)",
      "options": ["DVT (deep vein thrombosis - leg)", "Pulmonary embolism (PE - lung)", "Superficial vein clot", "Clot in other location"],
      "required": true
    },
    {
      "id": "number_events",
      "type": "select",
      "label": "Number of clot events",
      "options": ["1", "2", "3 or more"],
      "required": true
    },
    {
      "id": "most_recent",
      "type": "date",
      "label": "Date of most recent event",
      "required": true
    },
    {
      "id": "cause",
      "type": "select",
      "label": "Known trigger/cause",
      "options": ["Provoked - surgery", "Provoked - immobility (travel, hospitalization)", "Provoked - hormones (birth control, HRT)", "Provoked - cancer", "Unprovoked (no known cause)", "Genetic clotting disorder"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "select",
      "label": "Current blood thinner status",
      "options": ["Completed course, no longer on thinners", "Currently on blood thinners - short term", "Currently on blood thinners - lifelong", "IVC filter placed"],
      "required": true
    },
    {
      "id": "clotting_disorder",
      "type": "select",
      "label": "Tested for clotting disorders?",
      "options": ["Yes - normal", "Yes - Factor V Leiden", "Yes - other clotting disorder found", "No testing done"],
      "required": true
    },
    {
      "id": "complications",
      "type": "multiselect",
      "label": "Any long-term complications?",
      "options": ["Post-thrombotic syndrome", "Chronic leg swelling", "Pulmonary hypertension", "None"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Chronic Bronchitis / Pulmonary Fibrosis
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('chronic_lung_disease', 'Chronic Bronchitis / Pulmonary Fibrosis', 'respiratory', 6, 33, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of lung condition",
      "options": ["Chronic bronchitis", "Pulmonary fibrosis (IPF)", "Pulmonary fibrosis (other type)", "Bronchiectasis", "Interstitial lung disease"],
      "required": true
    },
    {
      "id": "diagnosis_date",
      "type": "date",
      "label": "Date of diagnosis",
      "required": true
    },
    {
      "id": "cause",
      "type": "select",
      "label": "Known cause",
      "options": ["Smoking-related", "Occupational exposure", "Autoimmune/Rheumatoid", "Idiopathic (unknown)", "Other"],
      "required": true
    },
    {
      "id": "oxygen",
      "type": "select",
      "label": "Supplemental oxygen use",
      "options": ["No", "With exertion only", "At night", "Continuously"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Inhalers", "Pirfenidone (Esbriet)", "Nintedanib (Ofev)", "Pulmonary rehab", "No specific treatment"],
      "required": true
    },
    {
      "id": "lung_function",
      "type": "select",
      "label": "Lung function (FVC if known)",
      "options": ["Mild impairment (>80%)", "Moderate (50-80%)", "Severe (<50%)", "Unknown"],
      "required": true
    },
    {
      "id": "transplant_eval",
      "type": "select",
      "label": "Evaluated for lung transplant?",
      "options": ["No", "Yes - not a candidate", "Yes - on waiting list", "Had transplant"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: IBS (Irritable Bowel Syndrome)
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('ibs', 'Irritable Bowel Syndrome (IBS)', 'gastrointestinal', 2, 56, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of IBS",
      "options": ["IBS-D (diarrhea predominant)", "IBS-C (constipation predominant)", "IBS-M (mixed)", "Unknown type"],
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
      "label": "Typical severity",
      "options": ["Mild - occasional symptoms", "Moderate - regular symptoms", "Severe - significantly impacts daily life"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current management",
      "options": ["Diet modifications", "Fiber supplements", "Prescription medication", "Probiotics", "No treatment"],
      "required": true
    },
    {
      "id": "testing",
      "type": "select",
      "label": "Diagnostic testing done?",
      "options": ["Yes - colonoscopy normal", "Yes - other tests normal", "No extensive testing", "Testing found another condition"],
      "required": true
    },
    {
      "id": "work_impact",
      "type": "select",
      "label": "Impact on work",
      "options": ["None", "Occasional missed days", "Frequent missed days", "Unable to work"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Pancreatitis
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('pancreatitis', 'Pancreatitis', 'gastrointestinal', 5, 57, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of pancreatitis",
      "options": ["Acute - single episode", "Acute - recurrent episodes", "Chronic pancreatitis"],
      "required": true
    },
    {
      "id": "cause",
      "type": "select",
      "label": "Known cause",
      "options": ["Gallstones", "Alcohol", "High triglycerides", "Medication", "Hereditary", "Unknown"],
      "required": true
    },
    {
      "id": "most_recent",
      "type": "date",
      "label": "Date of most recent episode",
      "required": true
    },
    {
      "id": "hospitalizations",
      "type": "select",
      "label": "Number of hospitalizations",
      "options": ["1", "2-3", "4 or more"],
      "required": true
    },
    {
      "id": "complications",
      "type": "multiselect",
      "label": "Complications",
      "options": ["Pseudocyst", "Necrosis", "Diabetes (pancreatic insufficiency)", "Chronic pain", "None"],
      "required": true
    },
    {
      "id": "current_status",
      "type": "select",
      "label": "Current status",
      "options": ["Fully recovered", "Occasional symptoms", "Chronic ongoing issues"],
      "required": true
    },
    {
      "id": "alcohol_use",
      "type": "select",
      "label": "Current alcohol use",
      "options": ["None/Abstinent", "Occasional", "Regular"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Anemia
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('anemia', 'Anemia', 'autoimmune', 3, 73, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of anemia",
      "options": ["Iron deficiency", "B12/Folate deficiency", "Anemia of chronic disease", "Hemolytic anemia", "Aplastic anemia", "Sickle cell disease", "Thalassemia", "Unknown type"],
      "required": true
    },
    {
      "id": "cause",
      "type": "select",
      "label": "Known cause",
      "options": ["Diet/nutritional", "GI blood loss", "Heavy menstruation", "Chronic kidney disease", "Autoimmune", "Genetic/hereditary", "Unknown"],
      "required": true
    },
    {
      "id": "hemoglobin",
      "type": "select",
      "label": "Most recent hemoglobin level",
      "options": ["Normal (12+ for women, 13+ for men)", "Mild anemia (10-12/10-13)", "Moderate (8-10)", "Severe (<8)", "Unknown"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Iron supplements", "B12 injections", "Erythropoietin (EPO)", "Blood transfusions", "Treating underlying cause", "No treatment needed"],
      "required": true
    },
    {
      "id": "transfusion_history",
      "type": "select",
      "label": "Blood transfusion history",
      "options": ["Never", "Once", "Occasional", "Regular/chronic"],
      "required": true
    },
    {
      "id": "status",
      "type": "select",
      "label": "Current status",
      "options": ["Resolved", "Stable on treatment", "Fluctuating", "Chronic/ongoing"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Back Problems
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('back_problems', 'Back/Spine Problems', 'other', 3, 101, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of back problem",
      "options": ["Herniated/Bulging disc", "Degenerative disc disease", "Spinal stenosis", "Sciatica", "Scoliosis", "Compression fracture", "Chronic low back pain", "Other"],
      "required": true
    },
    {
      "id": "location",
      "type": "multiselect",
      "label": "Location",
      "options": ["Cervical (neck)", "Thoracic (mid-back)", "Lumbar (lower back)", "Sacral"],
      "required": true
    },
    {
      "id": "duration",
      "type": "select",
      "label": "How long have you had this condition?",
      "options": ["Less than 6 months", "6 months - 2 years", "2-5 years", "5+ years"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Treatment received",
      "options": ["Physical therapy", "Chiropractic care", "Pain medication", "Epidural injections", "Surgery - fusion", "Surgery - discectomy", "Surgery - other", "No treatment"],
      "required": true
    },
    {
      "id": "current_symptoms",
      "type": "select",
      "label": "Current symptom level",
      "options": ["None/minimal", "Mild - occasional", "Moderate - regular", "Severe - daily limiting"],
      "required": true
    },
    {
      "id": "work_impact",
      "type": "select",
      "label": "Impact on work",
      "options": ["None", "Some limitations", "Modified duties", "Unable to work/disabled"],
      "required": true
    },
    {
      "id": "disability_claim",
      "type": "select",
      "label": "Filed disability claim for back?",
      "options": ["No", "Yes, in the past", "Yes, currently receiving"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Fibromyalgia
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('fibromyalgia', 'Fibromyalgia', 'autoimmune', 3, 74, '{
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
      "options": ["Mild - manageable symptoms", "Moderate - regular flares", "Severe - significantly limiting", "In remission"],
      "required": true
    },
    {
      "id": "symptoms",
      "type": "multiselect",
      "label": "Primary symptoms",
      "options": ["Widespread pain", "Fatigue", "Sleep problems", "Cognitive issues (fibro fog)", "Depression/anxiety", "IBS symptoms"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Pain medication", "Lyrica/Gabapentin", "Cymbalta/Savella", "Physical therapy", "Exercise program", "Sleep medication", "No treatment"],
      "required": true
    },
    {
      "id": "work_status",
      "type": "select",
      "label": "Work status",
      "options": ["Working full-time", "Working part-time", "On disability", "Not working due to fibromyalgia"],
      "required": true
    },
    {
      "id": "other_conditions",
      "type": "multiselect",
      "label": "Other conditions (common with fibro)",
      "options": ["Chronic fatigue syndrome", "IBS", "Migraines", "TMJ", "Interstitial cystitis", "None of these"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Osteoarthritis
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('osteoarthritis', 'Osteoarthritis', 'autoimmune', 2, 75, '{
  "questions": [
    {
      "id": "joints_affected",
      "type": "multiselect",
      "label": "Joints affected",
      "options": ["Knee(s)", "Hip(s)", "Spine", "Hands", "Shoulder(s)", "Ankle(s)", "Other"],
      "required": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Overall severity",
      "options": ["Mild", "Moderate", "Severe"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["OTC pain relievers", "Prescription NSAIDs", "Joint injections", "Physical therapy", "Weight management", "No treatment"],
      "required": true
    },
    {
      "id": "surgery",
      "type": "select",
      "label": "Joint replacement surgery",
      "options": ["None", "One joint replaced", "Multiple joints replaced", "Recommended but not done"],
      "required": true
    },
    {
      "id": "mobility",
      "type": "select",
      "label": "Mobility status",
      "options": ["Normal", "Some limitations", "Uses cane/walker", "Significant limitations"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Psoriasis / Psoriatic Arthritis
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('psoriasis', 'Psoriasis / Psoriatic Arthritis', 'autoimmune', 3, 76, '{
  "questions": [
    {
      "id": "type",
      "type": "select",
      "label": "Type of condition",
      "options": ["Psoriasis (skin only)", "Psoriatic arthritis", "Both psoriasis and psoriatic arthritis"],
      "required": true
    },
    {
      "id": "skin_severity",
      "type": "select",
      "label": "If psoriasis, body coverage",
      "options": ["Mild (<3% of body)", "Moderate (3-10%)", "Severe (>10%)", "N/A - no skin involvement"],
      "required": true
    },
    {
      "id": "joint_involvement",
      "type": "select",
      "label": "If arthritis, severity",
      "options": ["Mild - few joints", "Moderate - multiple joints", "Severe - significant damage", "N/A - no joint involvement"],
      "required": true
    },
    {
      "id": "treatment",
      "type": "multiselect",
      "label": "Current treatment",
      "options": ["Topical steroids", "Light therapy", "Methotrexate", "Biologic (Humira, Enbrel, etc.)", "NSAIDs", "No treatment"],
      "required": true
    },
    {
      "id": "flare_frequency",
      "type": "select",
      "label": "Frequency of flares",
      "options": ["Rare", "Few times per year", "Monthly", "Chronic/continuous"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- NEW: Tobacco/Nicotine Use
INSERT INTO underwriting_health_conditions (code, name, category, risk_weight, sort_order, follow_up_schema)
VALUES ('tobacco_use', 'Tobacco / Nicotine Use', 'substance', 4, 93, '{
  "questions": [
    {
      "id": "type",
      "type": "multiselect",
      "label": "Type of tobacco/nicotine used",
      "options": ["Cigarettes", "Cigars", "Pipe", "Chewing tobacco/snuff", "Vaping/e-cigarettes", "Nicotine patches/gum"],
      "required": true
    },
    {
      "id": "status",
      "type": "select",
      "label": "Current status",
      "options": ["Current user", "Quit less than 12 months ago", "Quit 1-2 years ago", "Quit 2-5 years ago", "Quit 5+ years ago"],
      "required": true
    },
    {
      "id": "frequency",
      "type": "select",
      "label": "If current/recent, frequency",
      "options": ["Daily", "Several times per week", "Occasionally", "Rarely"],
      "required": true
    },
    {
      "id": "amount",
      "type": "select",
      "label": "If cigarettes, average per day",
      "options": ["1-10", "11-20 (about 1 pack)", "21-40 (1-2 packs)", "More than 2 packs", "N/A - not cigarettes"],
      "required": true
    },
    {
      "id": "years_used",
      "type": "select",
      "label": "Total years of use",
      "options": ["Less than 5 years", "5-10 years", "10-20 years", "20+ years"],
      "required": true
    },
    {
      "id": "health_effects",
      "type": "multiselect",
      "label": "Any health effects?",
      "options": ["COPD/Emphysema", "Heart disease", "Cancer", "Vascular disease", "None"],
      "required": true
    }
  ]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  follow_up_schema = EXCLUDED.follow_up_schema,
  risk_weight = EXCLUDED.risk_weight,
  sort_order = EXCLUDED.sort_order;

-- Log final state
DO $$
DECLARE
  final_count INTEGER;
  category_summary TEXT;
  zero_question_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO final_count FROM underwriting_health_conditions WHERE is_active = true;

  SELECT COUNT(*) INTO zero_question_count
  FROM underwriting_health_conditions
  WHERE is_active = true
    AND (follow_up_schema = '{}'::jsonb
         OR follow_up_schema = '{"questions": []}'::jsonb
         OR jsonb_array_length(COALESCE(follow_up_schema->'questions', '[]'::jsonb)) = 0);

  SELECT string_agg(category || ': ' || cnt::text, ', ' ORDER BY category) INTO category_summary
  FROM (
    SELECT category, COUNT(*) as cnt
    FROM underwriting_health_conditions
    WHERE is_active = true
    GROUP BY category
  ) sub;

  RAISE NOTICE 'Final health conditions count: %', final_count;
  RAISE NOTICE 'Conditions with 0 questions: %', zero_question_count;
  RAISE NOTICE 'By category: %', category_summary;
END $$;

COMMIT;
