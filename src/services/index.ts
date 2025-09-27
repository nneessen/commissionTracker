// Core infrastructure
export { supabase, TABLES } from './supabase';

// Base classes and types
export * from './base';

// New feature-organized services (preferred)
export * from './policies';
export * from './commissions';
export * from './expenses';

// Legacy services (to be migrated)
export { carrierService } from './carrierService';
export { constantsService } from './constantsService';
export { agentService } from './agentService';
export { compGuideService } from './compGuideService';
export { chargebackService } from './chargebackService';
export { breakevenService } from './breakevenService';

// Legacy service exports for backward compatibility
export { policyService } from './policyService';
export { commissionService } from './commissionService';
export { expenseService } from './expenseService';

// New service type exports
export type { CreatePolicyData, UpdatePolicyData } from '../types/policy.types';
export type { CreateCommissionData, UpdateCommissionData } from '../types/commission.types';
export type { CreateExpenseData, UpdateExpenseData } from '../types/expense.types';

// Legacy type exports
export type { CreateCarrierData, UpdateCarrierData } from './carrierService';
export type { CreateAgentData, UpdateAgentData } from './agentService';
export type { CreateChargebackData } from './chargebackService';