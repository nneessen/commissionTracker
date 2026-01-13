// scripts/seed-fe-express-wl-rules.js
// Seeds all single condition decision rules for Transamerica FE Express WL from their underwriting guide

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

// All conditions from the PDF
// Format: [condition_name, rules_array]
// rules_array contains: { timeframe, decision, priority }
// Decisions: 'select' = immediate coverage, 'graded' = 2yr waiting, 'decline' = not eligible
const CONDITIONS = [
  // Page 1
  ['Alcohol/drug treatment', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Alzheimer\'s disease', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Amputation, not due to trauma', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Amyotrophic lateral sclerosis (ALS)', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Aneurysm', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Angina (cardiac chest pain)', [{ timeframe: 'within_2_years', decision: 'select', priority: 10 }]],
  ['Arrhythmia', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Asthma', [{ timeframe: 'ever', decision: 'select', priority: 10 }]],
  ['Atrial fibrillation', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Autism', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Bedridden', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Bipolar', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Black lung', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Blood clots (no complications)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Blood disorder', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Bronchitis (chronic)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Cancer (excluding basal cell)', [
    { timeframe: 'never_treated', decision: 'decline', priority: 5 },
    { timeframe: 'within_2_years', decision: 'decline', priority: 6 },
    { timeframe: '2_to_4_years', decision: 'graded', priority: 7 },
    { timeframe: 'over_4_years', decision: 'select', priority: 10 },
  ]],
  ['Cardiac surgery', [
    { timeframe: 'within_12_months', decision: 'select', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Cardiomyopathy', [{ timeframe: 'ever', decision: 'select', priority: 10 }]],
  ['Cerebral palsy', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Chest pain', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Chronic pain', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Chronic pancreatitis', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Circulatory disorder', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Cirrhosis', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Clotting disorder', [{ timeframe: null, decision: 'decline', priority: 10 }]],
  ['Congestive heart failure (CHF)', [{ timeframe: 'ever', decision: 'select', priority: 10 }]],
  ['Cognitive disorder', [{ timeframe: null, decision: 'decline', priority: 10 }]],
  ['COPD', [{ timeframe: 'ever', decision: 'select', priority: 10 }]],
  ['Coronary artery disease (CAD)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Creutzfeldt-Jakob disease', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Crohn\'s disease', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Cystic or pulmonary fibrosis', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Defibrillator', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],

  // Page 2
  ['Depression', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Dementia', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Diabetic coma', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Diabetes with insulin or complications', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Down syndrome', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Driving offenses (DUI/DWI/OWI)', [{ timeframe: 'after_2_years', decision: 'select', priority: 10 }]],
  ['Drug use', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Electric scooter/cart use', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Emphysema', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Encephalitis', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Epilepsy', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Felony charges', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Gaucher\'s disease', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Gestational diabetes', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['HIV/AIDS', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Heart attack', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Heart disease', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Heart murmur', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Hepatitis B or C', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Hospice or home health care', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Hospitalization (2+ nights)', [
    { timeframe: 'within_12_months', decision: 'decline', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Hunter syndrome', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Huntington\'s disease', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Incarceration or probation/parole', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Irregular heart beat', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Kidney dialysis', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Kidney failure', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Liver disease/disorder', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Liver failure', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Lupus', [{ timeframe: 'ever', decision: 'select', priority: 10 }]],
  ['Marijuana use', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Memory loss', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Mental health disorder (inpatient)', [
    { timeframe: 'within_2_years', decision: 'graded', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Mental incapacity', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Metastatic/recurrent cancer', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Multiple driving offenses', [{ timeframe: null, decision: 'select', priority: 10 }]],

  // Page 3
  ['Multiple sclerosis', [{ timeframe: 'ever', decision: 'select', priority: 10 }]],
  ['Muscular dystrophy', [{ timeframe: 'ever', decision: 'graded', priority: 10 }]],
  ['Niemann-Pick disease', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Nursing home/assisted living', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Organ transplant', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Oxygen (supplemental)', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Parkinson\'s disease', [{ timeframe: 'ever', decision: 'select', priority: 10 }]],
  ['Pending tests/surgery/hospitalization', [
    { timeframe: 'within_6_months', decision: 'decline', priority: 5 },
    { timeframe: 'after_6_months', decision: 'select', priority: 10 },
  ]],
  ['Peripheral artery/vascular disease (PAD/PVD)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Phlebitis', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Pompe disease', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Post-traumatic stress disorder (PTSD)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Prescribed supplemental oxygen', [{ timeframe: 'last_12_months', decision: 'graded', priority: 10 }]],
  ['Pulmonary hypertension', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Reckless driving/DWI/OWI', [
    { timeframe: 'within_2_years', decision: 'graded', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Respiratory disease (chronic)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Rheumatoid arthritis', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Sarcoidosis (not affecting lungs)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Sarcoidosis (affecting lungs)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Schizophrenia', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Seizures', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Sickle cell anemia', [{ timeframe: 'ever', decision: 'decline', priority: 10 }]],
  ['Sleep apnea (CPAP without supplemental oxygen)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Stroke/TIA/CVA', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Suicide attempt', [
    { timeframe: 'within_2_years', decision: 'decline', priority: 5 },
    { timeframe: 'after_2_years', decision: 'select', priority: 10 },
  ]],
  ['Systemic lupus erythematosus (SLE)', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Terminal illness', [{ timeframe: 'current', decision: 'decline', priority: 10 }]],
  ['Tuberculosis', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Ulcerative colitis', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Wasting syndrome', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Wheelchair use', [
    { timeframe: 'within_12_months', decision: 'graded', priority: 5 },
    { timeframe: 'after_12_months', decision: 'select', priority: 10 },
  ]],
  ['Wilson\'s disease', [{ timeframe: null, decision: 'select', priority: 10 }]],
  ['Wiskott-Aldrich syndrome', [{ timeframe: null, decision: 'select', priority: 10 }]],
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
    'last_12_months': 'last 12 months',
    'current': 'current',
    'ever': 'ever',
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

  if (timeframe && timeframe !== 'ever') {
    return `${conditionName} - ${getTimeframeText(timeframe)} → ${decisionLabel}`;
  }
  return `${conditionName} → ${decisionLabel}`;
}

// Generate reason text
function generateReason(conditionName, timeframe, decision) {
  const timeframeText = getTimeframeText(timeframe);

  switch (decision) {
    case 'select':
      if (timeframe && timeframe !== 'ever') {
        return `Applicants with ${conditionName} (${timeframeText}) qualify for Select (immediate coverage) per FE Express WL guidelines.`;
      }
      return `Applicants with ${conditionName} qualify for Select (immediate coverage) per FE Express WL guidelines.`;
    case 'graded':
      if (timeframe && timeframe !== 'ever') {
        return `Applicants with ${conditionName} (${timeframeText}) qualify for Graded coverage (2-year waiting period) per FE Express WL guidelines.`;
      }
      return `Applicants with ${conditionName} qualify for Graded coverage (2-year waiting period) per FE Express WL guidelines.`;
    case 'decline':
      if (timeframe && timeframe !== 'ever') {
        return `Applicants with ${conditionName} (${timeframeText}) are declined for FE Express WL coverage.`;
      }
      return `Applicants with ${conditionName} are declined for FE Express WL coverage.`;
    default:
      return `Per FE Express WL underwriting guidelines.`;
  }
}

async function seedFEExpressRules() {
  console.log('=== Seeding Transamerica FE Express WL Decision Rules ===\n');
  console.log(`Total conditions to process: ${CONDITIONS.length}\n`);

  // Get IMO
  const { data: imos } = await supabase.from('imos').select('id').limit(1);
  const imoId = imos[0].id;

  // Get user
  const { data: users } = await supabase.from('user_profiles').select('id').limit(1);
  const userId = users?.[0]?.id || imoId;

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

  // Get existing health conditions
  const { data: existingConditions } = await supabase
    .from('underwriting_health_conditions')
    .select('code, name');

  const existingCodes = new Set(existingConditions?.map(c => c.code) || []);
  console.log(`Existing health conditions in database: ${existingCodes.size}\n`);

  // Stats
  let conditionsCreated = 0;
  let ruleSetsCreated = 0;
  let rulesCreated = 0;
  let errors = 0;

  // Process each condition
  for (const [conditionName, rules] of CONDITIONS) {
    const conditionCode = generateConditionCode(conditionName);

    console.log(`\n📋 ${conditionName}`);
    console.log(`   Code: ${conditionCode}`);
    console.log(`   Rules: ${rules.length}`);

    // Step 1: Ensure health condition exists
    if (!existingCodes.has(conditionCode)) {
      const { error: condError } = await supabase
        .from('underwriting_health_conditions')
        .insert({
          code: conditionCode,
          name: conditionName,
          category: 'medical_conditions',
          follow_up_schema: {},
          is_active: true,
        });

      if (condError) {
        if (condError.code === '23505') {
          // Already exists, that's fine
        } else {
          console.log(`   ⚠️  Error creating condition: ${condError.message}`);
          errors++;
          continue;
        }
      } else {
        conditionsCreated++;
        existingCodes.add(conditionCode);
        console.log(`   ✓ Created health condition`);
      }
    }

    // Step 2: Check if rule set already exists for this condition/product
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
    } else {
      // Create rule set
      const { data: ruleSet, error: rsError } = await supabase
        .from('underwriting_rule_sets')
        .insert({
          imo_id: imoId,
          carrier_id: TRANSAMERICA_ID,
          product_id: FE_EXPRESS_WL_ID,
          scope: 'condition',
          condition_code: conditionCode,
          variant: 'default',
          name: `${conditionName} - FE Express WL`,
          description: `Single condition decision rules for ${conditionName}`,
          source_type: 'carrier_document',
          review_status: 'approved',
          is_active: true,
          created_by: userId,
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

    // Step 3: Create rules for each timeframe/decision
    for (const rule of rules) {
      const { timeframe, decision, priority } = rule;

      // Check if similar rule already exists
      const ruleName = generateRuleName(conditionName, timeframe, decision);
      const { data: existingRule } = await supabase
        .from('underwriting_rules')
        .select('id')
        .eq('rule_set_id', ruleSetId)
        .ilike('name', `%${decision}%`)
        .limit(1);

      if (existingRule && existingRule.length > 0) {
        continue; // Rule already exists
      }

      // Create predicate based on timeframe (empty = always matches)
      const predicate = { version: 2, root: {} };

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
          outcome_table_rating: 'none', // FE Express uses graded benefit (waiting period), not table rating
          outcome_reason: generateReason(conditionName, timeframe, decision),
          outcome_concerns: [conditionCode],
        });

      if (ruleError) {
        console.log(`   ⚠️  Error creating rule: ${ruleError.message}`);
        errors++;
      } else {
        rulesCreated++;
      }
    }

    console.log(`   ✅ Created ${rules.length} rule(s)`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total conditions processed: ${CONDITIONS.length}`);
  console.log(`Health conditions created: ${conditionsCreated}`);
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
