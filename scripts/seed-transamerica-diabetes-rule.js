// scripts/seed-transamerica-diabetes-rule.js
// Seeds a diabetes rule for Transamerica: best available class is Standard

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env file
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('KEY:', supabaseKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedRule() {
  console.log('Finding Transamerica carrier...');

  // Find Transamerica carrier
  const { data: carriers, error: carrierError } = await supabase
    .from('carriers')
    .select('id, name')
    .ilike('name', '%transamerica%')
    .limit(5);

  if (carrierError) {
    console.error('Error finding carrier:', carrierError);
    process.exit(1);
  }

  console.log('Found carriers:', carriers);

  if (!carriers || carriers.length === 0) {
    console.error('No Transamerica carrier found');
    process.exit(1);
  }

  const transamericaId = carriers[0].id;
  console.log(`Using carrier: ${carriers[0].name} (${transamericaId})`);

  // Get the first IMO for this carrier
  const { data: imos, error: imoError } = await supabase
    .from('imos')
    .select('id, name')
    .limit(1);

  if (imoError || !imos || imos.length === 0) {
    console.error('Error finding IMO:', imoError);
    process.exit(1);
  }

  const imoId = imos[0].id;
  console.log(`Using IMO: ${imos[0].name} (${imoId})`);

  // Get user ID from user_profiles
  const { data: users, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('Error finding user:', userError);
    // Use IMO ID as fallback for created_by
    console.log('Using IMO ID as fallback for created_by');
  }

  const userId = users?.[0]?.id || imoId;
  console.log(`Using user: ${users?.[0]?.email || 'N/A'} (${userId})`);

  // Check if rule set already exists
  const { data: existingRuleSets } = await supabase
    .from('underwriting_rule_sets')
    .select('id, name')
    .eq('carrier_id', transamericaId)
    .eq('condition_code', 'diabetes')
    .limit(1);

  let ruleSetId;

  if (existingRuleSets && existingRuleSets.length > 0) {
    ruleSetId = existingRuleSets[0].id;
    console.log(`Rule set already exists: ${existingRuleSets[0].name} (${ruleSetId})`);
  } else {
    // Create rule set for Diabetes
    console.log('Creating rule set for Diabetes...');

    const { data: ruleSet, error: ruleSetError } = await supabase
      .from('underwriting_rule_sets')
      .insert({
        imo_id: imoId,
        carrier_id: transamericaId,
        product_id: null, // Carrier-wide rule
        scope: 'condition',
        condition_code: 'diabetes',
        variant: 'default',
        name: 'Diabetes - Transamerica Term',
        description: 'Underwriting rules for diabetes. Best available rating class is Standard.',
        source_type: 'manual',
        review_status: 'approved', // Set to approved so it's active
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (ruleSetError) {
      console.error('Error creating rule set:', ruleSetError);
      process.exit(1);
    }

    ruleSetId = ruleSet.id;
    console.log(`Created rule set: ${ruleSet.name} (${ruleSetId})`);
  }

  // Check if rule already exists
  const { data: existingRules } = await supabase
    .from('underwriting_rules')
    .select('id, name')
    .eq('rule_set_id', ruleSetId)
    .ilike('name', '%standard%')
    .limit(1);

  if (existingRules && existingRules.length > 0) {
    console.log(`Rule already exists: ${existingRules[0].name}`);
    console.log('\nDone! Rule already seeded.');
    return;
  }

  // Create the rule: Diabetes = Best Class is Standard
  console.log('Creating rule: Diabetes - Best Available is Standard...');

  // The predicate is empty because this is a "default" rule for diabetes
  // If someone has diabetes type 2, the BEST they can get is Standard
  // No specific conditions needed - just having diabetes triggers this
  const predicate = {
    version: 2,
    root: {} // Empty predicate = always matches (for this condition)
  };

  const { data: rule, error: ruleError } = await supabase
    .from('underwriting_rules')
    .insert({
      rule_set_id: ruleSetId,
      priority: 10,
      name: 'Diabetes - Best Available Class is Standard',
      description: 'For applicants with Diabetes Type 2, the best available rating class is Standard. No preferred classes available.',
      age_band_min: null,
      age_band_max: null,
      gender: null,
      predicate: predicate,
      predicate_version: 2,
      outcome_eligibility: 'eligible',
      outcome_health_class: 'standard',
      outcome_table_rating: 'none',
      outcome_flat_extra_per_thousand: null,
      outcome_flat_extra_years: null,
      outcome_reason: 'Diabetic applicants are limited to Standard class maximum per Transamerica underwriting guidelines.',
      outcome_concerns: ['diabetes', 'metabolic_condition'],
    })
    .select()
    .single();

  if (ruleError) {
    console.error('Error creating rule:', ruleError);
    process.exit(1);
  }

  console.log(`Created rule: ${rule.name} (${rule.id})`);
  console.log('\n✅ Done! Rule seeded successfully.');
  console.log('\nRule Summary:');
  console.log('  Carrier: Transamerica');
  console.log('  Condition: Diabetes');
  console.log('  Rule: Best available class is Standard');
  console.log('  Eligibility: Eligible');
  console.log('  Health Class: Standard');
  console.log('  Reason: Diabetic applicants limited to Standard class maximum');
  console.log('\nYou can view and edit this rule in the UI at:');
  console.log('  Settings → Carriers → Transamerica → Acceptance Rules → Diabetes');
}

seedRule().catch(console.error);
