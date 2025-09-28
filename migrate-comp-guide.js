// Migration script to import PDF_COMMISSION_DATA into comp_guide table
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'commission_tracker',
  user: 'postgres',
  password: 'password',
});

// Data extracted from src/data/compGuideData.ts
const PDF_COMMISSION_DATA = [
  {
    carrierName: "United Home Life",
    products: [
      {
        productName: "Express Issue Premier WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "Express Issue Deluxe WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "Express Issue Graded WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "Guaranteed Issue Whole Life",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 25 },
          { contractLevel: 85, percentage: 25 },
          { contractLevel: 90, percentage: 30 },
          { contractLevel: 95, percentage: 35 },
          { contractLevel: 100, percentage: 40 },
          { contractLevel: 105, percentage: 45 },
          { contractLevel: 110, percentage: 50 },
          { contractLevel: 115, percentage: 55 },
          { contractLevel: 120, percentage: 60 },
          { contractLevel: 125, percentage: 65 },
          { contractLevel: 130, percentage: 70 },
          { contractLevel: 135, percentage: 75 },
          { contractLevel: 140, percentage: 80 },
          { contractLevel: 145, percentage: 85 },
        ]
      },
      {
        productName: "Provider Whole Life",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 55 },
          { contractLevel: 85, percentage: 60 },
          { contractLevel: 90, percentage: 65 },
          { contractLevel: 95, percentage: 70 },
          { contractLevel: 100, percentage: 75 },
          { contractLevel: 105, percentage: 80 },
          { contractLevel: 110, percentage: 85 },
          { contractLevel: 115, percentage: 90 },
          { contractLevel: 120, percentage: 95 },
          { contractLevel: 125, percentage: 100 },
          { contractLevel: 130, percentage: 105 },
          { contractLevel: 135, percentage: 110 },
          { contractLevel: 140, percentage: 115 },
          { contractLevel: 145, percentage: 120 },
        ]
      },
      {
        productName: "Term",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 55 },
          { contractLevel: 85, percentage: 60 },
          { contractLevel: 90, percentage: 65 },
          { contractLevel: 95, percentage: 70 },
          { contractLevel: 100, percentage: 75 },
          { contractLevel: 105, percentage: 80 },
          { contractLevel: 110, percentage: 85 },
          { contractLevel: 115, percentage: 90 },
          { contractLevel: 120, percentage: 95 },
          { contractLevel: 125, percentage: 100 },
          { contractLevel: 130, percentage: 105 },
          { contractLevel: 135, percentage: 110 },
          { contractLevel: 140, percentage: 115 },
          { contractLevel: 145, percentage: 120 },
        ]
      },
      {
        productName: "Accidental",
        productType: "accidental",
        commissionRates: [
          { contractLevel: 80, percentage: 45 },
          { contractLevel: 85, percentage: 50 },
          { contractLevel: 90, percentage: 55 },
          { contractLevel: 95, percentage: 60 },
          { contractLevel: 100, percentage: 65 },
          { contractLevel: 105, percentage: 70 },
          { contractLevel: 110, percentage: 75 },
          { contractLevel: 115, percentage: 80 },
          { contractLevel: 120, percentage: 85 },
          { contractLevel: 125, percentage: 90 },
          { contractLevel: 130, percentage: 95 },
          { contractLevel: 135, percentage: 100 },
          { contractLevel: 140, percentage: 105 },
          { contractLevel: 145, percentage: 110 },
        ]
      }
    ]
  },
  {
    carrierName: "SBLI",
    products: [
      {
        productName: "SBLI Term",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 85 },
          { contractLevel: 85, percentage: 90 },
          { contractLevel: 90, percentage: 95 },
          { contractLevel: 95, percentage: 100 },
          { contractLevel: 100, percentage: 105 },
          { contractLevel: 105, percentage: 110 },
          { contractLevel: 110, percentage: 115 },
          { contractLevel: 115, percentage: 120 },
          { contractLevel: 120, percentage: 125 },
          { contractLevel: 125, percentage: 130 },
          { contractLevel: 130, percentage: 135 },
          { contractLevel: 135, percentage: 140 },
          { contractLevel: 140, percentage: 145 },
          { contractLevel: 145, percentage: 150 },
        ]
      },
      {
        productName: "Silver Guard FE",
        productType: "final_expense",
        commissionRates: [
          { contractLevel: 80, percentage: 65 },
          { contractLevel: 85, percentage: 70 },
          { contractLevel: 90, percentage: 75 },
          { contractLevel: 95, percentage: 80 },
          { contractLevel: 100, percentage: 85 },
          { contractLevel: 105, percentage: 85 },
          { contractLevel: 110, percentage: 90 },
          { contractLevel: 115, percentage: 90 },
          { contractLevel: 120, percentage: 95 },
          { contractLevel: 125, percentage: 100 },
          { contractLevel: 130, percentage: 105 },
          { contractLevel: 135, percentage: 110 },
          { contractLevel: 140, percentage: 115 },
          { contractLevel: 145, percentage: 115 },
        ]
      },
      {
        productName: "APriority Level Term (75K+)",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 45 },
          { contractLevel: 85, percentage: 50 },
          { contractLevel: 90, percentage: 50 },
          { contractLevel: 95, percentage: 55 },
          { contractLevel: 100, percentage: 55 },
          { contractLevel: 105, percentage: 60 },
          { contractLevel: 110, percentage: 70 },
          { contractLevel: 115, percentage: 70 },
          { contractLevel: 120, percentage: 80 },
          { contractLevel: 125, percentage: 80 },
          { contractLevel: 130, percentage: 85 },
          { contractLevel: 135, percentage: 85 },
          { contractLevel: 140, percentage: 90 },
          { contractLevel: 145, percentage: 90 },
        ]
      },
      {
        productName: "APriority Whole Life",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 60 },
          { contractLevel: 85, percentage: 60 },
          { contractLevel: 90, percentage: 65 },
          { contractLevel: 95, percentage: 70 },
          { contractLevel: 100, percentage: 75 },
          { contractLevel: 105, percentage: 80 },
          { contractLevel: 110, percentage: 85 },
          { contractLevel: 115, percentage: 90 },
          { contractLevel: 120, percentage: 95 },
          { contractLevel: 125, percentage: 100 },
          { contractLevel: 130, percentage: 105 },
          { contractLevel: 135, percentage: 110 },
          { contractLevel: 140, percentage: 115 },
          { contractLevel: 145, percentage: 115 },
        ]
      },
      {
        productName: "APriority Protector Term",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 45 },
          { contractLevel: 85, percentage: 50 },
          { contractLevel: 90, percentage: 50 },
          { contractLevel: 95, percentage: 55 },
          { contractLevel: 100, percentage: 55 },
          { contractLevel: 105, percentage: 60 },
          { contractLevel: 110, percentage: 70 },
          { contractLevel: 115, percentage: 70 },
          { contractLevel: 120, percentage: 80 },
          { contractLevel: 125, percentage: 80 },
          { contractLevel: 130, percentage: 85 },
          { contractLevel: 135, percentage: 85 },
          { contractLevel: 140, percentage: 90 },
          { contractLevel: 145, percentage: 90 },
        ]
      }
    ]
  },
  {
    carrierName: "American Home Life",
    products: [
      {
        productName: "FE",
        productType: "final_expense",
        commissionRates: [
          { contractLevel: 80, percentage: 65 },
          { contractLevel: 85, percentage: 70 },
          { contractLevel: 90, percentage: 75 },
          { contractLevel: 95, percentage: 80 },
          { contractLevel: 100, percentage: 85 },
          { contractLevel: 105, percentage: 90 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      }
    ]
  },
  {
    carrierName: "John Hancock",
    products: [
      {
        productName: "Simple Term",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 85 },
          { contractLevel: 85, percentage: 90 },
          { contractLevel: 90, percentage: 95 },
          { contractLevel: 95, percentage: 100 },
          { contractLevel: 100, percentage: 105 },
          { contractLevel: 105, percentage: 110 },
          { contractLevel: 110, percentage: 115 },
          { contractLevel: 115, percentage: 120 },
          { contractLevel: 120, percentage: 125 },
          { contractLevel: 125, percentage: 130 },
          { contractLevel: 130, percentage: 135 },
          { contractLevel: 135, percentage: 140 },
          { contractLevel: 140, percentage: 145 },
          { contractLevel: 145, percentage: 150 },
        ]
      },
      {
        productName: "Path Setter",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "Everlast",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 65 },
          { contractLevel: 85, percentage: 70 },
          { contractLevel: 90, percentage: 75 },
          { contractLevel: 95, percentage: 80 },
          { contractLevel: 100, percentage: 85 },
          { contractLevel: 105, percentage: 90 },
          { contractLevel: 110, percentage: 95 },
          { contractLevel: 115, percentage: 100 },
          { contractLevel: 120, percentage: 105 },
          { contractLevel: 125, percentage: 110 },
          { contractLevel: 130, percentage: 115 },
          { contractLevel: 135, percentage: 120 },
          { contractLevel: 140, percentage: 125 },
          { contractLevel: 145, percentage: 130 },
        ]
      },
      {
        productName: "Exccudex",
        productType: "universal_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      }
    ]
  },
  {
    carrierName: "American-Amicable Group",
    products: [
      {
        productName: "Express UL",
        productType: "universal_life",
        commissionRates: [
          { contractLevel: 80, percentage: 45 },
          { contractLevel: 85, percentage: 50 },
          { contractLevel: 90, percentage: 55 },
          { contractLevel: 95, percentage: 60 },
          { contractLevel: 100, percentage: 65 },
          { contractLevel: 105, percentage: 70 },
          { contractLevel: 110, percentage: 75 },
          { contractLevel: 115, percentage: 80 },
          { contractLevel: 120, percentage: 85 },
          { contractLevel: 125, percentage: 90 },
          { contractLevel: 130, percentage: 95 },
          { contractLevel: 135, percentage: 100 },
          { contractLevel: 140, percentage: 105 },
          { contractLevel: 145, percentage: 110 },
        ]
      },
      {
        productName: "Home Protector",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "OBA",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 40 },
          { contractLevel: 85, percentage: 45 },
          { contractLevel: 90, percentage: 50 },
          { contractLevel: 95, percentage: 55 },
          { contractLevel: 100, percentage: 60 },
          { contractLevel: 105, percentage: 65 },
          { contractLevel: 110, percentage: 70 },
          { contractLevel: 115, percentage: 75 },
          { contractLevel: 120, percentage: 80 },
          { contractLevel: 125, percentage: 85 },
          { contractLevel: 130, percentage: 90 },
          { contractLevel: 135, percentage: 95 },
          { contractLevel: 140, percentage: 100 },
          { contractLevel: 145, percentage: 105 },
        ]
      },
      {
        productName: "SecureLife Plus",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "Security Protector",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 50 },
          { contractLevel: 85, percentage: 55 },
          { contractLevel: 90, percentage: 60 },
          { contractLevel: 95, percentage: 65 },
          { contractLevel: 100, percentage: 70 },
          { contractLevel: 105, percentage: 75 },
          { contractLevel: 110, percentage: 80 },
          { contractLevel: 115, percentage: 85 },
          { contractLevel: 120, percentage: 90 },
          { contractLevel: 125, percentage: 95 },
          { contractLevel: 130, percentage: 100 },
          { contractLevel: 135, percentage: 105 },
          { contractLevel: 140, percentage: 110 },
          { contractLevel: 145, percentage: 115 },
        ]
      },
      {
        productName: "Survivor Protector",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 90 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "Term Made Simple",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 40 },
          { contractLevel: 85, percentage: 40 },
          { contractLevel: 90, percentage: 45 },
          { contractLevel: 95, percentage: 50 },
          { contractLevel: 100, percentage: 55 },
          { contractLevel: 105, percentage: 60 },
          { contractLevel: 110, percentage: 65 },
          { contractLevel: 115, percentage: 70 },
          { contractLevel: 120, percentage: 75 },
          { contractLevel: 125, percentage: 80 },
          { contractLevel: 130, percentage: 85 },
          { contractLevel: 135, percentage: 90 },
          { contractLevel: 140, percentage: 95 },
          { contractLevel: 145, percentage: 100 },
        ]
      },
      {
        productName: "Dignity Solutions & Family Legacy",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 60 },
          { contractLevel: 85, percentage: 65 },
          { contractLevel: 90, percentage: 70 },
          { contractLevel: 95, percentage: 75 },
          { contractLevel: 100, percentage: 80 },
          { contractLevel: 105, percentage: 85 },
          { contractLevel: 110, percentage: 90 },
          { contractLevel: 115, percentage: 95 },
          { contractLevel: 120, percentage: 100 },
          { contractLevel: 125, percentage: 105 },
          { contractLevel: 130, percentage: 110 },
          { contractLevel: 135, percentage: 115 },
          { contractLevel: 140, percentage: 120 },
          { contractLevel: 145, percentage: 125 },
        ]
      },
      {
        productName: "Express Term",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 50 },
          { contractLevel: 85, percentage: 55 },
          { contractLevel: 90, percentage: 60 },
          { contractLevel: 95, percentage: 65 },
          { contractLevel: 100, percentage: 70 },
          { contractLevel: 105, percentage: 75 },
          { contractLevel: 110, percentage: 80 },
          { contractLevel: 115, percentage: 85 },
          { contractLevel: 120, percentage: 90 },
          { contractLevel: 125, percentage: 95 },
          { contractLevel: 130, percentage: 100 },
          { contractLevel: 135, percentage: 105 },
          { contractLevel: 140, percentage: 110 },
          { contractLevel: 145, percentage: 115 },
        ]
      },
      {
        productName: "BonusMaster",
        productType: "annuity",
        commissionRates: [
          { contractLevel: 80, percentage: 0 },
          { contractLevel: 85, percentage: 0 },
          { contractLevel: 90, percentage: 2 },
          { contractLevel: 95, percentage: 3 },
          { contractLevel: 100, percentage: 3.5 },
          { contractLevel: 105, percentage: 3.5 },
          { contractLevel: 110, percentage: 4 },
          { contractLevel: 115, percentage: 4 },
          { contractLevel: 120, percentage: 4.25 },
          { contractLevel: 125, percentage: 4.5 },
          { contractLevel: 130, percentage: 4.75 },
          { contractLevel: 135, percentage: 5 },
          { contractLevel: 140, percentage: 5.25 },
          { contractLevel: 145, percentage: 5.5 },
        ]
      },
      {
        productName: "Guaranteed Guardian",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 0 },
          { contractLevel: 85, percentage: 0 },
          { contractLevel: 90, percentage: 30 },
          { contractLevel: 95, percentage: 35 },
          { contractLevel: 100, percentage: 40 },
          { contractLevel: 105, percentage: 45 },
          { contractLevel: 110, percentage: 50 },
          { contractLevel: 115, percentage: 55 },
          { contractLevel: 120, percentage: 60 },
          { contractLevel: 125, percentage: 65 },
          { contractLevel: 130, percentage: 70 },
          { contractLevel: 135, percentage: 75 },
          { contractLevel: 140, percentage: 75 },
          { contractLevel: 145, percentage: 80 },
        ]
      }
    ]
  },
  {
    carrierName: "Corebridge Financial",
    products: [
      {
        productName: "GIWL Whole Life",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 65 },
          { contractLevel: 85, percentage: 70 },
          { contractLevel: 90, percentage: 75 },
          { contractLevel: 95, percentage: 80 },
          { contractLevel: 100, percentage: 80 },
          { contractLevel: 105, percentage: 80 },
          { contractLevel: 110, percentage: 80 },
          { contractLevel: 115, percentage: 80 },
          { contractLevel: 120, percentage: 90 },
          { contractLevel: 125, percentage: 90 },
          { contractLevel: 130, percentage: 95 },
          { contractLevel: 135, percentage: 95 },
          { contractLevel: 140, percentage: 95 },
          { contractLevel: 145, percentage: 95 },
        ]
      },
      {
        productName: "SimpliNow Legacy Max SIWL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 72 },
          { contractLevel: 85, percentage: 77 },
          { contractLevel: 90, percentage: 82 },
          { contractLevel: 95, percentage: 87 },
          { contractLevel: 100, percentage: 92 },
          { contractLevel: 105, percentage: 97 },
          { contractLevel: 110, percentage: 102 },
          { contractLevel: 115, percentage: 107 },
          { contractLevel: 120, percentage: 112 },
          { contractLevel: 125, percentage: 117 },
          { contractLevel: 130, percentage: 122 },
          { contractLevel: 135, percentage: 127 },
          { contractLevel: 140, percentage: 132 },
          { contractLevel: 145, percentage: 137 },
        ]
      }
    ]
  },
  {
    carrierName: "Transamerica",
    products: [
      {
        productName: "Trendsetter Super Term",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 55 },
          { contractLevel: 85, percentage: 60 },
          { contractLevel: 90, percentage: 65 },
          { contractLevel: 95, percentage: 70 },
          { contractLevel: 100, percentage: 75 },
          { contractLevel: 105, percentage: 75 },
          { contractLevel: 110, percentage: 80 },
          { contractLevel: 115, percentage: 85 },
          { contractLevel: 120, percentage: 85 },
          { contractLevel: 125, percentage: 90 },
          { contractLevel: 130, percentage: 95 },
          { contractLevel: 135, percentage: 95 },
          { contractLevel: 140, percentage: 100 },
          { contractLevel: 145, percentage: 105 },
        ]
      },
      {
        productName: "Trendsetter LB Term",
        productType: "term",
        commissionRates: [
          { contractLevel: 80, percentage: 65 },
          { contractLevel: 85, percentage: 70 },
          { contractLevel: 90, percentage: 75 },
          { contractLevel: 95, percentage: 80 },
          { contractLevel: 100, percentage: 85 },
          { contractLevel: 105, percentage: 85 },
          { contractLevel: 110, percentage: 90 },
          { contractLevel: 115, percentage: 95 },
          { contractLevel: 120, percentage: 95 },
          { contractLevel: 125, percentage: 100 },
          { contractLevel: 130, percentage: 105 },
          { contractLevel: 135, percentage: 105 },
          { contractLevel: 140, percentage: 110 },
          { contractLevel: 145, percentage: 115 },
        ]
      },
      {
        productName: "Lifetime WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 75 },
          { contractLevel: 85, percentage: 80 },
          { contractLevel: 90, percentage: 85 },
          { contractLevel: 95, percentage: 90 },
          { contractLevel: 100, percentage: 95 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 105 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 120 },
          { contractLevel: 140, percentage: 140 },
          { contractLevel: 145, percentage: 145 },
        ]
      },
      {
        productName: "Immediate Solution WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 75 },
          { contractLevel: 85, percentage: 80 },
          { contractLevel: 90, percentage: 85 },
          { contractLevel: 95, percentage: 90 },
          { contractLevel: 100, percentage: 95 },
          { contractLevel: 105, percentage: 95 },
          { contractLevel: 110, percentage: 100 },
          { contractLevel: 115, percentage: 105 },
          { contractLevel: 120, percentage: 105 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 120 },
          { contractLevel: 135, percentage: 120 },
          { contractLevel: 140, percentage: 125 },
          { contractLevel: 145, percentage: 130 },
        ]
      },
      {
        productName: "10 Pay Solution WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 65 },
          { contractLevel: 85, percentage: 70 },
          { contractLevel: 90, percentage: 75 },
          { contractLevel: 95, percentage: 80 },
          { contractLevel: 100, percentage: 85 },
          { contractLevel: 105, percentage: 85 },
          { contractLevel: 110, percentage: 90 },
          { contractLevel: 115, percentage: 92 },
          { contractLevel: 120, percentage: 92 },
          { contractLevel: 125, percentage: 94 },
          { contractLevel: 130, percentage: 98 },
          { contractLevel: 135, percentage: 98 },
          { contractLevel: 140, percentage: 102 },
          { contractLevel: 145, percentage: 107 },
        ]
      },
      {
        productName: "Easy Solution WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 28 },
          { contractLevel: 85, percentage: 33 },
          { contractLevel: 90, percentage: 38 },
          { contractLevel: 95, percentage: 43 },
          { contractLevel: 100, percentage: 48 },
          { contractLevel: 105, percentage: 48 },
          { contractLevel: 110, percentage: 53 },
          { contractLevel: 115, percentage: 58 },
          { contractLevel: 120, percentage: 58 },
          { contractLevel: 125, percentage: 63 },
          { contractLevel: 130, percentage: 68 },
          { contractLevel: 135, percentage: 68 },
          { contractLevel: 140, percentage: 75 },
          { contractLevel: 145, percentage: 80 },
        ]
      },
      {
        productName: "Express Solution",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 80 },
          { contractLevel: 85, percentage: 85 },
          { contractLevel: 90, percentage: 90 },
          { contractLevel: 95, percentage: 95 },
          { contractLevel: 100, percentage: 100 },
          { contractLevel: 105, percentage: 100 },
          { contractLevel: 110, percentage: 105 },
          { contractLevel: 115, percentage: 110 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 120 },
          { contractLevel: 130, percentage: 125 },
          { contractLevel: 135, percentage: 125 },
          { contractLevel: 140, percentage: 130 },
          { contractLevel: 145, percentage: 135 },
        ]
      },
      {
        productName: "FFIUL",
        productType: "indexed_universal_life",
        commissionRates: [
          { contractLevel: 80, percentage: 70 },
          { contractLevel: 85, percentage: 75 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 85 },
          { contractLevel: 105, percentage: 90 },
          { contractLevel: 110, percentage: 95 },
          { contractLevel: 115, percentage: 95 },
          { contractLevel: 120, percentage: 100 },
          { contractLevel: 125, percentage: 105 },
          { contractLevel: 130, percentage: 105 },
          { contractLevel: 135, percentage: 110 },
          { contractLevel: 140, percentage: 117 },
          { contractLevel: 145, percentage: 122 },
        ]
      }
    ]
  },
  {
    carrierName: "ELCO Mutual",
    products: [
      {
        productName: "Guaranteed Issue FE",
        productType: "final_expense",
        commissionRates: [
          { contractLevel: 80, percentage: 30 },
          { contractLevel: 85, percentage: 35 },
          { contractLevel: 90, percentage: 35 },
          { contractLevel: 95, percentage: 40 },
          { contractLevel: 100, percentage: 40 },
          { contractLevel: 105, percentage: 45 },
          { contractLevel: 110, percentage: 45 },
          { contractLevel: 115, percentage: 50 },
          { contractLevel: 120, percentage: 50 },
          { contractLevel: 125, percentage: 55 },
          { contractLevel: 130, percentage: 55 },
          { contractLevel: 135, percentage: 60 },
          { contractLevel: 140, percentage: 60 },
          { contractLevel: 145, percentage: 65 },
        ]
      },
      {
        productName: "FE Immediate",
        productType: "final_expense",
        commissionRates: [
          { contractLevel: 80, percentage: 90 },
          { contractLevel: 85, percentage: 95 },
          { contractLevel: 90, percentage: 95 },
          { contractLevel: 95, percentage: 100 },
          { contractLevel: 100, percentage: 100 },
          { contractLevel: 105, percentage: 105 },
          { contractLevel: 110, percentage: 105 },
          { contractLevel: 115, percentage: 110 },
          { contractLevel: 120, percentage: 110 },
          { contractLevel: 125, percentage: 115 },
          { contractLevel: 130, percentage: 115 },
          { contractLevel: 135, percentage: 120 },
          { contractLevel: 140, percentage: 120 },
          { contractLevel: 145, percentage: 125 },
        ]
      },
      {
        productName: "Life Pay WL 0-75",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 75 },
          { contractLevel: 85, percentage: 80 },
          { contractLevel: 90, percentage: 80 },
          { contractLevel: 95, percentage: 85 },
          { contractLevel: 100, percentage: 85 },
          { contractLevel: 105, percentage: 90 },
          { contractLevel: 110, percentage: 90 },
          { contractLevel: 115, percentage: 95 },
          { contractLevel: 120, percentage: 95 },
          { contractLevel: 125, percentage: 100 },
          { contractLevel: 130, percentage: 100 },
          { contractLevel: 135, percentage: 105 },
          { contractLevel: 140, percentage: 105 },
          { contractLevel: 145, percentage: 110 },
        ]
      },
      {
        productName: "Limited Pay WL",
        productType: "whole_life",
        commissionRates: [
          { contractLevel: 80, percentage: 55 },
          { contractLevel: 85, percentage: 60 },
          { contractLevel: 90, percentage: 60 },
          { contractLevel: 95, percentage: 65 },
          { contractLevel: 100, percentage: 65 },
          { contractLevel: 105, percentage: 70 },
          { contractLevel: 110, percentage: 70 },
          { contractLevel: 115, percentage: 75 },
          { contractLevel: 120, percentage: 75 },
          { contractLevel: 125, percentage: 80 },
          { contractLevel: 130, percentage: 80 },
          { contractLevel: 135, percentage: 85 },
          { contractLevel: 140, percentage: 85 },
          { contractLevel: 145, percentage: 90 },
        ]
      }
    ]
  }
];

async function migrateCompGuideData() {
  console.log('🚀 Starting comp_guide data migration...');

  try {
    // Connect to database
    await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    // Count existing records
    const existingCount = await pool.query('SELECT COUNT(*) FROM comp_guide');
    console.log(`📊 Existing records in comp_guide: ${existingCount.rows[0].count}`);

    // Clear existing data if any
    if (existingCount.rows[0].count > 0) {
      console.log('🗑️  Clearing existing comp_guide data...');
      await pool.query('TRUNCATE TABLE comp_guide');
    }

    let totalInserted = 0;
    let totalSkipped = 0;

    // Process each carrier
    for (const carrier of PDF_COMMISSION_DATA) {
      console.log(`\n📦 Processing carrier: ${carrier.carrierName}`);

      // Process each product
      for (const product of carrier.products) {
        console.log(`  📋 Product: ${product.productName}`);

        // Process each commission rate
        for (const rate of product.commissionRates) {
          try {
            const query = `
              INSERT INTO comp_guide (
                carrier_name,
                product_name,
                product_type,
                contract_level,
                commission_percentage,
                effective_date,
                is_active
              ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, true)
            `;

            await pool.query(query, [
              carrier.carrierName,
              product.productName,
              product.productType,
              rate.contractLevel,
              rate.percentage, // Already in percentage format (e.g., 125.5)
            ]);

            totalInserted++;
          } catch (error) {
            console.error(`    ❌ Error inserting rate for ${carrier.carrierName} - ${product.productName} @ ${rate.contractLevel}%:`, error.message);
            totalSkipped++;
          }
        }
      }
    }

    // Final count
    const finalCount = await pool.query('SELECT COUNT(*) FROM comp_guide');

    console.log('\n✨ Migration Complete!');
    console.log(`📊 Total records inserted: ${totalInserted}`);
    console.log(`⚠️  Total records skipped: ${totalSkipped}`);
    console.log(`✅ Final record count: ${finalCount.rows[0].count}`);

    // Create indexes for better performance
    console.log('\n🔧 Creating indexes for performance...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comp_guide_search ON comp_guide(carrier_name, product_name, contract_level)');
    console.log('✅ Indexes created');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n👋 Database connection closed');
  }
}

// Run migration
migrateCompGuideData();