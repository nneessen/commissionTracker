// src/services/commissions/index.ts
import {logger} from '../base/logger';

// Repository
export { CommissionRepository } from './CommissionRepository';

// Main facade service (for backward compatibility)
export { commissionService } from './commissionService';

// Specialized services (can be used directly for better performance)
export { commissionCRUDService } from './CommissionCRUDService';
export { commissionCalculationService } from './CommissionCalculationService';
export { commissionAnalyticsService } from './CommissionAnalyticsService';

// Other services
export { chargebackService } from './chargebackService';
export { commissionRateService } from './commissionRateService';

// Types
export type { CreateCommissionData, UpdateCommissionData, CommissionFilters } from './CommissionCRUDService';
export type { CalculationResult } from './CommissionCalculationService';
export type { ChargebackRisk, CommissionWithChargebackRisk, CommissionMetrics, NetCommissionMetrics } from './CommissionAnalyticsService';