// LEGACY HOOK - MIGRATED TO MODULAR ARCHITECTURE
// Use the new modular hooks from './expenses/' directory instead

export { useExpenses } from './expenses/useExpenses';
export { useExpense } from './expenses/useExpense';
export { useCreateExpense } from './expenses/useCreateExpense';
export { useUpdateExpense } from './expenses/useUpdateExpense';
export { useDeleteExpense } from './expenses/useDeleteExpense';
export { useExpenseMetrics } from './expenses/useExpenseMetrics';
export { useConstants } from './expenses/useConstants';

// For backward compatibility, export types
export type { UseExpensesResult } from './expenses/useExpenses';
export type { UseExpenseResult } from './expenses/useExpense';
export type { UseExpenseMetricsResult } from './expenses/useExpenseMetrics';
export type { UseConstantsResult } from './expenses/useConstants';