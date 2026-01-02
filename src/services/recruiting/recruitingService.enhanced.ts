// /home/nneessen/projects/commissionTracker/src/services/recruiting/recruitingService.enhanced.ts
// Enhanced recruiting service with delete dependency checking and downline reassignment
//
// TODO: THIS GOES AGAINST MY CODING GUIDELINES
// the name of the file
// the duplicate recruiting service files
// why would this be in its own separate file instead of in
// my exisiting recruitingService file?
//

import { supabase } from "../base/supabase";

// ============================================
// ENHANCED SERVICE
// ============================================
// Note: The DeleteDependencies interface and getDeleteDependencies method
// were removed because the user_delete_dependencies view was dropped
// in migration 20251213_004_remove_soft_delete_artifacts.sql.
// The system now uses admin_deleteuser() with CASCADE deletes only.
export const enhancedRecruitingService = {
  /**
   * Reassign downlines from one upline to another
   * Use this before deleting a user who has downlines
   */
  async reassignDownlines(
    fromUplineId: string,
    toUplineId: string,
  ): Promise<{ success: boolean; count: number; error?: string }> {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ upline_id: toUplineId })
      .eq("upline_id", fromUplineId)
      .select();

    if (error) {
      console.error("Reassign downlines error:", error);
      return {
        success: false,
        count: 0,
        error: error.message,
      };
    }

    return {
      success: true,
      count: data?.length || 0,
    };
  },
};
