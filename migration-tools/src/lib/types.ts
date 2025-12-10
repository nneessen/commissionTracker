// /home/nneessen/projects/commissionTracker/migration-tools/src/lib/types.ts

export interface UserMapping {
  old_user_id: string;
  new_user_id: string;
  email: string;
  name: string;
}

export interface MigrationLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  data?: any;
}

export interface MigrationSummary {
  userId: string;
  userName: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  timestamp: string;
  duration: number;
  summary: {
    dealsProcessed: number;
    policiesCreated: number;
    clientsCreated: number;
    commissionsCreated: number;
    carriersMatched: number;
    carriersCreated: number;
    productsCreated: number;
    errors: number;
    warnings: number;
  };
  logs: MigrationLog[];
}

export type ProductType =
  | 'term_life'
  | 'whole_life'
  | 'universal_life'
  | 'variable_life'
  | 'health'
  | 'disability'
  | 'annuity';
