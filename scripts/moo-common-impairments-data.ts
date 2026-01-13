// scripts/moo-common-impairments-data.ts
// Mutual of Omaha - Common Impairments for All Products (Declinable)

export interface CommonImpairmentRule {
  condition: string;
  conditionCode: string;
  decision: "decline" | "refer";
  notes: string;
}

// CARRIER: Mutual of Omaha
export const CARRIER_ID = "d619cc12-0a24-4242-9a2d-3dada1fb4b1e";
export const GUIDE_ID = "458aeb67-87aa-4702-a234-e5be003bd0bf";
export const IMO_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

// Common impairments that may result in decline - applies to ALL products
export const COMMON_IMPAIRMENT_RULES: CommonImpairmentRule[] = [
  // Cardiac
  {
    condition: "Abnormal/Irregular Heart Rhythm",
    conditionCode: "arrhythmia",
    decision: "decline",
    notes: "Includes atrial fibrillation, ventricular tachycardia, etc.",
  },
  {
    condition: "Cardiomyopathy",
    conditionCode: "cardiomyopathy",
    decision: "decline",
    notes: "Heart muscle disease",
  },
  {
    condition: "Congestive Heart Failure (CHF)",
    conditionCode: "congestive_heart_failure",
    decision: "decline",
    notes: "CHF of any class",
  },
  {
    condition: "Coronary disease including heart attack or heart surgery",
    conditionCode: "heart_disease",
    decision: "decline",
    notes: "Includes MI, CAD, CABG, stents",
  },
  {
    condition: "Defibrillator",
    conditionCode: "defibrillator",
    decision: "decline",
    notes: "Implanted cardiac defibrillator",
  },
  {
    condition: "Heart disease or surgery",
    conditionCode: "heart_surgery",
    decision: "decline",
    notes: "Any cardiac surgery history",
  },
  {
    condition: "Pacemaker",
    conditionCode: "pacemaker",
    decision: "decline",
    notes: "Implanted pacemaker",
  },

  // Neurological
  {
    condition: "ALS, Lou Gehrig's Disease",
    conditionCode: "als",
    decision: "decline",
    notes: "Amyotrophic Lateral Sclerosis",
  },
  {
    condition: "Cerebral Palsy",
    conditionCode: "cerebral_palsy",
    decision: "decline",
    notes: "Movement and posture disorder",
  },
  {
    condition: "Mental incapacity",
    conditionCode: "mental_incapacity",
    decision: "decline",
    notes: "Cognitive impairment",
  },
  {
    condition: "Neurological disorders - Muscular Dystrophy",
    conditionCode: "muscular_dystrophy",
    decision: "decline",
    notes: "Progressive muscle weakness",
  },
  {
    condition: "Neurological disorders - Multiple Sclerosis",
    conditionCode: "multiple_sclerosis",
    decision: "decline",
    notes: "MS of any type",
  },
  {
    condition: "Neurological disorders - Parkinson's Disease",
    conditionCode: "parkinsons",
    decision: "decline",
    notes: "Parkinson's disease",
  },
  {
    condition: "Paralysis",
    conditionCode: "paralysis",
    decision: "decline",
    notes: "Paraplegia, quadriplegia",
  },
  {
    condition: "Stroke or mini stroke (TIA)",
    conditionCode: "stroke",
    decision: "decline",
    notes: "CVA or TIA history",
  },

  // Cancer/Oncology
  {
    condition: "Cancer",
    conditionCode: "cancer",
    decision: "decline",
    notes: "Cancer diagnosis - may have specific guidelines by type",
  },
  {
    condition: "Hodgkin's Disease",
    conditionCode: "hodgkins_disease",
    decision: "decline",
    notes: "Hodgkin lymphoma",
  },
  {
    condition: "Leukemia",
    conditionCode: "leukemia",
    decision: "decline",
    notes: "Blood cancer",
  },
  {
    condition: "Lymphoma",
    conditionCode: "lymphoma",
    decision: "decline",
    notes: "Non-Hodgkin lymphoma",
  },
  {
    condition: "Melanoma",
    conditionCode: "melanoma",
    decision: "decline",
    notes: "Malignant skin cancer",
  },
  {
    condition: "Metastatic Cancer, or recurrent cancer",
    conditionCode: "metastatic_cancer",
    decision: "decline",
    notes: "Cancer that has spread or returned",
  },

  // Respiratory
  {
    condition: "Asthma (Chronic or Severe)",
    conditionCode: "asthma_severe",
    decision: "decline",
    notes: "Chronic or severe asthma - mild/moderate may be acceptable",
  },
  {
    condition:
      "COPD including Chronic Bronchitis, Emphysema, or Cystic Fibrosis",
    conditionCode: "copd",
    decision: "decline",
    notes: "Chronic obstructive pulmonary disease",
  },

  // Liver
  {
    condition: "Hepatitis B or C",
    conditionCode: "hepatitis_b_c",
    decision: "decline",
    notes: "Chronic viral hepatitis",
  },
  {
    condition: "Liver Disease including Cirrhosis",
    conditionCode: "liver_disease",
    decision: "decline",
    notes: "Cirrhosis or chronic liver disease",
  },

  // Kidney
  {
    condition: "Chronic Kidney Disease",
    conditionCode: "chronic_kidney_disease",
    decision: "decline",
    notes: "CKD of any stage",
  },
  {
    condition: "Renal insufficiency/failure",
    conditionCode: "renal_failure",
    decision: "decline",
    notes: "Kidney failure, dialysis",
  },

  // Gastrointestinal
  {
    condition: "Crohn's Disease/Ulcerative Colitis",
    conditionCode: "inflammatory_bowel_disease",
    decision: "decline",
    notes: "IBD - Crohn's or UC",
  },
  {
    condition: "Pancreatitis (Chronic or Alcohol related)",
    conditionCode: "pancreatitis_chronic",
    decision: "decline",
    notes: "Chronic or alcohol-related pancreatitis",
  },

  // Autoimmune
  {
    condition: "Rheumatoid Arthritis (Moderate/Severe)",
    conditionCode: "rheumatoid_arthritis_severe",
    decision: "decline",
    notes: "Moderate to severe RA - mild may be acceptable",
  },
  {
    condition: "Scleroderma",
    conditionCode: "scleroderma",
    decision: "decline",
    notes: "Systemic sclerosis",
  },
  {
    condition: "Systemic Lupus",
    conditionCode: "lupus",
    decision: "decline",
    notes: "SLE - systemic lupus erythematosus",
  },

  // Vascular
  {
    condition: "Peripheral Vascular Disease (PVD or PAD)",
    conditionCode: "peripheral_vascular_disease",
    decision: "decline",
    notes: "Peripheral artery disease",
  },

  // Blood Disorders
  {
    condition: "Sickle Cell Anemia",
    conditionCode: "sickle_cell_anemia",
    decision: "decline",
    notes: "Sickle cell disease",
  },

  // Mental Health
  {
    condition: "Bipolar, Schizophrenia, major depression",
    conditionCode: "severe_mental_illness",
    decision: "decline",
    notes: "Severe mental health conditions",
  },

  // Substance Use
  {
    condition: "Alcohol or drug treatment history",
    conditionCode: "substance_abuse_history",
    decision: "decline",
    notes: "History of substance abuse treatment",
  },

  // Diabetes
  {
    condition: "Diabetes (prior to specified age)",
    conditionCode: "diabetes_early_onset",
    decision: "decline",
    notes: "Diabetes diagnosed before product-specific age threshold",
  },
  {
    condition: "Diabetes with complications",
    conditionCode: "diabetes_with_complications",
    decision: "decline",
    notes: "Retinopathy (eye), Nephropathy (kidney), Neuropathy (nerve)",
  },

  // Transplant
  {
    condition: "Organ, or bone marrow transplants",
    conditionCode: "organ_transplant",
    decision: "decline",
    notes: "Any organ or bone marrow transplant",
  },

  // Other
  {
    condition: "Amputation caused by disease",
    conditionCode: "amputation_disease",
    decision: "decline",
    notes: "Amputation due to disease (not trauma)",
  },
];

// Conditions that need to be created if they don't exist
export const NEW_CONDITIONS = [
  { code: "arrhythmia", name: "Arrhythmia", category: "cardiovascular" },
  {
    code: "cardiomyopathy",
    name: "Cardiomyopathy",
    category: "cardiovascular",
  },
  {
    code: "congestive_heart_failure",
    name: "Congestive Heart Failure",
    category: "cardiovascular",
  },
  {
    code: "defibrillator",
    name: "Implanted Defibrillator",
    category: "cardiovascular",
  },
  {
    code: "heart_surgery",
    name: "Heart Surgery History",
    category: "cardiovascular",
  },
  { code: "pacemaker", name: "Pacemaker", category: "cardiovascular" },
  { code: "cerebral_palsy", name: "Cerebral Palsy", category: "neurological" },
  {
    code: "mental_incapacity",
    name: "Mental Incapacity",
    category: "neurological",
  },
  {
    code: "muscular_dystrophy",
    name: "Muscular Dystrophy",
    category: "neurological",
  },
  { code: "paralysis", name: "Paralysis", category: "neurological" },
  { code: "hodgkins_disease", name: "Hodgkin's Disease", category: "cancer" },
  { code: "leukemia", name: "Leukemia", category: "cancer" },
  { code: "lymphoma", name: "Lymphoma", category: "cancer" },
  { code: "melanoma", name: "Melanoma", category: "cancer" },
  {
    code: "metastatic_cancer",
    name: "Metastatic/Recurrent Cancer",
    category: "cancer",
  },
  { code: "asthma_severe", name: "Asthma (Severe)", category: "respiratory" },
  { code: "hepatitis_b_c", name: "Hepatitis B or C", category: "liver" },
  { code: "liver_disease", name: "Liver Disease/Cirrhosis", category: "liver" },
  {
    code: "chronic_kidney_disease",
    name: "Chronic Kidney Disease",
    category: "kidney",
  },
  { code: "renal_failure", name: "Renal Failure", category: "kidney" },
  {
    code: "inflammatory_bowel_disease",
    name: "Inflammatory Bowel Disease",
    category: "digestive",
  },
  {
    code: "pancreatitis_chronic",
    name: "Chronic Pancreatitis",
    category: "digestive",
  },
  {
    code: "rheumatoid_arthritis_severe",
    name: "Rheumatoid Arthritis (Severe)",
    category: "autoimmune",
  },
  { code: "scleroderma", name: "Scleroderma", category: "autoimmune" },
  {
    code: "peripheral_vascular_disease",
    name: "Peripheral Vascular Disease",
    category: "cardiovascular",
  },
  { code: "sickle_cell_anemia", name: "Sickle Cell Anemia", category: "blood" },
  {
    code: "severe_mental_illness",
    name: "Severe Mental Illness",
    category: "mental_health",
  },
  {
    code: "diabetes_early_onset",
    name: "Diabetes (Early Onset)",
    category: "metabolic",
  },
  {
    code: "diabetes_with_complications",
    name: "Diabetes with Complications",
    category: "metabolic",
  },
  {
    code: "amputation_disease",
    name: "Amputation (Disease-Related)",
    category: "other",
  },
];
