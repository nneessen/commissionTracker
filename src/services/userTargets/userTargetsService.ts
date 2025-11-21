// src/services/userTargets/userTargetsService.ts

import { supabase } from '../base/supabase';

export interface UserTargets {
  id: string;
  user_id: string;
  annual_income_target: number;
  monthly_income_target: number;
  quarterly_income_target: number;
  annual_policies_target: number;
  monthly_policies_target: number;
  avg_premium_target: number;
  persistency_13_month_target: number;
  persistency_25_month_target: number;
  monthly_expense_target: number;
  expense_ratio_target: number;
  achievements: any[];
  last_milestone_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserTargetsInput {
  annual_income_target?: number;
  monthly_income_target?: number;
  quarterly_income_target?: number;
  annual_policies_target?: number;
  monthly_policies_target?: number;
  avg_premium_target?: number;
  persistency_13_month_target?: number;
  persistency_25_month_target?: number;
  monthly_expense_target?: number;
  expense_ratio_target?: number;
}

class UserTargetsService {
  /**
   * Get user targets for the current user
   */
  async get(): Promise<UserTargets | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_targets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data;
  }

  /**
   * Create or update user targets for the current user
   */
  async upsert(input: UpdateUserTargetsInput): Promise<UserTargets> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_targets')
      .upsert({
        user_id: user.id,
        ...input,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Update specific target fields
   */
  async update(input: UpdateUserTargetsInput): Promise<UserTargets> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_targets')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}

export const userTargetsService = new UserTargetsService();
