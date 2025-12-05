// /home/nneessen/projects/commissionTracker/src/services/recruiting/recruitingService.enhanced.ts
// Enhanced recruiting service with proper deletion, validation, and transaction support

import { supabase } from '../base/supabase';
import type { UserProfile } from '@/types/hierarchy.types';

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

export interface DeleteResult {
  success: boolean;
  message?: string;
  error?: string;
  user_id?: string;
  archived_at?: string;
  downline_count?: number;
  suggestion?: string;
}

// ============================================
// ENHANCED SERVICE
// ============================================
export const enhancedRecruitingService = {
  /**
   * Get all delete dependencies for a user in a single efficient query
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
   * Perform a soft delete (archive) of a user
   * This preserves all data but marks user as deleted
   */
  async softDeleteRecruit(
    userId: string,
    deletedBy: string,
    reason?: string
  ): Promise<DeleteResult> {
    const { data, error } = await supabase.rpc('soft_delete_user', {
      p_user_id: userId,
      p_deleted_by: deletedBy,
      p_reason: reason || null
    });

    if (error) {
      console.error('Soft delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete recruit'
      };
    }

    return data as DeleteResult;
  },

  /**
   * Perform a hard delete (permanent removal) of a user
   * This permanently deletes all user data - use with extreme caution!
   */
  async hardDeleteRecruit(
    userId: string,
    deletedBy: string,
    confirmText: string
  ): Promise<DeleteResult> {
    const { data, error } = await supabase.rpc('hard_delete_user', {
      p_user_id: userId,
      p_deleted_by: deletedBy,
      p_confirm_text: confirmText
    });

    if (error) {
      console.error('Hard delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to permanently delete recruit'
      };
    }

    return data as DeleteResult;
  },

  /**
   * Restore a soft-deleted user
   */
  async restoreRecruit(
    userId: string,
    restoredBy: string
  ): Promise<DeleteResult> {
    const { data, error } = await supabase.rpc('restore_deleted_user', {
      p_user_id: userId,
      p_restored_by: restoredBy
    });

    if (error) {
      console.error('Restore error:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore recruit'
      };
    }

    return data as DeleteResult;
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

  /**
   * Bulk soft delete multiple recruits
   * Each delete is validated individually
   */
  async bulkSoftDelete(
    userIds: string[],
    deletedBy: string,
    reason?: string
  ): Promise<{
    succeeded: string[];
    failed: Array<{ id: string; error: string }>
  }> {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Process each deletion
    for (const userId of userIds) {
      const result = await this.softDeleteRecruit(userId, deletedBy, reason);

      if (result.success) {
        succeeded.push(userId);
      } else {
        failed.push({
          id: userId,
          error: result.error || 'Unknown error'
        });
      }
    }

    return { succeeded, failed };
  },

  /**
   * Check if user can be deleted and get warning message
   */
  async canDeleteRecruit(userId: string): Promise<{
    canDelete: boolean;
    warning?: string;
    dependencies?: DeleteDependencies;
  }> {
    const deps = await this.getDeleteDependencies(userId);

    if (!deps) {
      return {
        canDelete: false,
        warning: 'Unable to check dependencies'
      };
    }

    return {
      canDelete: deps.can_delete,
      warning: deps.deletion_warning || undefined,
      dependencies: deps
    };
  },

  /**
   * Get all soft-deleted (archived) users
   */
  async getArchivedRecruits(
    page = 1,
    limit = 50
  ): Promise<{
    data: UserProfile[];
    count: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('is_deleted', true)
      .order('archived_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data as UserProfile[],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  /**
   * Search archived users
   */
  async searchArchivedRecruits(
    searchTerm: string,
    limit = 10
  ): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_deleted', true)
      .or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .limit(limit);

    if (error) throw error;
    return data as UserProfile[];
  }
};