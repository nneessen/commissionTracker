// src/services/base/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create a single supabase client for interacting with your database
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Database tables
export const TABLES = {
  POLICIES: 'policies',
  COMMISSIONS: 'commissions',
  EXPENSES: 'expenses',
  CARRIERS: 'carriers',
  PRODUCTS: 'products',
  CLIENTS: 'clients',
  COMMISSION_RATES: 'commission_rates',
  CONSTANTS: 'constants',
  // AGENTS table removed - use user_profiles table instead
  // All users (agents, recruits, admins) are in user_profiles
  USER_PROFILES: 'user_profiles',
  AGENT_SETTINGS: 'agent_settings',
  COMP_GUIDE: 'comp_guide',
  CHARGEBACKS: 'chargebacks',
  USER_TARGETS: 'user_targets',
} as const;