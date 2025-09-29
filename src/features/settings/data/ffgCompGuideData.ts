// FFG Comp Guide Data - Extracted from PDF dated 6/2/2025
// Commission rates by carrier, product, and contract level

export interface FFGProductData {
  carrier: string;
  product: string;
  contractLevel: number;
  commissionRate: number;
  effectiveDate: string;
}

export const FFG_COMP_GUIDE_DATA: FFGProductData[] = [
  // United Home Life
  ...Array.from({ length: 14 }, (_, i) => {
    const level = 145 - (i * 5);
    return [
      { carrier: 'United Home Life', product: 'Term', contractLevel: level, commissionRate: 150 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'United Home Life', product: 'Express Issue Premier WL', contractLevel: level, commissionRate: 135 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'United Home Life', product: 'Express Issue Deluxe WL', contractLevel: level, commissionRate: 135 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'United Home Life', product: 'Express Issue Graded WL', contractLevel: level, commissionRate: 135 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'United Home Life', product: 'Guaranteed Issue Whole Life', contractLevel: level, commissionRate: Math.max(25, 85 - (i * 5)), effectiveDate: '2025-06-02' },
      { carrier: 'United Home Life', product: 'Provider Whole Life', contractLevel: level, commissionRate: 120 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'United Home Life', product: 'Term', contractLevel: level, commissionRate: 120 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'United Home Life', product: 'Accidental', contractLevel: level, commissionRate: 110 - (i * 5), effectiveDate: '2025-06-02' }
    ];
  }).flat(),

  // SBLI
  ...Array.from({ length: 14 }, (_, i) => {
    const level = 145 - (i * 5);
    return [
      { carrier: 'SBLI', product: 'SBLI Term', contractLevel: level, commissionRate: 150 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'SBLI', product: 'Silver Guard FE', contractLevel: level, commissionRate: level >= 140 ? 115 : (level >= 135 ? 110 : (level >= 100 ? (115 - Math.floor((145 - level) / 10) * 5) : (level >= 90 ? 85 - (i * 5) : 65 + (level - 80) / 5 * 5))), effectiveDate: '2025-06-02' },
      { carrier: 'SBLI', product: 'A Priority Level Term (75K+)', contractLevel: level, commissionRate: level >= 110 ? (90 - Math.floor((145 - level) / 10) * 10) : (level >= 90 ? (70 - Math.floor((110 - level) / 5) * 10) : (50 - Math.floor((90 - level) / 5) * 5)), effectiveDate: '2025-06-02' },
      { carrier: 'SBLI', product: 'A Priority Whole Life', contractLevel: level, commissionRate: level >= 140 ? 115 : (level >= 135 ? 110 : (level >= 100 ? (115 - Math.floor((145 - level) / 10) * 5) : (level >= 85 ? (85 - Math.floor((100 - level) / 5) * 5) : 60))), effectiveDate: '2025-06-02' },
      { carrier: 'SBLI', product: 'A Priority Protector Term', contractLevel: level, commissionRate: level >= 110 ? (90 - Math.floor((145 - level) / 10) * 10) : (level >= 90 ? (70 - Math.floor((110 - level) / 5) * 10) : (50 - Math.floor((90 - level) / 5) * 5)), effectiveDate: '2025-06-02' }
    ];
  }).flat(),

  // American Home Life
  ...Array.from({ length: 14 }, (_, i) => {
    const level = 145 - (i * 5);
    return [
      { carrier: 'American Home Life', product: 'FE', contractLevel: level, commissionRate: 135 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'American Home Life', product: 'Simple Term', contractLevel: level, commissionRate: 150 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'American Home Life', product: 'Path Setter', contractLevel: level, commissionRate: 135 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'American Home Life', product: 'Everlast', contractLevel: level, commissionRate: 130 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'American Home Life', product: 'Exccudex', contractLevel: level, commissionRate: 135 - (i * 5), effectiveDate: '2025-06-02' }
    ];
  }).flat(),

  // American-Amicable Group
  ...Array.from({ length: 14 }, (_, i) => {
    const level = 145 - (i * 5);
    const baseRates = {
      'Express UL': 110 - (i * 5),
      'Home Protector': 135 - (i * 5),
      'OBA': 105 - (i * 5),
      'SecureLife Plus': 135 - (i * 5),
      'Security Protector': 115 - (i * 5),
      'Survivor Protector': 135 - (i * 5),
      'Term Made Simple': 100 - (i * 5),
      'Dignity Solutions & Family Legacy': 125 - (i * 5),
      'Express Term': 115 - (i * 5),
      'BonusMaster': level >= 95 ? (5.5 - (i * 0.25)) : 0,
      'Guaranteed Guardian': level >= 95 ? (80 - (i * 5)) : 0
    };

    return Object.entries(baseRates).map(([product, rate]) => ({
      carrier: 'American-Amicable Group',
      product,
      contractLevel: level,
      commissionRate: Math.max(0, rate),
      effectiveDate: '2025-06-02'
    }));
  }).flat(),

  // Corebridge Financial
  ...Array.from({ length: 14 }, (_, i) => {
    const level = 145 - (i * 5);
    return [
      { carrier: 'Corebridge Financial', product: 'GIWL Whole Life', contractLevel: level, commissionRate: level >= 125 ? 95 : (level >= 115 ? 90 : 80), effectiveDate: '2025-06-02' },
      { carrier: 'Corebridge Financial', product: 'SimpliNow Legacy Max SIWL', contractLevel: level, commissionRate: 137 - (i * 5), effectiveDate: '2025-06-02' }
    ];
  }).flat(),

  // Transamerica
  ...Array.from({ length: 14 }, (_, i) => {
    const level = 145 - (i * 5);
    const baseRates = {
      'TrendSetter Super Term': 105 - (i * 5),
      'TrendSetter LB Term': 115 - (i * 5),
      'Lifetime WL': 145 - (i * 5),
      'Immediate Solution WL': 130 - (i * 5),
      '10 Pay Solution WL': 107 - (i * 5),
      'Easy Solution WL': 80 - (i * 5),
      'Express Solution': 135 - (i * 5),
      'FFIUL': 122 - (i * 5)
    };

    return Object.entries(baseRates).map(([product, rate]) => ({
      carrier: 'Transamerica',
      product,
      contractLevel: level,
      commissionRate: Math.max(0, rate),
      effectiveDate: '2025-06-02'
    }));
  }).flat(),

  // ELCO Mutual
  ...Array.from({ length: 14 }, (_, i) => {
    const level = 145 - (i * 5);
    return [
      { carrier: 'ELCO Mutual', product: 'Guaranteed Issue FE', contractLevel: level, commissionRate: 65 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'ELCO Mutual', product: 'FE Immediate', contractLevel: level, commissionRate: 125 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'ELCO Mutual', product: 'Life Pay WL 0-75', contractLevel: level, commissionRate: 110 - (i * 5), effectiveDate: '2025-06-02' },
      { carrier: 'ELCO Mutual', product: 'Limited Pay WL', contractLevel: level, commissionRate: 90 - (i * 5), effectiveDate: '2025-06-02' }
    ];
  }).flat()
].filter(item => item.commissionRate > 0); // Remove entries with 0% commission

// Helper function to get unique carriers
export const getUniqueCarriers = (): string[] => {
  return [...new Set(FFG_COMP_GUIDE_DATA.map(item => item.carrier))];
};

// Helper function to get products by carrier
export const getProductsByCarrier = (carrier: string): string[] => {
  return [...new Set(FFG_COMP_GUIDE_DATA
    .filter(item => item.carrier === carrier)
    .map(item => item.product))];
};

// Helper function to get commission rate for specific combination
export const getCommissionRate = (carrier: string, product: string, contractLevel: number): number => {
  const item = FFG_COMP_GUIDE_DATA.find(
    data => data.carrier === carrier &&
             data.product === product &&
             data.contractLevel === contractLevel
  );
  return item?.commissionRate || 0;
};