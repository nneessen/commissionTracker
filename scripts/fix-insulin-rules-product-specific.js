// scripts/fix-insulin-rules-product-specific.js
// Updates insulin decline rules to only apply to Term, IUL, and Participating Whole Life

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Carriers that ACCEPT insulin users (exceptions)
const EXCEPTION_CARRIERS = ['Foresters Financial', 'Baltimore Life'];

// Product types that get the insulin decline rule
const TARGET_PRODUCT_TYPES = ['term_life', 'indexed_universal_life', 'participating_whole_life'];

async function fixInsulinRules() {
  console.log('=== Fixing Insulin Rules to be Product-Specific ===\n');

  // Get IMO
  const { data: imos } = await supabase.from('imos').select('id, name').limit(1);
  const imoId = imos[0].id;
  console.log(`IMO: ${imos[0].name}`);

  // Get user
  const { data: users } = await supabase.from('user_profiles').select('id').limit(1);
  const userId = users?.[0]?.id || imoId;

  // Step 1: Delete all existing insulin decline rules (we'll recreate them properly)
  console.log('\n[Step 1] Removing existing carrier-wide insulin rules...');

  const { data: existingRules, error: findError } = await supabase
    .from('underwriting_rules')
    .select('id, name, rule_set_id, underwriting_rule_sets(carrier_id, carriers(name))')
    .ilike('name', '%insulin%decline%');

  if (findError) {
    console.error('Error finding existing rules:', findError);
    return;
  }

  console.log(`Found ${existingRules?.length || 0} existing insulin rules to remove`);

  for (const rule of existingRules || []) {
    const { error: delError } = await supabase
      .from('underwriting_rules')
      .delete()
      .eq('id', rule.id);

    if (delError) {
      console.error(`  ❌ Error deleting rule ${rule.id}:`, delError.message);
    } else {
      const carrierName = rule.underwriting_rule_sets?.carriers?.name || 'Unknown';
      console.log(`  ✓ Deleted: ${rule.name} (${carrierName})`);
    }
  }

  // Step 2: Get all products that need insulin rules
  console.log('\n[Step 2] Finding target products (Term, IUL, Participating WL)...');

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, product_type, carrier_id, carriers(name)')
    .in('product_type', TARGET_PRODUCT_TYPES);

  if (prodError) {
    console.error('Error finding products:', prodError);
    return;
  }

  // Filter out exception carriers
  const targetProducts = products.filter(p => {
    const carrierName = p.carriers?.name || '';
    return !EXCEPTION_CARRIERS.some(exc =>
      carrierName.toLowerCase().includes(exc.toLowerCase())
    );
  });

  console.log(`Found ${targetProducts.length} products to add insulin rules for`);
  console.log(`(Excluded ${products.length - targetProducts.length} products from exception carriers)\n`);

  // Step 3: Create product-specific rule sets and rules
  console.log('[Step 3] Creating product-specific insulin rules...\n');

  const predicate = {
    version: 2,
    root: {
      all: [
        {
          type: 'boolean',
          field: 'diabetes.insulin_use',  // FIXED: matches conditionResponseTransformer output
          operator: 'eq',
          value: true,
          treatNullAs: 'unknown'
        }
      ]
    }
  };

  let created = 0;
  let skipped = 0;

  for (const product of targetProducts) {
    const carrierName = product.carriers?.name || 'Unknown';

    // Check if product-specific rule set exists
    let { data: existingRuleSets } = await supabase
      .from('underwriting_rule_sets')
      .select('id, name')
      .eq('carrier_id', product.carrier_id)
      .eq('product_id', product.id)
      .eq('condition_code', 'diabetes')
      .limit(1);

    let ruleSetId;

    if (existingRuleSets && existingRuleSets.length > 0) {
      ruleSetId = existingRuleSets[0].id;
    } else {
      // Create product-specific rule set
      const { data: ruleSet, error: rsError } = await supabase
        .from('underwriting_rule_sets')
        .insert({
          imo_id: imoId,
          carrier_id: product.carrier_id,
          product_id: product.id,
          scope: 'condition',
          condition_code: 'diabetes',
          variant: 'default',
          name: `Diabetes - ${product.name}`,
          description: `Underwriting rules for diabetes - ${product.name} (${carrierName})`,
          source_type: 'manual',
          review_status: 'approved',
          is_active: true,
          created_by: userId,
        })
        .select()
        .single();

      if (rsError) {
        console.error(`  ❌ Error creating rule set for ${product.name}:`, rsError.message);
        continue;
      }
      ruleSetId = ruleSet.id;
    }

    // Check if rule already exists
    const { data: existingInsulinRules } = await supabase
      .from('underwriting_rules')
      .select('id')
      .eq('rule_set_id', ruleSetId)
      .ilike('name', '%insulin%')
      .limit(1);

    if (existingInsulinRules && existingInsulinRules.length > 0) {
      skipped++;
      continue;
    }

    // Create the insulin decline rule
    const { error: ruleError } = await supabase
      .from('underwriting_rules')
      .insert({
        rule_set_id: ruleSetId,
        priority: 5,
        name: 'Insulin Use - Decline',
        description: `Applicants using insulin are declined for ${product.name}.`,
        predicate: predicate,
        predicate_version: 2,
        outcome_eligibility: 'ineligible',
        outcome_health_class: 'decline',
        outcome_table_rating: 'none',
        outcome_reason: `Insulin-dependent diabetics are not eligible for ${product.name} coverage.`,
        outcome_concerns: ['insulin_use', 'diabetes'],
      });

    if (ruleError) {
      console.error(`  ❌ Error creating rule for ${product.name}:`, ruleError.message);
    } else {
      created++;
      console.log(`  ✅ ${carrierName} → ${product.name} [${product.product_type}]`);
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Rules created: ${created}`);
  console.log(`Rules skipped (already exist): ${skipped}`);
  console.log(`\nProduct types with insulin decline:`);
  console.log(`  • Term Life`);
  console.log(`  • Indexed Universal Life (IUL)`);
  console.log(`  • Participating Whole Life`);
  console.log(`\nException carriers (accept insulin):`);
  EXCEPTION_CARRIERS.forEach(c => console.log(`  • ${c}`));
  console.log('\n✅ Done!');
}

fixInsulinRules().catch(console.error);
