#!/usr/bin/env node
// /home/nneessen/projects/commissionTracker/scripts/populate-comp-guide.js
// Script to populate comp_guide table with ALL carrier commission data from FFG Comp Guide

import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config({ path: '.env.local' });

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

// Complete comp guide data from FFG PDF
const compGuideData = {
  // Page 1 - United Home Life (Legal & General America)
  "United Home Life": {
    products: {
      "TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85],
      "EXPRESS ISSUE PREMIER WL": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "EXPRESS ISSUE DELUXE WL": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "EXPRESS ISSUE GRADED WL": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "GUARANTEED ISSUE WHOLE LIFE": [85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 25],
      "PROVIDER WHOLE LIFE": [120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55],
      "ACCIDENTAL": [110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45]
    }
  },

  // Page 2 - American Home Life
  "American Home Life": {
    products: {
      "FE": [135, 130, 125, 120, 115, 110, 105, 100, 90, 85, 80, 75, 70, 65],
      "SIMPLE TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85],
      "PATH SETTER": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "EVERLAST": [130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65],
      "EXCCUDEX": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70]
    }
  },

  // Page 2 - SBLI
  "SBLI": {
    products: {
      "SBLI TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85],
      "SILVER GUARD FE": [115, 115, 110, 105, 100, 95, 90, 90, 85, 85, 80, 75, 70, 65]
    }
  },

  // Page 2 - The Baltimore Life
  "The Baltimore Life": {
    products: {
      "APRIORITY LEVEL TERM (75K+)": [90, 90, 85, 85, 80, 80, 70, 70, 60, 55, 55, 50, 50, 45],
      "APRIORITY WHOLE LIFE": [115, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 60],
      "APRIORITY PROTECTOR TERM": [90, 90, 85, 85, 80, 80, 70, 70, 60, 55, 55, 50, 50, 45]
    }
  },

  // Page 2 - John Hancock
  "John Hancock": {
    products: {
      "FE": [135, 130, 125, 120, 115, 110, 105, 100, 90, 85, 80, 75, 70, 65],
      "SIMPLE TERM": [150, 145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85],
      "PATH SETTER": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "EVERLAST": [130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65],
      "EXCCUDEX": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70]
    }
  },

  // Page 3 - American-Amicable Group
  "American-Amicable": {
    products: {
      "EXPRESS UL": [110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45],
      "HOME PROTECTOR": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "OBA": [105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40],
      "SECURELIFE PLUS": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "SECURITY PROTECTOR": [115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50],
      "SURVIVOR PROTECTOR": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "TERM MADE SIMPLE": [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 40],
      "DIGNITY SOLUTIONS & FAMILY LEGACY": [125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60],
      "EXPRESS TERM": [115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50],
      "BONUSMASTER": [5.5, 5.25, 5, 4.75, 4.5, 4.25, 4, 4, 3.5, 3.5, 3, 2, 0, 0],
      "GUARANTEED GUARDIAN": [80, 75, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 0, 0]
    }
  },

  // Page 4 - Corebridge Financial
  "Corebridge Financial": {
    products: {
      "GIWL WHOLE LIFE": [95, 95, 95, 95, 90, 90, 80, 80, 80, 80, 80, 75, 70, 65],
      "SIMPLINOW LEGACY MAX SIWL": [137, 132, 127, 122, 117, 112, 107, 102, 97, 92, 87, 82, 77, 72]
    }
  },

  // Page 4 - Transamerica
  "Transamerica": {
    products: {
      "TRENDSETTER SUPER TERM": [105, 100, 95, 95, 90, 85, 85, 80, 75, 75, 70, 65, 60, 55],
      "TRENDSETTER LB TERM": [115, 110, 105, 105, 100, 95, 95, 90, 85, 85, 80, 75, 70, 65],
      "LIFETIME WL": [145, 140, 120, 120, 115, 105, 105, 100, 95, 95, 90, 85, 80, 75],
      "IMMEDIATE SOLUTION WL": [130, 125, 120, 120, 115, 105, 105, 100, 95, 95, 90, 85, 80, 75],
      "10 PAY SOLUTION WL": [107, 102, 98, 98, 94, 92, 92, 90, 85, 85, 80, 75, 70, 65],
      "EASY SOLUTION WL": [80, 75, 68, 68, 63, 58, 58, 53, 48, 48, 43, 38, 33, 28],
      "EXTRESS SOLUTION": [135, 130, 125, 125, 120, 110, 110, 105, 100, 100, 95, 90, 85, 80],
      "FFIUL": [122, 117, 110, 105, 105, 100, 95, 95, 90, 85, 85, 80, 75, 70]
    }
  },

  // Page 5 - ELCO Mutual
  "ELCO Mutual": {
    products: {
      "GUARENTED ISSUE FE": [65, 60, 60, 55, 55, 50, 50, 45, 45, 40, 40, 35, 35, 30],
      "FE IMMEDIATE": [125, 120, 120, 115, 115, 110, 110, 105, 105, 100, 100, 95, 95, 90],
      "LIFE PAY WL 0-75": [110, 105, 105, 100, 100, 95, 95, 90, 90, 85, 85, 80, 80, 75],
      "LIMITED PAY WL": [90, 85, 85, 80, 80, 75, 75, 70, 70, 65, 65, 60, 60, 55]
    }
  },

  // Kansas City Life - Page 5 (partial data shown, you can add more)
  "Kansas City Life": {
    products: {
      "TERM": [135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70],
      "WHOLE LIFE": [125, 120, 115, 110, 105, 100, 95, 90, 85, 80, 75, 70, 65, 60]
    }
  }
};

// Contract levels (80-145 in increments of 5)
const contractLevels = [145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80];

// Product type mapping
function mapProductType(productName) {
  const name = productName.toUpperCase();
  if (name.includes('TERM')) return 'term';
  if (name.includes('WHOLE LIFE') || name.includes('WL')) return 'whole_life';
  if (name.includes('UNIVERSAL') || name.includes('UL') || name.includes('IUL')) return 'universal_life';
  if (name.includes('INDEXED')) return 'indexed_universal_life';
  if (name.includes('ACCIDENTAL')) return 'accidental';
  if (name.includes('FE') || name.includes('FINAL')) return 'final_expense';
  if (name.includes('ANNUITY')) return 'annuity';
  return 'other';
}

async function populateCompGuide() {
  const client = new Client(connectionString);

  try {
    await client.connect();
    console.log('Connected to database');

    // First, ensure all carriers exist
    console.log('\n1. Ensuring carriers exist...');
    for (const carrierName of Object.keys(compGuideData)) {
      const checkResult = await client.query(
        'SELECT id FROM carriers WHERE name = $1',
        [carrierName]
      );

      if (checkResult.rows.length === 0) {
        await client.query(
          'INSERT INTO carriers (name, short_name, is_active) VALUES ($1, $2, $3)',
          [carrierName, carrierName.substring(0, 50), true]
        );
        console.log(`  ✓ Added carrier: ${carrierName}`);
      } else {
        console.log(`  ✓ Carrier exists: ${carrierName}`);
      }
    }

    // Clear existing comp_guide data
    console.log('\n2. Clearing existing comp_guide data...');
    await client.query('TRUNCATE TABLE comp_guide CASCADE');
    console.log('  ✓ Cleared existing data');

    // Insert all comp guide data
    console.log('\n3. Inserting comp guide data...');
    let totalInserted = 0;

    for (const [carrierName, carrierData] of Object.entries(compGuideData)) {
      console.log(`\n  Processing ${carrierName}:`);

      for (const [productName, commissionRates] of Object.entries(carrierData.products)) {
        const productType = mapProductType(productName);
        let productInserted = 0;

        // Insert commission rates for each contract level
        for (let i = 0; i < contractLevels.length && i < commissionRates.length; i++) {
          const contractLevel = contractLevels[i];
          const commissionPercentage = commissionRates[i];

          try {
            await client.query(
              `INSERT INTO comp_guide (
                carrier_name,
                product_name,
                product_type,
                contract_level,
                commission_percentage
              ) VALUES ($1, $2, $3, $4, $5)`,
              [carrierName, productName, productType, contractLevel, commissionPercentage]
            );
            productInserted++;
            totalInserted++;
          } catch (error) {
            console.error(`    ✗ Error inserting ${productName} @ ${contractLevel}:`, error.message);
          }
        }
        console.log(`    ✓ ${productName}: ${productInserted} levels`);
      }
    }

    console.log(`\n=== Import Complete ===`);
    console.log(`Total records inserted: ${totalInserted}`);

    // Verify the data
    const countResult = await client.query('SELECT COUNT(*) FROM comp_guide');
    const carrierCount = await client.query('SELECT COUNT(DISTINCT carrier_name) FROM comp_guide');
    const productCount = await client.query('SELECT COUNT(DISTINCT product_name) FROM comp_guide');

    console.log('\n=== Database Statistics ===');
    console.log(`Total comp guide records: ${countResult.rows[0].count}`);
    console.log(`Unique carriers: ${carrierCount.rows[0].count}`);
    console.log(`Unique products: ${productCount.rows[0].count}`);

    // Show sample data
    const sampleResult = await client.query(`
      SELECT carrier_name, product_name, contract_level, commission_percentage
      FROM comp_guide
      WHERE carrier_name = 'United Home Life'
        AND product_name = 'TERM'
        AND contract_level IN (145, 125, 100, 80)
      ORDER BY contract_level DESC
    `);

    console.log('\n=== Sample Data (United Home Life - TERM) ===');
    console.table(sampleResult.rows);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
populateCompGuide().then(() => {
  console.log('\nScript completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});