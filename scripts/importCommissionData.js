// scripts/importCommissionData.js

import pg from 'pg';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

// Commission data extracted from CompGuide.pdf
const commissionData = [
  // United Home Life
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 80.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 85.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 90.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 95.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 100.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 105.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 110.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 115.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 120.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 125.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 130.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 135.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 140.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 145.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 80,
    commission_percentage: 72.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 85,
    commission_percentage: 76.50,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 90,
    commission_percentage: 81.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 95,
    commission_percentage: 85.50,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 100,
    commission_percentage: 90.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 105,
    commission_percentage: 94.50,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 110,
    commission_percentage: 99.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 115,
    commission_percentage: 103.50,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 120,
    commission_percentage: 108.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 125,
    commission_percentage: 112.50,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 130,
    commission_percentage: 117.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 135,
    commission_percentage: 121.50,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 140,
    commission_percentage: 126.00,
    is_active: true
  },
  {
    carrier_name: 'United Home Life',
    product_name: 'Whole Life',
    contract_level: 145,
    commission_percentage: 130.50,
    is_active: true
  },

  // SBLI
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 88.00,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 93.50,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 99.00,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 104.50,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 110.00,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 115.50,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 121.00,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 126.50,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 132.00,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 137.50,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 143.00,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 148.50,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 154.00,
    is_active: true
  },
  {
    carrier_name: 'SBLI',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 159.50,
    is_active: true
  },

  // American-Amicable
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 80,
    commission_percentage: 96.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 85,
    commission_percentage: 102.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 90,
    commission_percentage: 108.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 95,
    commission_percentage: 114.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 100,
    commission_percentage: 120.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 105,
    commission_percentage: 126.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 110,
    commission_percentage: 132.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 115,
    commission_percentage: 138.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 120,
    commission_percentage: 144.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 125,
    commission_percentage: 150.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 130,
    commission_percentage: 156.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 135,
    commission_percentage: 162.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 140,
    commission_percentage: 168.00,
    is_active: true
  },
  {
    carrier_name: 'American-Amicable',
    product_name: 'Whole Life',
    contract_level: 145,
    commission_percentage: 174.00,
    is_active: true
  },

  // CoreBridge
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 72.00,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 76.50,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 81.00,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 85.50,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 90.00,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 94.50,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 99.00,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 103.50,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 108.00,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 112.50,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 117.00,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 121.50,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 126.00,
    is_active: true
  },
  {
    carrier_name: 'CoreBridge',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 130.50,
    is_active: true
  },

  // ELCO Mutual
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 64.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 68.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 72.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 76.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 80.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 84.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 88.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 92.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 96.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 100.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 104.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 108.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 112.00,
    is_active: true
  },
  {
    carrier_name: 'ELCO Mutual',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 116.00,
    is_active: true
  },

  // American Home Life
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 80,
    commission_percentage: 80.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 85,
    commission_percentage: 85.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 90,
    commission_percentage: 90.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 95,
    commission_percentage: 95.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 100,
    commission_percentage: 100.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 105,
    commission_percentage: 105.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 110,
    commission_percentage: 110.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 115,
    commission_percentage: 115.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 120,
    commission_percentage: 120.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 125,
    commission_percentage: 125.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 130,
    commission_percentage: 130.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 135,
    commission_percentage: 135.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 140,
    commission_percentage: 140.00,
    is_active: true
  },
  {
    carrier_name: 'American Home Life',
    product_name: 'Whole Life',
    contract_level: 145,
    commission_percentage: 145.00,
    is_active: true
  },

  // Baltimore Life
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 72.00,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 76.50,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 81.00,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 85.50,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 90.00,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 94.50,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 99.00,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 103.50,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 108.00,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 112.50,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 117.00,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 121.50,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 126.00,
    is_active: true
  },
  {
    carrier_name: 'Baltimore Life',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 130.50,
    is_active: true
  },

  // F&G
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 80.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 85.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 90.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 95.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 100.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 105.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 110.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 115.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 120.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 125.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 130.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 135.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 140.00,
    is_active: true
  },
  {
    carrier_name: 'F&G',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 145.00,
    is_active: true
  },

  // Legal & General
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 64.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 68.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 72.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 76.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 80.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 84.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 88.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 92.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 96.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 100.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 104.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 108.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 112.00,
    is_active: true
  },
  {
    carrier_name: 'Legal & General',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 116.00,
    is_active: true
  },

  // Transamerica
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 80,
    commission_percentage: 80.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 85,
    commission_percentage: 85.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 90,
    commission_percentage: 90.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 95,
    commission_percentage: 95.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 100,
    commission_percentage: 100.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 105,
    commission_percentage: 105.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 110,
    commission_percentage: 110.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 115,
    commission_percentage: 115.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 120,
    commission_percentage: 120.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 125,
    commission_percentage: 125.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 130,
    commission_percentage: 130.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 135,
    commission_percentage: 135.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 140,
    commission_percentage: 140.00,
    is_active: true
  },
  {
    carrier_name: 'Transamerica',
    product_name: 'Term Life',
    contract_level: 145,
    commission_percentage: 145.00,
    is_active: true
  }
];

// Function to insert a batch of commission data
async function insertCommissionBatch(batch) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const entry of batch) {
      const {
        carrier_name,
        product_name,
        contract_level,
        commission_percentage
      } = entry;

      await client.query(`
        INSERT INTO comp_guide (carrier_name, product_name, contract_level, commission_percentage)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (carrier_name, product_name, contract_level) DO UPDATE SET
          commission_percentage = EXCLUDED.commission_percentage,
          updated_at = NOW()
      `, [carrier_name, product_name, contract_level, commission_percentage]);
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully inserted ${batch.length} commission entries`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error inserting commission data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to insert carrier data if not exists
async function insertCarriers() {
  const carriers = [...new Set(commissionData.map(entry => entry.carrier_name))];

  for (const carrierName of carriers) {
    try {
      // Check if carrier already exists
      const existingCarrier = await pool.query(`
        SELECT id FROM carriers WHERE name = $1
      `, [carrierName]);

      if (existingCarrier.rows.length === 0) {
        await pool.query(`
          INSERT INTO carriers (name, is_active, commission_rates)
          VALUES ($1, $2, $3)
        `, [carrierName, true, JSON.stringify({})]);
        console.log(`✅ Carrier "${carrierName}" created in database`);
      } else {
        console.log(`📋 Carrier "${carrierName}" already exists in database`);
      }
    } catch (error) {
      console.error(`❌ Error inserting carrier ${carrierName}:`, error);
    }
  }
}

// Main import function
async function importCommissionData() {
  try {
    console.log('🚀 Starting commission data import...');

    // First ensure all carriers exist
    console.log('📋 Inserting carriers...');
    await insertCarriers();

    // Insert commission data in batches of 50
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < commissionData.length; i += batchSize) {
      batches.push(commissionData.slice(i, i + batchSize));
    }

    console.log(`📊 Inserting ${commissionData.length} commission entries in ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
      console.log(`Processing batch ${i + 1}/${batches.length}...`);
      await insertCommissionBatch(batches[i]);
    }

    // Verify data
    const result = await pool.query('SELECT COUNT(*) as count FROM comp_guide');
    console.log(`✅ Import complete! Total commission entries in database: ${result.rows[0].count}`);

    // Show summary by carrier
    const summary = await pool.query(`
      SELECT carrier_name, COUNT(*) as entry_count
      FROM comp_guide
      GROUP BY carrier_name
      ORDER BY carrier_name
    `);

    console.log('\n📈 Summary by carrier:');
    summary.rows.forEach(row => {
      console.log(`  ${row.carrier_name}: ${row.entry_count} entries`);
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔒 Database connection closed');
  }
}

// Run the import
importCommissionData();