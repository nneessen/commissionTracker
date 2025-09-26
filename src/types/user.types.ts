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

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  isActive?: boolean;
}