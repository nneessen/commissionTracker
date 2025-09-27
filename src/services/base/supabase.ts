import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing env.VITE_SUPABASE_URL');
}

if (!supabaseKey) {
  throw new Error('Missing env.VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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