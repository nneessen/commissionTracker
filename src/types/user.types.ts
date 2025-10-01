// User represents the authenticated user with agent properties
export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  contractCompLevel?: number; // 80-145
  isActive?: boolean;
  agentCode?: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseStates?: string[];
  notes?: string;
  hireDate?: Date;
  ytdCommission?: number;
  ytdPremium?: number;
  createdAt?: Date;
  updatedAt?: Date;
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

// For backward compatibility, Agent is now an alias for User
export type Agent = User;

export interface CreateUserData {
  name?: string;
  email: string;
  phone?: string;
  contractCompLevel?: number;
  licenseNumber?: string;
  licenseStates?: string[];
  hireDate?: Date;
  isActive?: boolean;
  ytdCommission?: number;
  ytdPremium?: number;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  id: string;
}

// Maintain backward compatibility
export type CreateAgentData = CreateUserData;
export type UpdateAgentData = UpdateUserData;

// CompGuideEntry, CompGuideLookup, and CommissionCalculation moved to product.types.ts

export interface Chargeback {
  id: string;
  policyId: string;
  commissionId: string;
  userId?: string;
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
  userId?: string;
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