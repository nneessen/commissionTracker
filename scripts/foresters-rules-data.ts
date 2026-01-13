// scripts/foresters-rules-data.ts
// Foresters Your Term, Strong Foundation and Advantage Plus Impairment List
// Source: Guide ID c6d9e2e8-1ea3-4337-a7fa-0cb056f513b6, May 2025

export interface ForestersRuleData {
  condition: string;
  conditionCode: string;
  hasQuestionnaire: boolean;
  parameters: string;
  decision: "accept" | "decline" | "refer";
  notes: string;
  productSpecific: string; // 'all' | 'strong_foundation' | 'advantage_plus' | 'your_term'
}

export const FORESTERS_RULES: ForestersRuleData[] = [
  // ADL
  {
    condition: "ADL assistance required",
    conditionCode: "impacted_adls",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // AIDS/HIV
  {
    condition: "AIDS / HIV +ve",
    conditionCode: "aids_hiv",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Alcoholism
  {
    condition: "Alcoholism",
    conditionCode: "alcohol_abuse",
    hasQuestionnaire: true,
    parameters: "Within 5 years",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Alcoholism",
    conditionCode: "alcohol_abuse",
    hasQuestionnaire: true,
    parameters: "After 5 years, without relapse, no current use",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Alzheimer's / Dementia
  {
    condition: "Alzheimers / Dementia",
    conditionCode: "alzheimers",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Amputation
  {
    condition: "Amputation",
    conditionCode: "amputation_not_due_to_trauma",
    hasQuestionnaire: false,
    parameters: "Caused by injury",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Amputation",
    conditionCode: "amputation_not_due_to_trauma",
    hasQuestionnaire: false,
    parameters: "Caused by disease",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Anemia
  {
    condition: "Anemia",
    conditionCode: "anemia",
    hasQuestionnaire: false,
    parameters: "Iron deficiency",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Aneurysm
  {
    condition: "Aneurysm",
    conditionCode: "aneurysm",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Angina - See Heart Disease
  {
    condition: "Angina",
    conditionCode: "angina_cardiac_chest_pain",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "See Heart Disease",
    productSpecific: "all",
  },

  // Angioplasty - See Heart Disease
  {
    condition: "Angioplasty",
    conditionCode: "cardiac_surgery",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "See Heart Disease",
    productSpecific: "all",
  },

  // Aortic conditions
  {
    condition: "Aortic Insufficiency",
    conditionCode: "aortic_insufficiency",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Aortic Stenosis",
    conditionCode: "aortic_stenosis",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Arrhythmia
  {
    condition: "Arrhythmia",
    conditionCode: "arrhythmia",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Artery Blockage
  {
    condition: "Artery Blockage",
    conditionCode: "coronary_artery_disease",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Arthritis
  {
    condition: "Arthritis - Osteoarthritis",
    conditionCode: "arthritis_osteo",
    hasQuestionnaire: true,
    parameters: "",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Arthritis - Rheumatoid",
    conditionCode: "rheumatoid_arthritis",
    hasQuestionnaire: true,
    parameters: "Mild with no limitations",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Arthritis - Rheumatoid",
    conditionCode: "rheumatoid_arthritis",
    hasQuestionnaire: true,
    parameters: "Moderate or severe (Rx include Humira, Embrel, Prednisone)",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Asthma
  {
    condition: "Asthma",
    conditionCode: "asthma",
    hasQuestionnaire: true,
    parameters: "Ages 3+, Mild/Moderate",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Asthma",
    conditionCode: "asthma",
    hasQuestionnaire: true,
    parameters: "Severe - Hospitalization",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Autism
  {
    condition: "Autism",
    conditionCode: "autism",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Blood Pressure / Hypertension
  {
    condition: "High Blood Pressure",
    conditionCode: "high_blood_pressure",
    hasQuestionnaire: true,
    parameters: "Controlled",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Bronchitis
  {
    condition: "Bronchitis",
    conditionCode: "bronchitis_chronic",
    hasQuestionnaire: false,
    parameters: "Acute",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Bronchitis",
    conditionCode: "bronchitis_chronic",
    hasQuestionnaire: false,
    parameters: "Chronic",
    decision: "decline",
    notes: "See COPD",
    productSpecific: "all",
  },

  // By-Pass Surgery
  {
    condition: "By-Pass Surgery",
    conditionCode: "cardiac_surgery",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "See Heart Disease",
    productSpecific: "all",
  },

  // Build / Weight
  {
    condition: "Build",
    conditionCode: "build_weight",
    hasQuestionnaire: false,
    parameters: "Weight is above or below the Build Chart",
    decision: "decline",
    notes: "See Build Chart on page 10",
    productSpecific: "all",
  },

  // Cancer
  {
    condition: "Cancer",
    conditionCode: "cancer",
    hasQuestionnaire: true,
    parameters: "Basal Cell Carcinoma (Skin)",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Cancer",
    conditionCode: "cancer",
    hasQuestionnaire: true,
    parameters: "Treatment completed over 10 years ago, with no recurrence",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Cancer",
    conditionCode: "cancer",
    hasQuestionnaire: true,
    parameters: "All other cancers including Hodgkins Lymphoma",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Cerebral Palsy
  {
    condition: "Cerebral Palsy",
    conditionCode: "cerebral_palsy",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // COPD - Strong Foundation
  {
    condition: "COPD",
    conditionCode: "copd",
    hasQuestionnaire: true,
    parameters: "Smoker",
    decision: "decline",
    notes: "Strong Foundation only",
    productSpecific: "strong_foundation",
  },
  {
    condition: "COPD",
    conditionCode: "copd",
    hasQuestionnaire: true,
    parameters:
      "Non Smoker, mild COPD, no oxygen, no steroids or serious COPD medications. Little to no shortness of breath on exertion; able to climb at least 1 flight of stairs with little to no SOB",
    decision: "accept",
    notes: "Strong Foundation only",
    productSpecific: "strong_foundation",
  },

  // COPD - Advantage Plus II and Smart UL
  {
    condition: "COPD",
    conditionCode: "copd",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "Advantage Plus II and Smart UL",
    productSpecific: "advantage_plus",
  },

  // Cirrhosis of Liver
  {
    condition: "Cirrhosis of Liver",
    conditionCode: "cirrhosis",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Circulatory Surgery
  {
    condition: "Circulatory Surgery",
    conditionCode: "vascular_surgery",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Colitis-Ulcerative
  {
    condition: "Colitis-Ulcerative",
    conditionCode: "ulcerative_colitis",
    hasQuestionnaire: true,
    parameters: "Mild to moderate, intermittent",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Congestive Heart Failure
  {
    condition: "Congestive Heart Failure",
    conditionCode: "congestive_heart_failure_chf",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Crohn's Disease
  {
    condition: "Crohns Disease",
    conditionCode: "crohns",
    hasQuestionnaire: false,
    parameters: ">5 years in remission",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // CVA / Stroke / TIA
  {
    condition: "CVA / Stroke / TIA",
    conditionCode: "stroke",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Cystic Fibrosis
  {
    condition: "Cystic Fibrosis",
    conditionCode: "cystic_fibrosis",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Depression / Anxiety
  {
    condition: "Depression/Anxiety",
    conditionCode: "depression",
    hasQuestionnaire: true,
    parameters:
      "Mild > age 25, onset more than 1 year or longer, no hospitalization or time off work",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Depression/Anxiety",
    conditionCode: "depression",
    hasQuestionnaire: true,
    parameters: "Severe, major depression, bi-polar disease, schizophrenia",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Diabetes - Type 2 (Advantage Plus II, Your Term, Smart UL)
  {
    condition: "Diabetes Type 2",
    conditionCode: "diabetes",
    hasQuestionnaire: false,
    parameters:
      "Non-insulin, diet controlled, good control, non-smoker or <1 pack/day, no complications. Age 20-29 diagnosis < 5 yrs OR Age 30+ any duration",
    decision: "accept",
    notes: "Advantage Plus II, Your Term, Smart UL",
    productSpecific: "advantage_plus",
  },
  {
    condition: "Diabetes Type 1 or 2",
    conditionCode: "diabetes",
    hasQuestionnaire: false,
    parameters:
      "Strong Foundation - Individual consideration based on A1C, age, duration and build with no diabetic complications",
    decision: "refer",
    notes: "Strong Foundation only",
    productSpecific: "strong_foundation",
  },
  {
    condition: "Diabetes Type 1 or 2",
    conditionCode: "diabetes",
    hasQuestionnaire: false,
    parameters:
      "Treated with Insulin; or poor control, or complications (heart, kidney, PVD, neuropathy, retinopathy)",
    decision: "decline",
    notes: "Advantage Plus II, Your Term, Smart UL",
    productSpecific: "advantage_plus",
  },

  // Diverticulitis/Diverticulosis
  {
    condition: "Diverticulitis/Diverticulosis",
    conditionCode: "diverticulitis",
    hasQuestionnaire: true,
    parameters: "",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Down's Syndrome
  {
    condition: "Downs Syndrome",
    conditionCode: "down_syndrome",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Drug Use
  {
    condition: "Drug Use (other than marijuana)",
    conditionCode: "drug_abuse",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Marijuana
  {
    condition: "Marijuana - Recreational",
    conditionCode: "marijuana_use",
    hasQuestionnaire: true,
    parameters: "Age 18+, Up to 6 days per week",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Marijuana - Recreational",
    conditionCode: "marijuana_use",
    hasQuestionnaire: true,
    parameters: "Daily use",
    decision: "refer",
    notes: "Individual consideration may be given",
    productSpecific: "all",
  },
  {
    condition: "Marijuana - Medical",
    conditionCode: "marijuana_use",
    hasQuestionnaire: true,
    parameters: "",
    decision: "refer",
    notes: "Depends on reason for use - individual consideration",
    productSpecific: "all",
  },

  // Emphysema
  {
    condition: "Emphysema",
    conditionCode: "emphysema",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "See COPD",
    productSpecific: "all",
  },

  // Epilepsy / Seizure
  {
    condition: "Epilepsy / Seizure",
    conditionCode: "epilepsy",
    hasQuestionnaire: true,
    parameters: "Controlled on meds, no seizures for 2 years, no complications",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Fibromyalgia
  {
    condition: "Fibromyalgia",
    conditionCode: "fibromyalgiafibrositis",
    hasQuestionnaire: false,
    parameters: "No depression, working full-time",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Gallbladder Disorders
  {
    condition: "Gallbladder Disorders",
    conditionCode: "gallbladder_disorders",
    hasQuestionnaire: false,
    parameters: "",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Gastric Bypass
  {
    condition: "Gastric Bypass",
    conditionCode: "gastric_bandingsleevebypass_surgery",
    hasQuestionnaire: true,
    parameters: "After 1 year, weight stabilized",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Gastritis
  {
    condition: "Gastritis",
    conditionCode: "gastritis",
    hasQuestionnaire: false,
    parameters: "",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Gout
  {
    condition: "Gout",
    conditionCode: "gout",
    hasQuestionnaire: false,
    parameters: "",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Heart Blockage
  {
    condition: "Heart Blockage",
    conditionCode: "coronary_artery_disease",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Heart Disease
  {
    condition: "Heart Disease",
    conditionCode: "heart_disease",
    hasQuestionnaire: false,
    parameters:
      "Heart Attack, Myocardial Infarction, Coronary Artery Disease and Angina Pectoris",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Heart Murmur
  {
    condition: "Heart Murmur",
    conditionCode: "heart_murmur",
    hasQuestionnaire: true,
    parameters: "Innocent, no symptoms, no treatment",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Heart Murmur",
    conditionCode: "heart_murmur",
    hasQuestionnaire: true,
    parameters: "Other",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Heart Surgery/Procedure
  {
    condition: "Heart Surgery/Procedure",
    conditionCode: "cardiac_surgery",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Heart Valve Disease/Surgery
  {
    condition: "Heart Valve Disease/Surgery",
    conditionCode: "heart_valve_surgery",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Hemophilia
  {
    condition: "Hemophilia",
    conditionCode: "hemophilia",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Hepatitis
  {
    condition: "Hepatitis A",
    conditionCode: "hepatitis_a_e",
    hasQuestionnaire: false,
    parameters: "Recovered",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Hepatitis B or C",
    conditionCode: "hepatitis_b_or_c",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Hodgkin's Disease
  {
    condition: "Hodgkins Disease",
    conditionCode: "hodgkins_disease",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Hysterectomy
  {
    condition: "Hysterectomy",
    conditionCode: "hysterectomy",
    hasQuestionnaire: false,
    parameters: "Non cancer",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Kidney Disease
  {
    condition: "Kidney Disease",
    conditionCode: "kidney_disease",
    hasQuestionnaire: true,
    parameters: "Stones, acute infection",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Kidney Disease",
    conditionCode: "kidney_disease",
    hasQuestionnaire: true,
    parameters: "Other chronic kidney disease",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Leukemia
  {
    condition: "Leukemia",
    conditionCode: "leukemia",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Liver disease
  {
    condition: "Liver disease",
    conditionCode: "liver_disease",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Lou Gehrig's Disease (ALS)
  {
    condition: "Lou Gehrigs Disease (ALS)",
    conditionCode: "als",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Lupus
  {
    condition: "Lupus Erythematosus",
    conditionCode: "lupus",
    hasQuestionnaire: true,
    parameters: "Discoid",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Lupus Erythematosus",
    conditionCode: "lupus",
    hasQuestionnaire: true,
    parameters: "Systemic",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Marfan's Syndrome
  {
    condition: "Marfans Syndrome",
    conditionCode: "marfans_syndrome",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Mitral conditions
  {
    condition: "Mitral Insufficiency",
    conditionCode: "mitral_insufficiency",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Mitral Stenosis",
    conditionCode: "mitral_stenosis",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Multiple Sclerosis
  {
    condition: "Multiple Sclerosis",
    conditionCode: "ms",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Muscular Dystrophy
  {
    condition: "Muscular Dystrophy",
    conditionCode: "muscular_dystrophy",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Narcolepsy
  {
    condition: "Narcolepsy",
    conditionCode: "narcolepsy",
    hasQuestionnaire: true,
    parameters: "Occasional Episodes",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Nursing Home/Facility Resident
  {
    condition:
      "Nursing Home/Skilled Nursing facility or Psychiatric Facility Resident",
    conditionCode: "nursing_homeassisted_living",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Oxygen Use
  {
    condition: "Oxygen Use",
    conditionCode: "oxygen_therapy",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Pacemaker
  {
    condition: "Pacemaker",
    conditionCode: "pacemaker",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Pancreatitis
  {
    condition: "Pancreatitis",
    conditionCode: "pancreatitis_resolved",
    hasQuestionnaire: true,
    parameters:
      "Single attack, acute >1 year ago, non alcohol related, no complications",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Pancreatitis",
    conditionCode: "chronic_pancreatitis",
    hasQuestionnaire: true,
    parameters: "Alcohol related, chronic",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Paralysis
  {
    condition: "Paralysis - Paraplegia and Quadriplegia",
    conditionCode: "paralysisspinal_cord_injury",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Parkinson's Disease
  {
    condition: "Parkinsons Disease",
    conditionCode: "parkinsons",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Peripheral Vascular or Arterial Disease
  {
    condition: "Peripheral Vascular or Arterial Disease (PVD, PAD)",
    conditionCode: "peripheral_vascular",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Prostate Disorder
  {
    condition: "Prostate Disorder",
    conditionCode: "benign_prostatic_hypertrophy_bph",
    hasQuestionnaire: true,
    parameters: "Benign - Infection, inflammation",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Sarcoidosis
  {
    condition: "Sarcoidosis",
    conditionCode: "sarcoidosis_not_affecting_lungs",
    hasQuestionnaire: false,
    parameters: "Localized, non-pulmonary",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },
  {
    condition: "Sarcoidosis",
    conditionCode: "sarcoidosis_affecting_lungs",
    hasQuestionnaire: false,
    parameters: "Pulmonary",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Sleep Apnea
  {
    condition: "Sleep Apnea",
    conditionCode: "sleep_apnea",
    hasQuestionnaire: true,
    parameters: "Treated and controlled",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Spina Bifida
  {
    condition: "Spina Bifida",
    conditionCode: "spina_bifida",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Splenectomy
  {
    condition: "Splenectomy",
    conditionCode: "splenectomy",
    hasQuestionnaire: false,
    parameters: "Due to trauma",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Stroke / CVA / TIA (duplicate entry in guide)
  {
    condition: "Stroke / CVA / TIA",
    conditionCode: "stroke",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Suicide Attempt
  {
    condition: "Suicide Attempt",
    conditionCode: "suicide_attempt",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Thyroid Disorders
  {
    condition: "Thyroid Disorders",
    conditionCode: "thyroid_disorder",
    hasQuestionnaire: false,
    parameters: "Treated, no symptoms",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Transient Ischemic Attack (TIA)
  {
    condition: "Transient Ischemic Attack (TIA)",
    conditionCode: "stroke",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Tuberculosis
  {
    condition: "Tuberculosis",
    conditionCode: "tuberculosis_recovered",
    hasQuestionnaire: false,
    parameters: "Treatment completed, inactive",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Ulcer/GERD
  {
    condition: "Ulcer/GERD",
    conditionCode: "gastroesophageal_reflux_disease_gerd",
    hasQuestionnaire: true,
    parameters: "",
    decision: "accept",
    notes: "",
    productSpecific: "all",
  },

  // Weight Loss Unexplained
  {
    condition: "Weight Loss Unexplained",
    conditionCode: "unexplained_weight_loss",
    hasQuestionnaire: false,
    parameters: "",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },

  // Wheelchair Use
  {
    condition: "Wheelchair Use",
    conditionCode: "wheelchair_bound",
    hasQuestionnaire: false,
    parameters:
      "Due to chronic illness or disease (includes injury or disability resulting in permanent and ongoing use)",
    decision: "decline",
    notes: "",
    productSpecific: "all",
  },
];

// Additional conditions that may need to be created
export const FORESTERS_ADDITIONAL_CONDITIONS = [
  {
    code: "aortic_insufficiency",
    name: "Aortic Insufficiency",
    category: "cardiovascular",
  },
  {
    code: "aortic_stenosis",
    name: "Aortic Stenosis",
    category: "cardiovascular",
  },
  {
    code: "build_weight",
    name: "Build/Weight Issue",
    category: "medical_conditions",
  },
  {
    code: "diverticulitis",
    name: "Diverticulitis/Diverticulosis",
    category: "gastrointestinal",
  },
  {
    code: "gallbladder_disorders",
    name: "Gallbladder Disorders",
    category: "gastrointestinal",
  },
  { code: "gastritis", name: "Gastritis", category: "gastrointestinal" },
  { code: "gout", name: "Gout", category: "medical_conditions" },
  { code: "hemophilia", name: "Hemophilia", category: "medical_conditions" },
  {
    code: "hysterectomy",
    name: "Hysterectomy",
    category: "medical_conditions",
  },
  {
    code: "marfans_syndrome",
    name: "Marfans Syndrome",
    category: "medical_conditions",
  },
  {
    code: "mitral_insufficiency",
    name: "Mitral Insufficiency",
    category: "cardiovascular",
  },
  { code: "narcolepsy", name: "Narcolepsy", category: "neurological" },
  {
    code: "spina_bifida",
    name: "Spina Bifida",
    category: "medical_conditions",
  },
  { code: "splenectomy", name: "Splenectomy", category: "medical_conditions" },
  {
    code: "unexplained_weight_loss",
    name: "Unexplained Weight Loss",
    category: "medical_conditions",
  },
];
