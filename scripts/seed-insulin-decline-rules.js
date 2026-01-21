// scripts/seed-insulin-decline-rules.js
// Creates "Insulin Use = Decline" rules for all carriers except Foresters and Baltimore Life

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Carriers that ACCEPT insulin users (exceptions)
const EXCEPTION_CARRIERS = [
  'Foresters Financial',
  'Baltimore Life',
];

async function seedInsulinRules() {
  console.log('=== Seeding Insulin Decline Rules ===\n');

  // Get IMO
  const { data: imos } = await supabase.from('imos').select('id, name').limit(1);
  const imoId = imos[0].id;
  console.log(`IMO: ${imos[0].name}`);

  // Get user
  const { data: users } = await supabase.from('user_profiles').select('id, email').limit(1);
  const userId = users?.[0]?.id || imoId;
  console.log(`User: ${users?.[0]?.email || 'N/A'}`);

  // Get all carriers
  const { data: carriers, error: carrierError } = await supabase
    .from('carriers')
    .select('id, name')
    .order('name');

  if (carrierError) {
    console.error('Error fetching carriers:', carrierError);
    process.exit(1);
  }

  console.log(`\nFound ${carriers.length} carriers\n`);

  // Process each carrier
  for (const carrier of carriers) {
    const isException = EXCEPTION_CARRIERS.some(
      exc => carrier.name.toLowerCase().includes(exc.toLowerCase())
    );

    if (isException) {
      console.log(`⏭️  SKIPPING ${carrier.name} (accepts insulin users)`);
      continue;
    }

    console.log(`\n📋 Processing ${carrier.name}...`);

    // Check if diabetes rule set exists for this carrier
    let { data: existingRuleSets } = await supabase
      .from('underwriting_rule_sets')
      .select('id, name')
      .eq('carrier_id', carrier.id)
      .eq('condition_code', 'diabetes')
      .limit(1);

    let ruleSetId;

    if (existingRuleSets && existingRuleSets.length > 0) {
      ruleSetId = existingRuleSets[0].id;
      console.log(`   Found existing rule set: ${existingRuleSets[0].name}`);
    } else {
      // Create diabetes rule set for this carrier
      const { data: ruleSet, error: ruleSetError } = await supabase
        .from('underwriting_rule_sets')
        .insert({
          imo_id: imoId,
          carrier_id: carrier.id,
          product_id: null,
          scope: 'condition',
          condition_code: 'diabetes',
          variant: 'default',
          name: `Diabetes - ${carrier.name}`,
          description: `Underwriting rules for diabetes - ${carrier.name}`,
          source_type: 'manual',
          review_status: 'approved',
          is_active: true,
          created_by: userId,
        })
        .select()
        .single();

      if (ruleSetError) {
        console.error(`   ❌ Error creating rule set:`, ruleSetError.message);
        continue;
      }

      ruleSetId = ruleSet.id;
      console.log(`   Created rule set: ${ruleSet.name}`);
    }

    // Check if insulin decline rule already exists
    const { data: existingRules } = await supabase
      .from('underwriting_rules')
      .select('id, name')
      .eq('rule_set_id', ruleSetId)
      .ilike('name', '%insulin%decline%')
      .limit(1);

    if (existingRules && existingRules.length > 0) {
      console.log(`   ⏭️  Insulin rule already exists: ${existingRules[0].name}`);
      continue;
    }

    // Create the insulin decline rule
    // Priority 5 = evaluated BEFORE "best class is standard" (priority 10)
    const predicate = {
      version: 2,
      root: {
        all: [
          {
            type: 'boolean',
            field: 'diabetes.insulin_use',  // FIXED: matches conditionResponseTransformer output
            operator: 'eq',
            value: true,
            treatNullAs: 'unknown'  // If we don't know, refer for review
          }
        ]
      }
    };

    const { data: rule, error: ruleError } = await supabase
      .from('underwriting_rules')
      .insert({
        rule_set_id: ruleSetId,
        priority: 5,  // Higher priority than "best class" rule
        name: 'Insulin Use - Decline',
        description: 'Applicants using insulin for diabetes management are declined for term/IUL products.',
        age_band_min: null,
        age_band_max: null,
        gender: null,
        predicate: predicate,
        predicate_version: 2,
        outcome_eligibility: 'ineligible',
        outcome_health_class: 'decline',
        outcome_table_rating: 'none',
        outcome_flat_extra_per_thousand: null,
        outcome_flat_extra_years: null,
        outcome_reason: 'Insulin-dependent diabetics are not eligible for term/IUL coverage with this carrier.',
        outcome_concerns: ['insulin_use', 'diabetes', 'metabolic_condition'],
      })
      .select()
      .single();

    if (ruleError) {
      console.error(`   ❌ Error creating rule:`, ruleError.message);
      continue;
    }

    console.log(`   ✅ Created rule: ${rule.name}`);
  }

  console.log('\n=== Summary ===');
  console.log(`Carriers with insulin DECLINE: ${carriers.length - EXCEPTION_CARRIERS.length}`);
  console.log(`Carriers that ACCEPT insulin: ${EXCEPTION_CARRIERS.join(', ')}`);
  console.log('\n✅ Done!');
}

seedInsulinRules().catch(console.error);
