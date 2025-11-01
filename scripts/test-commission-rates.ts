#!/usr/bin/env tsx
/**
 * Test script for commission rate calculation system
 * Run with: npx tsx scripts/test-commission-rates.ts
 */

import { commissionRateService } from '../src/services/commissions/commissionRateService';

const TEST_USER_ID = 'd0d3edea-af6d-4990-80b8-1765ba829896';

async function testCommissionRates() {
  console.log('🔍 Testing Commission Rate Calculation System\n');

  try {
    // Test 1: Get user commission profile
    console.log('Test 1: Get User Commission Profile');
    console.log('─'.repeat(50));
    const profile = await commissionRateService.getUserCommissionProfile(TEST_USER_ID, 12);

    console.log(`✅ Contract Level: ${profile.contractLevel}`);
    console.log(`✅ Simple Average Rate: ${(profile.simpleAverageRate * 100).toFixed(2)}%`);
    console.log(`✅ Weighted Average Rate: ${(profile.weightedAverageRate * 100).toFixed(2)}%`);
    console.log(`✅ Recommended Rate: ${(profile.recommendedRate * 100).toFixed(2)}%`);
    console.log(`✅ Data Quality: ${profile.dataQuality}`);
    console.log(`✅ Products in Breakdown: ${profile.productBreakdown.length}`);
    console.log(`✅ Calculated At: ${profile.calculatedAt.toLocaleString()}`);
    console.log();

    // Test 2: Get recommended rate (convenience method)
    console.log('Test 2: Get Recommended Rate Only');
    console.log('─'.repeat(50));
    const rate = await commissionRateService.getUserRecommendedRate(TEST_USER_ID);
    console.log(`✅ Recommended Rate: ${(rate * 100).toFixed(2)}%`);
    console.log();

    // Test 3: Check data quality
    console.log('Test 3: Check Data Quality');
    console.log('─'.repeat(50));
    const hasGoodData = await commissionRateService.hasGoodCommissionData(TEST_USER_ID);
    console.log(`✅ Has Good Data: ${hasGoodData ? 'Yes' : 'No'}`);
    console.log();

    // Test 4: Show product breakdown (top 5 by weight)
    console.log('Test 4: Product Breakdown (Top 5 by Premium Weight)');
    console.log('─'.repeat(50));
    const topProducts = profile.productBreakdown
      .filter(p => p.premiumWeight > 0)
      .sort((a, b) => b.premiumWeight - a.premiumWeight)
      .slice(0, 5);

    if (topProducts.length > 0) {
      topProducts.forEach((product, i) => {
        console.log(`${i + 1}. ${product.productName} (${product.carrierName})`);
        console.log(`   Rate: ${(product.commissionRate * 100).toFixed(2)}%`);
        console.log(`   Weight: ${(product.premiumWeight * 100).toFixed(2)}%`);
        console.log(`   Policies: ${product.policyCount}`);
        console.log(`   Premium: $${product.totalPremium.toLocaleString()}`);
        console.log();
      });
    } else {
      console.log('⚠️  No sales history - using simple average');
      console.log();
    }

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCommissionRates();
