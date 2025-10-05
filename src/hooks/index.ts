// src/hooks/index.ts

// Base utility hooks (generic, reusable)
export * from './base';

// Feature-specific hooks (modular architecture)
export * from './commissions';
export * from './policies';
export * from './expenses';
export * from './carriers';
export * from './products';
export * from './comps';

// Utility hooks
export { useMigration } from './useMigration';
export { useLocalStorage } from './useLocalStorage';
export { useMetrics } from './useMetrics';
