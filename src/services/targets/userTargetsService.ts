// src/services/targets/userTargetsService.ts

import { supabase } from "../base/supabase";
import {
  userTargetsRepository,
  type UserTargetsRow,
} from "./UserTargetsRepository";

/**
 * User Targets interface (snake_case for backward compatibility)
 * Used by useUserTargets hook
 */
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON type for achievements
  achievements: any[];
  last_milestone_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Update input interface (snake_case)
 */
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

/**
 * User Targets Service
 *
 * Provides current-user scoped access to user targets.
 * Uses internal auth pattern (fetches user from session).
 * Returns snake_case data for backward compatibility.
 *
 * Delegates database operations to UserTargetsRepository.
 */
class UserTargetsService {
  /**
   * Get current user's targets
   */
  async get(): Promise<UserTargets | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const raw = await userTargetsRepository.findRawByUserId(user.id);
    return raw ? this.mapToUserTargets(raw) : null;
  }

  /**
   * Upsert current user's targets (create if not exists, update if exists)
   */
  async upsert(input: UpdateUserTargetsInput): Promise<UserTargets> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const raw = await userTargetsRepository.upsertRaw(user.id, input);
    return this.mapToUserTargets(raw);
  }

  /**
   * Update current user's targets
   */
  async update(input: UpdateUserTargetsInput): Promise<UserTargets> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const raw = await userTargetsRepository.updateRaw(user.id, input);
    return this.mapToUserTargets(raw);
  }

  /**
   * Map database row to UserTargets interface
   * Handles null values with defaults
   */
  private mapToUserTargets(row: UserTargetsRow): UserTargets {
    return {
      id: row.id,
      user_id: row.user_id || "",
      annual_income_target: row.annual_income_target || 0,
      monthly_income_target: row.monthly_income_target || 0,
      quarterly_income_target: row.quarterly_income_target || 0,
      annual_policies_target: row.annual_policies_target || 0,
      monthly_policies_target: row.monthly_policies_target || 0,
      avg_premium_target: row.avg_premium_target || 0,
      persistency_13_month_target: row.persistency_13_month_target || 0,
      persistency_25_month_target: row.persistency_25_month_target || 0,
      monthly_expense_target: row.monthly_expense_target || 0,
      expense_ratio_target: row.expense_ratio_target || 0,
      achievements: (row.achievements as unknown as unknown[]) || [],
      last_milestone_date: row.last_milestone_date,
      created_at: row.created_at || "",
      updated_at: row.updated_at || "",
    };
  }
}

export const userTargetsService = new UserTargetsService();
