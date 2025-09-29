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
  phone?: string;
  contractCompLevel: number; // 80-145
  licenseNumber?: string;
  licenseStates?: string[];
  hireDate?: Date;
  isActive: boolean;
  ytdCommission?: number;
  ytdPremium?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentData {
  name: string;
  email?: string;
  phone?: string;
  contractCompLevel: number;
  licenseNumber?: string;
  licenseStates?: string[];
  hireDate?: Date;
  isActive?: boolean;
  ytdCommission?: number;
  ytdPremium?: number;
}

export interface UpdateAgentData extends Partial<CreateAgentData> {
  id: string;
}

// CompGuideEntry, CompGuideLookup, and CommissionCalculation moved to product.types.ts

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