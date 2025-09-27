// LEGACY HOOK - MIGRATED TO MODULAR ARCHITECTURE
// Use the new modular hooks from './commissions/' directory instead

export { useCommissions } from './commissions/useCommissions';
export { useCommission } from './commissions/useCommission';
export { useCreateCommission } from './commissions/useCreateCommission';
export { useDeleteCommission } from './commissions/useDeleteCommission';
export { useCommissionMetrics } from './commissions/useCommissionMetrics';

// For backward compatibility, export types
export type { UseCommissionsResult } from './commissions/useCommissions';
export type { UseCommissionResult } from './commissions/useCommission';
export type { UseCreateCommissionResult } from './commissions/useCreateCommission';
export type { UseDeleteCommissionResult } from './commissions/useDeleteCommission';
export type { UseCommissionMetricsResult } from './commissions/useCommissionMetrics';

