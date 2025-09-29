export interface Carrier {
  id: string;
  name: string;
  short_name?: string;
  is_active: boolean;
  default_commission_rates: Record<string, number>;
  contact_info: {
    email?: string;
    phone?: string;
    website?: string;
    rep_name?: string;
    rep_email?: string;
    rep_phone?: string;
  };
  notes?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CarrierStats {
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
  short_name?: string;
  is_active?: boolean;
  default_commission_rates?: Record<string, number>;
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    rep_name?: string;
    rep_email?: string;
    rep_phone?: string;
  };
  notes?: string;
}

export const DEFAULT_CARRIERS: Array<Omit<Carrier, 'id' | 'created_at'>> = [
  { 
    name: "United Home Life", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "Legal & General America", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "American Home Life", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "SBLI", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "Baltimore Life", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "John Hancock", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "American-Amicable Group", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "Corebridge Financial", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "Transamerica", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "ELCO Mutual", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
  { 
    name: "Kansas City Life", 
    is_active: true, 
    default_commission_rates: {},
    contact_info: {} 
  },
];