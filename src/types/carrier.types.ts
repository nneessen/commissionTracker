export interface Carrier {
  id: string;
  name: string;
  isActive: boolean;
  commissionRates: ProductCommissionRates;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ProductCommissionRates {
  whole_life: number;
  term_life: number;
  universal_life: number;
  indexed_universal_life: number;
  accidental_life: number;
}

export interface CarrierPerformance {
  carrierId: string;
  carrierName: string;
  totalCommissions: number;
  totalPremiums: number;
  policyCount: number;
  averageCommissionRate: number;
  averagePremium: number;
}

export interface NewCarrierForm {
  name: string;
  commissionRates: ProductCommissionRates;
}

export const DEFAULT_CARRIERS: Array<Omit<Carrier, 'id' | 'createdAt'>> = [
  {
    name: "Baltimore Life",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "Royal Neighbors",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "United Home Life",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "American Home Life",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "F&G",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "Mutual of Omaha",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "SBLI",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "Legal & General",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "ELCO Mutual",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "CoreBridge",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "Liberty Bankers",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
  {
    name: "American Amicable",
    isActive: true,
    commissionRates: {
      whole_life: 0.75,
      term_life: 0.60,
      universal_life: 0.70,
      indexed_universal_life: 0.80,
      accidental_life: 0.55,
    },
  },
];