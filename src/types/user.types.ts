export interface User {
  id?: string;
  name: string;
  email: string;
  isAuthenticated: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
  defaultCommissionRate: number;
  notifications: {
    emailReports: boolean;
    policyReminders: boolean;
    goalAchievements: boolean;
  };
}

// Agent and Commission Guide Types
export interface Agent {
  id: string;
  name: string;
  email?: string;
  contractCompLevel: number; // 80-145
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentData {
  name: string;
  email?: string;
  contractCompLevel: number;
  isActive?: boolean;
}

export interface UpdateAgentData extends Partial<CreateAgentData> {
  id: string;
}

export interface CompGuideEntry {
  id: string;
  carrierName: string;
  productName: string;
  contractLevel: number; // 80-145
  commissionPercentage: number; // Stored as percentage (e.g., 125.50 for 125.5%)
  createdAt: Date;
  updatedAt: Date;
}

export interface CompGuideLookup {
  carrierName: string;
  productName: string;
  contractLevel: number;
}

export interface CommissionCalculation {
  monthlyPremium: number;
  commissionPercentage: number;
  advanceMonths: number; // typically 9
  totalCommission: number;
}

export interface Chargeback {
  id: string;
  policyId: string;
  commissionId: string;
  agentId?: string;
  chargebackType: 'policy_lapse' | 'refund' | 'cancellation';
  chargebackAmount: number;
  chargebackReason?: string;
  policyLapseDate?: Date;
  chargebackDate: Date;
  status: 'pending' | 'processed' | 'disputed' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChargebackData {
  policyId: string;
  commissionId: string;
  agentId?: string;
  chargebackType: 'policy_lapse' | 'refund' | 'cancellation';
  chargebackAmount: number;
  chargebackReason?: string;
  policyLapseDate?: Date;
  chargebackDate: Date;
  status?: 'pending' | 'processed' | 'disputed' | 'resolved';
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  isActive?: boolean;
}