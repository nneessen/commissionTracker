// Core infrastructure
export { supabase, TABLES } from './base/supabase';

// Base classes and types
export * from './base';

// Feature-organized services
export * from './policies';
export * from './commissions';
export * from './expenses';
export * from './settings';
export * from './analytics';
export * from './users';

// Individual service exports for backward compatibility
export { carrierService } from './settings/carrierService';
export { constantsService } from './settings/constantsService';
export { agentService, userService, userApprovalService } from './users/userService';
export { compGuideService } from './settings/compGuideService';
export { agentSettingsService } from './settings/agentSettingsService';
export { chargebackService } from './commissions/chargebackService';
export { commissionRateService } from './commissions/commissionRateService';
export { breakevenService } from './analytics/breakevenService';

// Legacy service exports for backward compatibility
export { policyService } from './policies/policyService';
export { commissionService } from './commissions/commissionService';
export { expenseService } from './expenses/expenseService';

// Type exports
export type { CreatePolicyData, UpdatePolicyData } from '../types/policy.types';
export type { CreateCommissionData, UpdateCommissionData } from '../types/commission.types';
export type { CreateExpenseData, UpdateExpenseData } from '../types/expense.types';
export type { ProductFormData as CreateProductData, NewCommissionRateForm as CreateCommissionRateData } from '../types/product.types';