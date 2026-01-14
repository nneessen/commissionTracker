// scripts/seed-transamerica-impairment-rules.js
// Seeds all medical impairment rules for Transamerica Term/IUL from their underwriting guide

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Transamerica carrier ID
const TRANSAMERICA_ID = 'cf4b8c4d-6332-44c3-8eca-c83f280ebaa0';

// All impairments from the PDF with their best rate class
// Format: [impairment_name, best_class] where best_class is 'preferred', 'standard', 'decline', or 'refer'
const IMPAIRMENTS = [
  // Page 1
  ['Impacted ADLs', 'preferred'],
  ['ADD/ADHD (age 8 and under)', 'decline'],
  ['AIDS', 'decline'],
  ['Alcoholism', 'decline'],
  ['ALS (Lou Gehrig\'s disease)', 'decline'],
  ['Alzheimer\'s disease/dementia', 'decline'],
  ['Amputations (not due to disease)', 'preferred'],
  ['Anemia', 'preferred'],
  ['Aneurysm', 'standard'],
  ['Anxiety', 'preferred'],
  ['Arthritis, osteo', 'preferred'],
  ['Arthritis, rheumatoid', 'standard'],
  ['Asthma', 'preferred'],
  ['Atrial fibrillation', 'standard'],
  ['Autism', 'refer'], // Individual consideration
  ['Barrett\'s esophagus', 'standard'],
  ['Bell\'s palsy', 'preferred'],
  ['Bipolar disorder', 'standard'],
  ['Blindness', 'preferred'],
  ['Benign Prostatic Hypertrophy (BPH)', 'preferred'],
  ['Broken bone', 'preferred'],
  ['Bronchitis, chronic (COPD)', 'standard'],
  ['Bundle branch block, right', 'preferred'],
  ['Bundle branch block, left', 'standard'],
  ['Cancer (internal organ)', 'standard'],
  ['Cancer, skin (not melanoma)', 'preferred'],
  ['Cancer (undergoing treatment)', 'decline'],
  ['Cardiomyopathy', 'standard'],
  ['Cerebral palsy', 'standard'],
  ['Cerebrovascular accident/stroke (CVA)', 'standard'],
  ['Chronic fatigue syndrome', 'preferred'],
  ['Chronic obstructive pulmonary disorder (COPD)', 'standard'],
  ['Chronic pain', 'standard'],
  ['Cirrhosis', 'decline'],
  ['Colitis, ulcerative', 'standard'],
  ['Colitis (other than ulcerative)', 'preferred'],
  ['Concussion (head injury)', 'preferred'],

  // Page 2
  ['Congestive heart failure (CHF)', 'decline'],
  ['Coronary artery disease', 'standard'],
  ['Criminal activity', 'preferred'],
  ['Crohn\'s disease', 'standard'],
  ['Cystic fibrosis', 'decline'],
  ['Depression', 'preferred'],
  ['Diabetes', 'standard'],
  ['Down syndrome', 'decline'],
  ['Emphysema', 'standard'],
  ['Endocarditis', 'standard'],
  ['Epilepsy (greater than age 3)', 'standard'],
  ['Fibromyalgia/fibrositis', 'preferred'],
  ['Gastric banding/sleeve/bypass surgery', 'preferred'],
  ['Gastroesophageal reflux disease (GERD)', 'preferred'],
  ['Glomerulonephritis', 'standard'],
  ['Headache, migraine or tension', 'preferred'],
  ['Heart attack', 'standard'],
  ['Heart, lung, or liver transplant', 'decline'],
  ['Heart valve surgery', 'standard'],
  ['Hepatitis B', 'standard'],
  ['Hepatitis C', 'standard'],
  ['Hernia', 'preferred'],
  ['High blood pressure/hypertension', 'preferred'],
  ['Histoplasmosis', 'standard'],
  ['Hodgkin\'s disease', 'standard'],
  ['Huntington\'s disease', 'decline'],
  ['Hydronephrosis', 'standard'],
  ['Kidney failure/dialysis', 'decline'],
  ['Kidney removal', 'preferred'],
  ['Leukemia', 'standard'],
  ['Lupus', 'standard'],
  ['Marijuana use', 'preferred'],
  ['Melanoma (less than 2mm, including in situ)', 'standard'],
  ['Meniere\'s disease', 'preferred'],
  ['Meningioma', 'preferred'],
  ['Meningitis (history of)', 'preferred'],

  // Page 3
  ['Mental retardation/intellectual disability', 'standard'],
  ['Mitral valve prolapse (MVP)', 'standard'],
  ['Mitral stenosis', 'standard'],
  ['Multiple sclerosis (MS)', 'standard'],
  ['Muscular dystrophy', 'standard'],
  ['Myasthenia gravis', 'standard'],
  ['Myocarditis', 'standard'],
  ['Nephrectomy', 'preferred'],
  ['Non-Hodgkin\'s lymphoma', 'standard'],
  ['Occupations with special hazards', 'preferred'],
  ['Pacemaker', 'standard'],
  ['Pancreatitis (resolved)', 'standard'],
  ['Paralysis/spinal cord injury', 'standard'],
  ['Parkinson\'s disease', 'standard'],
  ['Pericarditis', 'standard'],
  ['Peripheral vascular disease (PVD)', 'standard'],
  ['Phlebitis/thrombosis/blood clot', 'standard'],
  ['Pituitary adenoma', 'standard'],
  ['Pleurisy', 'preferred'],
  ['Pregnancy (no complications)', 'preferred'],
  ['Prostatitis (with normal PSA)', 'preferred'],
  ['Psychosis', 'standard'],
  ['Pulmonary fibrosis', 'decline'],
  ['Pyelonephritis, acute', 'preferred'],
  ['Pyelonephritis, chronic', 'standard'],
  ['Rheumatic fever (no heart complications)', 'preferred'],
  ['Sarcoidosis', 'standard'],
  ['Schizophrenia', 'standard'],
  ['Sleep apnea', 'preferred'],
  ['Stroke', 'standard'],
  ['Suicide attempt (more than 2 years ago)', 'standard'],
  ['Terminal illnesses', 'decline'],
  ['Thyroid disorder', 'preferred'],
  ['Transient ischemic attack (TIA)', 'standard'],
  ['Tuberculosis (recovered)', 'preferred'],
  ['Tumors, benign', 'preferred'],
  ['Tumors, malignant (history of)', 'standard'],

  // Page 4
  ['Ulcerative colitis', 'standard'],
  ['Ulcer, stomach', 'preferred'],
  ['Vascular Ehlers-Danlos syndrome', 'decline'],
  ['Wasting syndrome', 'decline'],
];

// Generate a condition code from the impairment name
function generateConditionCode(name) {
  return name
    .toLowerCase()
    .replace(/[()\/,.']/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

// Map best class to health_class enum value
function mapToHealthClass(bestClass) {
  switch (bestClass) {
    case 'preferred': return 'preferred';
    case 'standard': return 'standard';
    case 'decline': return 'decline';
    case 'refer': return 'refer';
    default: return 'standard';
  }
}

// Map best class to eligibility
function mapToEligibility(bestClass) {
  switch (bestClass) {
    case 'preferred': return 'eligible';
    case 'standard': return 'eligible';
    case 'decline': return 'ineligible';
    case 'refer': return 'refer';
    default: return 'refer';
  }
}

// Generate reason text
function generateReason(name, bestClass) {
  switch (bestClass) {
    case 'preferred':
      return `Applicants with ${name} may qualify for Preferred rate class per Transamerica underwriting guidelines.`;
    case 'standard':
      return `Applicants with ${name} are limited to Standard rate class maximum per Transamerica underwriting guidelines.`;
    case 'decline':
      return `Applicants with ${name} are not eligible for Term/IUL coverage per Transamerica underwriting guidelines.`;
    case 'refer':
      return `Applicants with ${name} require individual consideration per Transamerica underwriting guidelines.`;
    default:
      return `Per Transamerica underwriting guidelines.`;
  }
}

async function seedImpairmentRules() {
  console.log('=== Seeding Transamerica Medical Impairment Rules ===\n');
  console.log(`Total impairments to process: ${IMPAIRMENTS.length}\n`);

  // Get IMO
  const { data: imos } = await supabase.from('imos').select('id').limit(1);
  const imoId = imos[0].id;

  // Get user
  const { data: users } = await supabase.from('user_profiles').select('id').limit(1);
  const userId = users?.[0]?.id || imoId;

  // Get Transamerica Term/IUL products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, product_type')
    .eq('carrier_id', TRANSAMERICA_ID)
    .in('product_type', ['term_life', 'indexed_universal_life']);

  console.log(`Transamerica Term/IUL products: ${products.length}`);
  products.forEach(p => console.log(`  - ${p.name} [${p.product_type}]`));
  console.log('');

  // Get existing health conditions
  const { data: existingConditions } = await supabase
    .from('underwriting_health_conditions')
    .select('code, name');

  const existingCodes = new Set(existingConditions?.map(c => c.code) || []);
  console.log(`Existing health conditions in database: ${existingCodes.size}\n`);

  // Stats
  let ruleSetsCreated = 0;
  let rulesCreated = 0;
  let errors = 0;

  // Process each impairment
  // NOTE: We no longer create health conditions from carrier impairment rules.
  // The underwriting_health_conditions table is reserved for user-selectable
  // conditions with follow-up questions. Carrier rules can reference any
  // condition_code without requiring a matching health condition record.
  for (const [impairmentName, bestClass] of IMPAIRMENTS) {
    const conditionCode = generateConditionCode(impairmentName);

    console.log(`\n📋 ${impairmentName}`);
    console.log(`   Code: ${conditionCode}`);
    console.log(`   Best Class: ${bestClass.toUpperCase()}`);

    // Create rules for each Term/IUL product
    for (const product of products) {
      // Check if rule set already exists
      let { data: existingRuleSet } = await supabase
        .from('underwriting_rule_sets')
        .select('id')
        .eq('carrier_id', TRANSAMERICA_ID)
        .eq('product_id', product.id)
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
            product_id: product.id,
            scope: 'condition',
            condition_code: conditionCode,
            variant: 'default',
            name: `${impairmentName} - ${product.name}`,
            description: `Best rate class: ${bestClass.toUpperCase()}`,
            source_type: 'carrier_document',
            review_status: 'approved',
            is_active: true,
            created_by: userId,
          })
          .select()
          .single();

        if (rsError) {
          console.log(`   ⚠️  Error creating rule set for ${product.name}: ${rsError.message}`);
          errors++;
          continue;
        }

        ruleSetId = ruleSet.id;
        ruleSetsCreated++;
      }

      // Check if rule already exists
      const { data: existingRule } = await supabase
        .from('underwriting_rules')
        .select('id')
        .eq('rule_set_id', ruleSetId)
        .limit(1);

      if (existingRule && existingRule.length > 0) {
        continue; // Rule already exists
      }

      // Create the rule
      const { error: ruleError } = await supabase
        .from('underwriting_rules')
        .insert({
          rule_set_id: ruleSetId,
          priority: 10,
          name: `${impairmentName} - Best Class: ${bestClass.charAt(0).toUpperCase() + bestClass.slice(1)}`,
          description: generateReason(impairmentName, bestClass),
          predicate: { version: 2, root: {} }, // Empty = always matches for this condition
          predicate_version: 2,
          outcome_eligibility: mapToEligibility(bestClass),
          outcome_health_class: mapToHealthClass(bestClass),
          outcome_table_rating: 'none',
          outcome_reason: generateReason(impairmentName, bestClass),
          outcome_concerns: [conditionCode],
        });

      if (ruleError) {
        console.log(`   ⚠️  Error creating rule for ${product.name}: ${ruleError.message}`);
        errors++;
      } else {
        rulesCreated++;
      }
    }

    console.log(`   ✅ Rules created for ${products.length} products`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total impairments processed: ${IMPAIRMENTS.length}`);
  console.log(`Rule sets created: ${ruleSetsCreated}`);
  console.log(`Rules created: ${rulesCreated}`);
  console.log(`Errors: ${errors}`);

  // Breakdown by class
  const preferred = IMPAIRMENTS.filter(i => i[1] === 'preferred').length;
  const standard = IMPAIRMENTS.filter(i => i[1] === 'standard').length;
  const decline = IMPAIRMENTS.filter(i => i[1] === 'decline').length;
  const refer = IMPAIRMENTS.filter(i => i[1] === 'refer').length;

  console.log('\nBreakdown by best rate class:');
  console.log(`  Preferred: ${preferred}`);
  console.log(`  Standard: ${standard}`);
  console.log(`  Decline: ${decline}`);
  console.log(`  Refer: ${refer}`);

  console.log('\n✅ Done!');
}

seedImpairmentRules().catch(console.error);
