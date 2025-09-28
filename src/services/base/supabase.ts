import { createClient } from '@supabase/supabase-js';
import { createLocalApiClient } from './localApi';

const useLocal = import.meta.env.VITE_USE_LOCAL === 'true';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create appropriate client based on environment
let supabase: any;

if (useLocal) {
  console.log('🏠 Using local API at http://localhost:3001');
  supabase = createLocalApiClient();
} else {
  if (!supabaseUrl) {
    throw new Error('Missing env.VITE_SUPABASE_URL');
  }

  if (!supabaseKey) {
    throw new Error('Missing env.VITE_SUPABASE_ANON_KEY');
  }

  console.log('☁️ Using Supabase');
  supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };

// Database tables
export const TABLES = {
  POLICIES: 'policies',
  COMMISSIONS: 'commissions',
  EXPENSES: 'expenses',
  CARRIERS: 'carriers',
  PRODUCTS: 'products',
  COMMISSION_RATES: 'commission_rates',
  CONSTANTS: 'constants',
  AGENTS: 'agents',
  AGENT_SETTINGS: 'agent_settings',
  COMP_GUIDE: 'comp_guide',
  CHARGEBACKS: 'chargebacks',
} as const;