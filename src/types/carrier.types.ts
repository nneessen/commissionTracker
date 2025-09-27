export interface Carrier {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
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
  isActive?: boolean;
}

export const DEFAULT_CARRIERS: Array<Omit<Carrier, 'id' | 'createdAt'>> = [
  { name: "United Home Life", isActive: true },
  { name: "Legal & General America", isActive: true },
  { name: "American Home Life", isActive: true },
  { name: "SBLI", isActive: true },
  { name: "Baltimore Life", isActive: true },
  { name: "John Hancock", isActive: true },
  { name: "American-Amicable Group", isActive: true },
  { name: "Corebridge Financial", isActive: true },
  { name: "Transamerica", isActive: true },
  { name: "ELCO Mutual", isActive: true },
  { name: "Kansas City Life", isActive: true },
];