// scripts/seed-fe-express-wl-rules-v2.js
// Seeds Transamerica FE Express WL rules WITH PROPER PREDICATES
//
// CRITICAL FIX: The original script created empty predicates { root: {} }
// This version generates proper predicates based on timeframe conditions.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Transamerica carrier ID and FE Express WL product ID
const TRANSAMERICA_ID = 'cf4b8c4d-6332-44c3-8eca-c83f280ebaa0';
const FE_EXPRESS_WL_ID = '4361e8f9-5996-4518-ad9f-accce92ea842';
const IMO_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// Condition code mappings to existing health conditions
// This maps FE Express condition names to existing underwriting_health_conditions codes
const CONDITION_CODE_MAP = {
  'alcohol_drug_treatment': 'alcohol_abuse',
  'alzheimers_disease': 'alzheimers',
  'amputation_not_due_to_trauma': 'amputation_not_due_to_trauma',
  'amyotrophic_lateral_sclerosis_als': 'als',
  'aneurysm': 'aneurysm',
  'angina_cardiac_chest_pain': 'angina_cardiac_chest_pain',
  'arrhythmia': 'arrhythmia',
  'asthma': 'asthma',
  'atrial_fibrillation': 'atrial_fibrillation',
  'autism': 'autism',
  'bedridden': 'bedridden',
  'bipolar': 'bipolar_disorder',
  'black_lung': 'black_lung',
  'blood_clots_no_complications': 'blood_clots',
  'blood_disorder': 'blood_disorder',
  'bronchitis_chronic': 'bronchitis_chronic',
  'cancer_excluding_basal_cell': 'cancer',
  'cardiac_surgery': 'cardiac_surgery',
  'cardiomyopathy': 'cardiomyopathy',
  'cerebral_palsy': 'cerebral_palsy',
  'chest_pain': 'chest_pain',
  'chronic_pain': 'chronic_pain',
  'chronic_pancreatitis': 'chronic_pancreatitis',
  'circulatory_disorder': 'circulatory_disorder',
  'cirrhosis': 'cirrhosis',
  'clotting_disorder': 'clotting_disorder',
  'congestive_heart_failure_chf': 'congestive_heart_failure_chf',
  'cognitive_disorder': 'cognitive_disorder',
  'copd': 'copd',
  'coronary_artery_disease_cad': 'coronary_artery_disease',
  'creutzfeldt_jakob_disease': 'creutzfeldt_jakob_disease',
  'crohns_disease': 'crohns',
  'cystic_or_pulmonary_fibrosis': 'cystic_fibrosis',
  'defibrillator': 'defibrillator',
  'depression': 'depression',
  'dementia': 'dementia',
  'diabetic_coma': 'diabetic_coma',
  'diabetes_with_insulin_or_complications': 'diabetes',
  'down_syndrome': 'down_syndrome',
  'driving_offenses_dui_dwi_owi': 'dui_dwi',
  'drug_use': 'drug_abuse',
  'electric_scooter_cart_use': 'mobility_aid_use',
  'emphysema': 'emphysema',
  'encephalitis': 'encephalitis',
  'epilepsy': 'epilepsy',
  'felony_charges': 'felony_charges',
  'gauchers_disease': 'gauchers_disease',
  'gestational_diabetes': 'gestational_diabetes',
  'hiv_aids': 'aids_hiv',
  'heart_attack': 'heart_attack',
  'heart_disease': 'heart_disease',
  'heart_murmur': 'heart_murmur',
  'hepatitis_b_or_c': 'hepatitis_b_or_c',
  'hospice_or_home_health_care': 'hospice_care',
  'hospitalization_2_nights': 'recent_hospitalization',
  'hunter_syndrome': 'hunter_syndrome',
  'huntingtons_disease': 'huntingtons_disease',
  'incarceration_or_probation_parole': 'incarceration',
  'irregular_heart_beat': 'irregular_heartbeat',
  'kidney_dialysis': 'kidney_dialysis',
  'kidney_failure': 'kidney_failure',
  'liver_disease_disorder': 'liver_disease',
  'liver_failure': 'liver_failure',
  'lupus': 'lupus',
  'marijuana_use': 'marijuana_use',
  'memory_loss': 'memory_loss',
  'mental_health_disorder_inpatient': 'mental_health_inpatient',
  'mental_incapacity': 'mental_incapacity',
  'metastatic_recurrent_cancer': 'metastatic_cancer',
  'multiple_driving_offenses': 'multiple_driving_offenses',
  'multiple_sclerosis': 'ms',
  'muscular_dystrophy': 'muscular_dystrophy',
  'niemann_pick_disease': 'niemann_pick_disease',
  'nursing_home_assisted_living': 'nursing_homeassisted_living',
  'organ_transplant': 'organ_transplant',
  'oxygen_supplemental': 'oxygen_therapy',
  'parkinsons_disease': 'parkinsons',
  'pending_tests_surgery_hospitalization': 'pending_medical_procedure',
  'peripheral_artery_vascular_disease_pad_pvd': 'peripheral_vascular',
  'phlebitis': 'phlebitis',
  'pompe_disease': 'pompe_disease',
  'post_traumatic_stress_disorder_ptsd': 'ptsd',
  'prescribed_supplemental_oxygen': 'oxygen_therapy',
  'pulmonary_hypertension': 'pulmonary_hypertension',
  'reckless_driving_dwi_owi': 'reckless_driving',
  'respiratory_disease_chronic': 'respiratory_disease_chronic',
  'rheumatoid_arthritis': 'rheumatoid_arthritis',
  'sarcoidosis_not_affecting_lungs': 'sarcoidosis_not_affecting_lungs',
  'sarcoidosis_affecting_lungs': 'sarcoidosis_affecting_lungs',
  'schizophrenia': 'schizophrenia',
  'seizures': 'seizures',
  'sickle_cell_anemia': 'sickle_cell_anemia',
  'sleep_apnea_cpap_without_supplemental_oxygen': 'sleep_apnea',
  'stroke_tia_cva': 'stroke',
  'suicide_attempt': 'suicide_attempt',
  'systemic_lupus_erythematosus_sle': 'lupus',
  'terminal_illness': 'terminal_illness',
  'tuberculosis': 'tuberculosis_recovered',
  'ulcerative_colitis': 'ulcerative_colitis',
  'wasting_syndrome': 'wasting_syndrome',
  'wheelchair_use': 'wheelchair_bound',
  'wilsons_disease': 'wilsons_disease',
  'wiskott_aldrich_syndrome': 'wiskott_aldrich_syndrome',
};

// All conditions from the PDF with proper predicates
const CONDITIONS = [
  // Page 1
  ['Alcohol/drug treatment', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Alzheimer\'s disease', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Amputation, not due to trauma', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Amyotrophic lateral sclerosis (ALS)', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Aneurysm', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Angina (cardiac chest pain)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Arrhythmia', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Asthma', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Atrial fibrillation', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Autism', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Bedridden', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Bipolar', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Black lung', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Blood clots (no complications)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Blood disorder', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Bronchitis (chronic)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Cancer (excluding basal cell)', [
    { timeframe: 'never_treated', decision: 'decline', priority: 5 },
    { timeframe: 'within_2_years', decision: 'decline', priority: 6 },
    { timeframe: '2_to_4_years', decision: 'graded', priority: 7 },
    { timeframe: 'over_4_years', decision: 'select', priority: 10 },
  ]],
  ['Cardiac surgery', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Cardiomyopathy', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Cerebral palsy', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Chest pain', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Chronic pain', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Chronic pancreatitis', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Circulatory disorder', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Cirrhosis', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Clotting disorder', [{ timeframe: 'any', decision: 'decline', priority: 10 }]],
  ['Congestive heart failure (CHF)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Cognitive disorder', [{ timeframe: 'any', decision: 'decline', priority: 10 }]],
  ['COPD', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Coronary artery disease (CAD)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Creutzfeldt-Jakob disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Crohn\'s disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Cystic or pulmonary fibrosis', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Defibrillator', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],

  // Page 2
  ['Depression', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Dementia', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Diabetic coma', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Diabetes with insulin or complications', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Down syndrome', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Driving offenses (DUI/DWI/OWI)', [
    { timeframe: 'within_2_years', decision: 'graded', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Drug use', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Electric scooter/cart use', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Emphysema', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Encephalitis', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Epilepsy', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Felony charges', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Gaucher\'s disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Gestational diabetes', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['HIV/AIDS', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Heart attack', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Heart disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Heart murmur', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Hepatitis B or C', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Hospice or home health care', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Hospitalization (2+ nights)', [
    { timeframe: 'within_12_months', decision: 'decline', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Hunter syndrome', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Huntington\'s disease', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Incarceration or probation/parole', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Irregular heart beat', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Kidney dialysis', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Kidney failure', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Liver disease/disorder', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Liver failure', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Lupus', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Marijuana use', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Memory loss', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Mental health disorder (inpatient)', [
    { timeframe: 'within_2_years', decision: 'graded', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Mental incapacity', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Metastatic/recurrent cancer', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Multiple driving offenses', [{ timeframe: 'any', decision: 'select', priority: 10 }]],

  // Page 3
  ['Multiple sclerosis', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Muscular dystrophy', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Niemann-Pick disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Nursing home/assisted living', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Organ transplant', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Oxygen (supplemental)', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Parkinson\'s disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Pending tests/surgery/hospitalization', [
    { timeframe: 'within_6_months', decision: 'decline', priority: 5 },
    { timeframe: 'after_6_months', decision: 'select', priority: 10 },
  ]],
  ['Peripheral artery/vascular disease (PAD/PVD)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Phlebitis', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Pompe disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Post-traumatic stress disorder (PTSD)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Prescribed supplemental oxygen', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Pulmonary hypertension', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Reckless driving/DWI/OWI', [
    { timeframe: 'within_2_years', decision: 'graded', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Respiratory disease (chronic)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Rheumatoid arthritis', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Sarcoidosis (not affecting lungs)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Sarcoidosis (affecting lungs)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Schizophrenia', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Seizures', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Sickle cell anemia', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Sleep apnea (CPAP without supplemental oxygen)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Stroke/TIA/CVA', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Suicide attempt', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Systemic lupus erythematosus (SLE)', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Terminal illness', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Tuberculosis', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Ulcerative colitis', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Wasting syndrome', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Wheelchair use', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Wilson\'s disease', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
  ['Wiskott-Aldrich syndrome', [{ timeframe: 'any', decision: 'select', priority: 10 }]],
];

// Generate a condition code from the name
function generateConditionCode(name) {
  return name
    .toLowerCase()
    .replace(/[()\/',.]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

// Map decision to eligibility
function mapToEligibility(decision) {
  switch (decision) {
    case 'select': return 'eligible';
    case 'graded': return 'eligible';
    case 'decline': return 'ineligible';
    default: return 'refer';
  }
}

// Map decision to health class
function mapToHealthClass(decision) {
  switch (decision) {
    case 'select': return 'standard'; // Immediate coverage
    case 'graded': return 'substandard'; // Graded benefit (2yr waiting)
    case 'decline': return 'decline';
    default: return 'refer';
  }
}

// Generate timeframe display text
function getTimeframeText(timeframe) {
  const map = {
    'within_2_years': 'within 2 years',
    'after_2_years': 'after 2 years',
    'within_12_months': 'within 12 months',
    'after_12_months': 'after 12 months',
    'within_6_months': 'within 6 months',
    'after_6_months': 'after 6 months',
    '2_to_4_years': '2-4 years ago',
    'over_4_years': 'over 4 years ago',
    'never_treated': 'never treated',
    'current': 'currently',
    'ever': 'ever',
    'any': 'any',
  };
  return map[timeframe] || timeframe || 'any';
}

// Generate rule name
function generateRuleName(conditionName, timeframe, decision) {
  const decisionLabel = {
    'select': 'Select (Immediate)',
    'graded': 'Graded (2yr Wait)',
    'decline': 'Decline',
  }[decision] || decision;

  if (timeframe && timeframe !== 'ever' && timeframe !== 'any') {
    return `${conditionName} - ${getTimeframeText(timeframe)} → ${decisionLabel}`;
  }
  return `${conditionName} → ${decisionLabel}`;
}

// Generate reason text
function generateReason(conditionName, timeframe, decision) {
  const timeframeText = getTimeframeText(timeframe);

  switch (decision) {
    case 'select':
      if (timeframe && timeframe !== 'ever' && timeframe !== 'any') {
        return `Applicants with ${conditionName} (${timeframeText}) qualify for Select (immediate coverage) per FE Express WL guidelines.`;
      }
      return `Applicants with ${conditionName} qualify for Select (immediate coverage) per FE Express WL guidelines.`;
    case 'graded':
      if (timeframe && timeframe !== 'ever' && timeframe !== 'any') {
        return `Applicants with ${conditionName} (${timeframeText}) qualify for Graded coverage (2-year waiting period) per FE Express WL guidelines.`;
      }
      return `Applicants with ${conditionName} qualify for Graded coverage (2-year waiting period) per FE Express WL guidelines.`;
    case 'decline':
      if (timeframe && timeframe !== 'ever' && timeframe !== 'any') {
        return `Applicants with ${conditionName} (${timeframeText}) are declined for FE Express WL coverage.`;
      }
      return `Applicants with ${conditionName} are declined for FE Express WL coverage.`;
    default:
      return `Per FE Express WL underwriting guidelines.`;
  }
}

/**
 * BUILD PREDICATE - This is the critical fix!
 *
 * For FE Express WL, the rule set's condition_code tells us WHICH condition this is for.
 * The predicate needs to check:
 * 1. The timeframe (when was diagnosis/last occurrence)
 * 2. Current status (for 'current' timeframe)
 *
 * The rule evaluator will only evaluate this rule set when the condition is present,
 * so we don't need to check condition presence in the predicate itself.
 */
function buildPredicate(conditionCode, timeframe) {
  const conditions = [];

  // Map the generated code to the canonical health condition code
  const canonicalCode = CONDITION_CODE_MAP[conditionCode] || conditionCode;

  // Build timeframe-specific conditions
  switch (timeframe) {
    case 'within_2_years':
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.diagnosis_date`,
        operator: 'years_since_lte',
        value: 2,
        treatNullAs: 'unknown',
      });
      break;

    case 'after_2_years':
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.diagnosis_date`,
        operator: 'years_since_gt',
        value: 2,
        treatNullAs: 'unknown',
      });
      break;

    case 'within_12_months':
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.diagnosis_date`,
        operator: 'years_since_lte',
        value: 1,
        treatNullAs: 'unknown',
      });
      break;

    case 'after_12_months':
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.diagnosis_date`,
        operator: 'years_since_gt',
        value: 1,
        treatNullAs: 'unknown',
      });
      break;

    case 'within_6_months':
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.diagnosis_date`,
        operator: 'months_since_lte',
        value: 6,
        treatNullAs: 'unknown',
      });
      break;

    case 'after_6_months':
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.diagnosis_date`,
        operator: 'months_since_gt',
        value: 6,
        treatNullAs: 'unknown',
      });
      break;

    case '2_to_4_years':
      // Cancer specific: treatment completed 2-4 years ago
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.treatment_end_date`,
        operator: 'years_since_gte',
        value: 2,
        treatNullAs: 'unknown',
      });
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.treatment_end_date`,
        operator: 'years_since_lte',
        value: 4,
        treatNullAs: 'unknown',
      });
      break;

    case 'over_4_years':
      conditions.push({
        type: 'date',
        field: `${canonicalCode}.treatment_end_date`,
        operator: 'years_since_gt',
        value: 4,
        treatNullAs: 'unknown',
      });
      break;

    case 'never_treated':
      // Cancer never treated = still needs treatment = decline
      conditions.push({
        type: 'boolean',
        field: `${canonicalCode}.treatment_completed`,
        operator: 'eq',
        value: false,
        treatNullAs: 'unknown',
      });
      break;

    case 'current':
      // Currently active condition (bedridden, hospice, incarcerated, terminal)
      conditions.push({
        type: 'boolean',
        field: `${canonicalCode}.is_current`,
        operator: 'eq',
        value: true,
        treatNullAs: 'unknown',
      });
      break;

    case 'ever':
      // Ever had this condition - no additional predicate needed
      // The rule set's condition_code already filters to this condition
      break;

    case 'any':
    default:
      // Any timeframe - no additional predicate needed
      break;
  }

  // Return the predicate structure
  if (conditions.length === 0) {
    // Empty conditions = always matches (for 'ever' and 'any' timeframes)
    return { version: 2, root: {} };
  } else if (conditions.length === 1) {
    return { version: 2, root: conditions[0] };
  } else {
    return { version: 2, root: { all: conditions } };
  }
}

async function seedFEExpressRules() {
  console.log('=== Seeding Transamerica FE Express WL Decision Rules (V2 - Fixed Predicates) ===\n');
  console.log(`Total conditions to process: ${CONDITIONS.length}\n`);

  // Verify product exists
  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', FE_EXPRESS_WL_ID)
    .single();

  if (!product) {
    console.error('FE Express WL product not found!');
    return;
  }
  console.log(`Product: ${product.name}\n`);

  // Stats
  let ruleSetsCreated = 0;
  let rulesCreated = 0;
  let errors = 0;

  // Process each condition
  for (const [conditionName, rules] of CONDITIONS) {
    const conditionCode = generateConditionCode(conditionName);

    console.log(`\n📋 ${conditionName}`);
    console.log(`   Code: ${conditionCode}`);
    console.log(`   Rules: ${rules.length}`);

    // Check if rule set already exists for this condition/product
    let { data: existingRuleSet } = await supabase
      .from('underwriting_rule_sets')
      .select('id')
      .eq('carrier_id', TRANSAMERICA_ID)
      .eq('product_id', FE_EXPRESS_WL_ID)
      .eq('condition_code', conditionCode)
      .limit(1);

    let ruleSetId;

    if (existingRuleSet && existingRuleSet.length > 0) {
      ruleSetId = existingRuleSet[0].id;
      console.log(`   Using existing rule set: ${ruleSetId}`);
    } else {
      // Create rule set
      const { data: ruleSet, error: rsError } = await supabase
        .from('underwriting_rule_sets')
        .insert({
          imo_id: IMO_ID,
          carrier_id: TRANSAMERICA_ID,
          product_id: FE_EXPRESS_WL_ID,
          scope: 'condition',
          condition_code: conditionCode,
          variant: 'default',
          name: `${conditionName} - FE Express WL`,
          description: `Single condition decision rules for ${conditionName}`,
          source: 'imported',
          review_status: 'approved',
          is_active: true,
        })
        .select()
        .single();

      if (rsError) {
        console.log(`   ⚠️  Error creating rule set: ${rsError.message}`);
        errors++;
        continue;
      }

      ruleSetId = ruleSet.id;
      ruleSetsCreated++;
    }

    // Create rules for each timeframe/decision
    for (const rule of rules) {
      const { timeframe, decision, priority } = rule;

      // Check if similar rule already exists
      const ruleName = generateRuleName(conditionName, timeframe, decision);
      const { data: existingRule } = await supabase
        .from('underwriting_rules')
        .select('id')
        .eq('rule_set_id', ruleSetId)
        .eq('name', ruleName)
        .limit(1);

      if (existingRule && existingRule.length > 0) {
        console.log(`   ⏭️  Rule already exists: ${ruleName}`);
        continue;
      }

      // Build proper predicate based on timeframe
      const predicate = buildPredicate(conditionCode, timeframe);

      const { error: ruleError } = await supabase
        .from('underwriting_rules')
        .insert({
          rule_set_id: ruleSetId,
          priority: priority,
          name: ruleName,
          description: generateReason(conditionName, timeframe, decision),
          predicate: predicate,
          predicate_version: 2,
          outcome_eligibility: mapToEligibility(decision),
          outcome_health_class: mapToHealthClass(decision),
          outcome_table_rating: 'none',
          outcome_reason: generateReason(conditionName, timeframe, decision),
          outcome_concerns: [conditionCode],
        });

      if (ruleError) {
        console.log(`   ⚠️  Error creating rule: ${ruleError.message}`);
        errors++;
      } else {
        console.log(`   ✅ Created: ${ruleName}`);
        console.log(`      Predicate: ${JSON.stringify(predicate)}`);
        rulesCreated++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total conditions processed: ${CONDITIONS.length}`);
  console.log(`Rule sets created: ${ruleSetsCreated}`);
  console.log(`Rules created: ${rulesCreated}`);
  console.log(`Errors: ${errors}`);

  // Breakdown by decision type
  let selectCount = 0, gradedCount = 0, declineCount = 0;
  CONDITIONS.forEach(([_, rules]) => {
    rules.forEach(r => {
      if (r.decision === 'select') selectCount++;
      else if (r.decision === 'graded') gradedCount++;
      else if (r.decision === 'decline') declineCount++;
    });
  });

  console.log('\nBreakdown by decision type:');
  console.log(`  Select (Immediate): ${selectCount}`);
  console.log(`  Graded (2yr Wait): ${gradedCount}`);
  console.log(`  Decline: ${declineCount}`);

  console.log('\n✅ Done!');
}

seedFEExpressRules().catch(console.error);
