// /home/nneessen/projects/commissionTracker/src/services/recruiting/recruitingService.enhanced.ts
// Enhanced recruiting service with delete dependency checking and downline reassignment

import { supabase } from '../base/supabase';

// ============================================
// TYPES
// ============================================
export interface DeleteDependencies {
  email_count: number;
  document_count: number;
  activity_count: number;
  checklist_count: number;
  downline_count: number;
  policy_count: number;
  commission_count: number;
  can_delete: boolean;
  deletion_warning: string | null;
}

// ============================================
// ENHANCED SERVICE
// ============================================
export const enhancedRecruitingService = {
  /**
   * Get all delete dependencies for a user in a single efficient query
   * Uses the user_delete_dependencies view
   */
  async getDeleteDependencies(userId: string): Promise<DeleteDependencies | null> {
    const { data, error } = await supabase
      .from('user_delete_dependencies')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching delete dependencies:', error);
      return null;
    }

    return data as DeleteDependencies;
  },

  /**
   * Reassign downlines from one upline to another
   * Use this before deleting a user who has downlines
   */
  async reassignDownlines(
    fromUplineId: string,
    toUplineId: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ upline_id: toUplineId })
      .eq('upline_id', fromUplineId)
      .select();

    if (error) {
      console.error('Reassign downlines error:', error);
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }

    return {
      success: true,
      count: data?.length || 0
    };
  },
};
