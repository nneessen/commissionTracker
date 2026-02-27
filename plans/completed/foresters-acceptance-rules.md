# Continuation: Foresters Financial - Acceptance Rules

## Task
Create carrier acceptance rules for **Foresters Financial** products, populating BOTH the v1 (`carrier_condition_acceptance`) and v2 (`underwriting_rule_sets` + `underwriting_rules`) systems.

## CRITICAL: Read memory first
Read `memory/carrier_acceptance_rules_workflow` for the dual-system workflow, enum type names, and migration template pattern.

## Carrier & Product IDs
- **Carrier ID**: `acca122f-4261-46d9-9287-da47b8ba5e37` (Foresters Financial)
- **Existing rules**: 0 in v1, 0 in v2

### Products to populate (3 products from user's impairment guide):
1. `544bb4d4-20aa-4b1a-b77d-3b95c3eaa98f` - **Strong Foundation** (`term_life`)
2. `73c35990-7da1-479b-b1fa-492b0ffb6b40` - **Your Term** (`term_life`)
3. `cd70f38e-0e9f-492d-8ac3-02294b24df8e` - **Advantage Plus II** (`participating_whole_life`)

## Steps
1. Create migration file(s) using `date +%Y%m%d%H%M%S` for timestamp
2. Use the batch temp table + INSERT pattern from existing migrations (see `20260227124342_american_amicable_express_ul_acceptance_rules.sql` as template)
3. Apply with `./scripts/migrations/run-migration.sh supabase/migrations/<file>.sql`
4. Verify counts in both systems
5. Run `./scripts/validate-app.sh`

## Important: Product-Specific Differences
The impairment guide has some conditions that differ by product. Pay close attention:

### COPD Rules (DIFFERENT by product):
- **Strong Foundation**: Non-smoker, mild COPD, no oxygen/steroids, little SOB → `case_by_case` (Accept under conditions) | Smoker → Decline
- **Advantage Plus II & Your Term**: ALL COPD → Decline

### Diabetes Rules (DIFFERENT by product):
- **Strong Foundation**: Type 1 insulin-dependent CAN be accepted (ages 40-59 dx<5yr, ages 60+ dx<25yr)
- **Advantage Plus II & Your Term**: Type 1 / insulin-dependent → ALWAYS Decline
- **ALL products**: Type 2 on oral meds, good control, non-smoker → Accept (with age/duration criteria)
- **ALL products**: Poor control, complications, or exceeds build limits → Decline

### Cancer Rules (ALL products):
- Basal cell carcinoma → Accept
- Treatment completed >10yr ago, no recurrence → Accept
- All other cancers including Hodgkin's → Decline

## Condition Mapping (from impairment guide)

### DECLINE conditions (all 3 products):
| Condition | Condition Code(s) |
|-----------|-------------------|
| ADL assistance required | `adl_impairment` |
| AIDS / HIV | `aids`, `hiv_aids`, `hiv_positive` |
| Alzheimer's / Dementia | `alzheimers`, `dementia` |
| Amputation by disease | (use notes — no exact code) |
| Aneurysm | `aneurysm` |
| Angina | `angina` |
| Angioplasty | `angioplasty` |
| Aortic Insufficiency/Stenosis | `valve_disorder` |
| Arrhythmia | `afib` |
| Artery Blockage | `heart_disease` |
| Bypass Surgery | `coronary_bypass` |
| Cerebral Palsy | `cerebral_palsy` |
| CHF | `congestive_heart_failure` |
| Circulatory Surgery | `vascular_surgery`, `heart_surgery` |
| Cirrhosis | `cirrhosis` |
| CVA/Stroke/TIA | `stroke`, `tia` |
| Cystic Fibrosis | `cystic_fibrosis` |
| Down's Syndrome | `cerebral_palsy` (nearest) |
| Drug Use (other than marijuana) | `drug_abuse` |
| Heart Attack/MI/CAD | `heart_attack`, `heart_disease` |
| Heart Blockage | `heart_disease` |
| Heart Murmur (other) | `valve_disorder` |
| Heart Surgery/Procedure | `heart_surgery` |
| Heart Valve Disease/Surgery | `valve_disorder` |
| Hemophilia | (use notes) |
| Hepatitis B/C | `hepatitis_c` |
| Hodgkin's Disease | `hodgkins_disease` |
| Kidney Disease (chronic) | `chronic_kidney_disease`, `kidney_disease`, `kidney_failure`, `kidney_dialysis` |
| Leukemia | `leukemia` |
| Liver Disease | `liver_disease`, `liver_failure` |
| ALS | `als` |
| Lupus (Systemic) | `lupus`, `sle_lupus` |
| Marfan's Syndrome | (use notes) |
| Mitral Insufficiency/Stenosis | `valve_disorder` |
| Multiple Sclerosis | `ms`, `multiple_sclerosis` |
| Muscular Dystrophy | `muscular_dystrophy` |
| Nursing Home/Facility | `nursing_facility` |
| Oxygen Use | `oxygen_required` |
| Pacemaker | `pacemaker` |
| Paralysis | `paralysis` |
| Parkinson's | `parkinsons` |
| PVD/PAD | `peripheral_vascular`, `pad` |
| Sarcoidosis (Pulmonary) | (use notes) |
| Severe Depression/Bipolar/Schizophrenia | `bipolar`, `schizophrenia`, `severe_mental_illness` |
| Spina Bifida | (use notes) |
| Suicide Attempt | `suicide_attempt` |
| Unexplained Weight Loss | (use notes) |
| Wheelchair Use (chronic) | (use notes — `adl_impairment` nearest) |

### ACCEPT / CASE_BY_CASE conditions (all 3 products):
| Condition | Condition Code | Acceptance | Notes |
|-----------|---------------|------------|-------|
| Alcohol (5yr+ abstained) | `alcohol_abuse` | `case_by_case` | Within 5yr=Decline, After 5yr no relapse=Accept |
| Amputation by injury | — | `approved` | — |
| Arthritis (Osteo) | `rheumatoid_arthritis` | `case_by_case` | Osteo/mild RA=Accept, Moderate/severe RA=Decline |
| Asthma (mild/moderate) | `asthma` | `case_by_case` | Mild/Moderate=Accept, Severe/Hospitalization=Decline |
| Blood Pressure (controlled) | `high_blood_pressure` | `approved` | Controlled=Accept |
| Cancer (10yr+ clear) | `cancer` | `case_by_case` | Basal cell=Accept, 10yr+ no recurrence=Accept, else Decline |
| Colitis (mild/intermittent) | `ulcerative_colitis` | `case_by_case` | Mild/intermittent=Accept |
| Crohn's (5yr+ remission) | `crohns` | `case_by_case` | 5yr+ remission=Accept |
| Depression (mild) | `depression` | `case_by_case` | Mild, >25, onset 1yr+, no hospitalization=Accept |
| Diabetes Type 2 (oral) | `diabetes` | `case_by_case` | Oral meds, good control, non-smoker=Accept |
| Epilepsy (controlled) | `epilepsy` | `case_by_case` | Controlled, no seizures 2yr=Accept |
| Heart Murmur (innocent) | — | `approved` | Innocent, no symptoms=Accept |
| Hepatitis A (recovered) | — | `approved` | — |
| Lupus (Discoid) | `lupus` | `case_by_case` | Discoid=Accept, Systemic=Decline |
| Pancreatitis (single, non-alcohol) | `pancreatitis` | `case_by_case` | Single acute >1yr ago, non-alcohol=Accept |
| Sleep Apnea (treated) | `sleep_apnea` | `approved` | Treated and controlled=Accept |
| Thyroid (treated) | `thyroid_disorder` | `approved` | Treated, no symptoms=Accept |

### PRODUCT-SPECIFIC conditions:
| Condition | Strong Foundation | Your Term | Advantage Plus II |
|-----------|------------------|-----------|-------------------|
| COPD (mild, non-smoker) | `case_by_case` | `declined` | `declined` |
| Diabetes Type 1 (insulin) | `case_by_case` (age-restricted) | `declined` | `declined` |

## V1 Mapping Rules
- Accept → `approved`
- Decline → `declined`
- Conditional (Accept under criteria, Decline otherwise) → `case_by_case` with notes
- Use `imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'`

## V2 Mapping Rules
- Accept → `eligible` / `standard`
- Decline → `ineligible` / `decline`
- Conditional → `refer` / `refer`

## Notes
- The medication list in the guide maps meds to conditions already covered by the impairment rules. No separate medication-level rules needed.
- For conditions with product-specific differences (COPD, Diabetes Type 1), create SEPARATE rules per product.
- For shared conditions, can use the same temp table approach but insert for each product_type/product_id.
- Since there are 3 products sharing most rules, consider creating one migration that handles all 3 with a loop or repeated inserts from the same temp table.
