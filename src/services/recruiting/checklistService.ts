// src/services/recruiting/checklistService.ts

import { supabase } from '@/services/base/supabase';
import type {
  RecruitPhaseProgress,
  RecruitChecklistProgress,
  UpdateChecklistItemStatusInput,
} from '@/types/recruiting';

export const checklistService = {
  // ========================================
  // RECRUIT PHASE PROGRESS
  // ========================================

  async getRecruitPhaseProgress(userId: string) {
    const { data, error } = await supabase
      .from('recruit_phase_progress')
      .select(
        `
        *,
        phase:phase_id(*)
      `
      )
      .eq('user_id', userId)
      .order('phase.phase_order', { ascending: true });

    if (error) throw error;
    return data as RecruitPhaseProgress[];
  },

  async getCurrentPhase(userId: string) {
    const { data, error } = await supabase
      .from('recruit_phase_progress')
      .select(
        `
        *,
        phase:phase_id(
          *,
          checklist_items:phase_checklist_items(*)
        )
      `
      )
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .single();

    if (error) {
      // If no in_progress phase found, return null
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as RecruitPhaseProgress;
  },

  async initializeRecruitProgress(userId: string, templateId: string) {
    // Get all phases for the template
    const { data: phases, error: phasesError } = await supabase
      .from('pipeline_phases')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_active', true)
      .order('phase_order', { ascending: true });

    if (phasesError) throw phasesError;
    if (!phases || phases.length === 0) throw new Error('No phases found for template');

    // Create progress records for all phases
    const progressRecords = phases.map((phase, index) => ({
      user_id: userId,
      phase_id: phase.id,
      template_id: templateId,
      status: index === 0 ? ('in_progress' as const) : ('not_started' as const),
      started_at: index === 0 ? new Date().toISOString() : null,
    }));

    const { data, error } = await supabase
      .from('recruit_phase_progress')
      .insert(progressRecords)
      .select();

    if (error) throw error;

    // Initialize checklist progress for first phase
    if (phases[0]) {
      await this.initializeChecklistProgress(userId, phases[0].id);
    }

    return data as RecruitPhaseProgress[];
  },

  async updatePhaseStatus(
    userId: string,
    phaseId: string,
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped',
    notes?: string,
    blockedReason?: string
  ) {
    const updates: any = {
      status,
      notes: notes || null,
      blocked_reason: blockedReason || null,
    };

    if (status === 'in_progress' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('recruit_phase_progress')
      .update(updates)
      .eq('user_id', userId)
      .eq('phase_id', phaseId)
      .select()
      .single();

    if (error) throw error;
    return data as RecruitPhaseProgress;
  },

  async advanceToNextPhase(userId: string, currentPhaseId: string) {
    // Get current phase to find template and order
    const { data: currentProgress, error: currentError } = await supabase
      .from('recruit_phase_progress')
      .select('*, phase:phase_id(*)')
      .eq('user_id', userId)
      .eq('phase_id', currentPhaseId)
      .single();

    if (currentError) throw currentError;

    // Mark current phase as completed
    await this.updatePhaseStatus(userId, currentPhaseId, 'completed');

    // Get next phase
    const { data: nextPhase, error: nextPhaseError } = await supabase
      .from('pipeline_phases')
      .select('*')
      .eq('template_id', currentProgress.template_id)
      .eq('is_active', true)
      .gt('phase_order', (currentProgress.phase as any).phase_order)
      .order('phase_order', { ascending: true })
      .limit(1)
      .single();

    if (nextPhaseError) {
      // No next phase found - recruiting is complete!
      return null;
    }

    // Mark next phase as in_progress
    const nextProgress = await this.updatePhaseStatus(userId, nextPhase.id, 'in_progress');

    // Initialize checklist progress for next phase
    await this.initializeChecklistProgress(userId, nextPhase.id);

    // Update user_profiles.current_onboarding_phase
    await supabase
      .from('user_profiles')
      .update({ current_onboarding_phase: nextPhase.phase_name })
      .eq('id', userId);

    return nextProgress;
  },

  async blockPhase(userId: string, phaseId: string, reason: string) {
    return this.updatePhaseStatus(userId, phaseId, 'blocked', undefined, reason);
  },

  // ========================================
  // CHECKLIST ITEM PROGRESS
  // ========================================

  async initializeChecklistProgress(userId: string, phaseId: string) {
    // Get all checklist items for the phase
    const { data: items, error: itemsError } = await supabase
      .from('phase_checklist_items')
      .select('*')
      .eq('phase_id', phaseId)
      .order('item_order', { ascending: true });

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return [];

    // Create progress records for all items
    const progressRecords = items.map((item) => ({
      user_id: userId,
      checklist_item_id: item.id,
      status: 'not_started' as const,
    }));

    const { data, error } = await supabase
      .from('recruit_checklist_progress')
      .insert(progressRecords)
      .select();

    if (error) throw error;
    return data as RecruitChecklistProgress[];
  },

  async getChecklistProgress(userId: string, phaseId: string) {
    const { data, error } = await supabase
      .from('recruit_checklist_progress')
      .select(
        `
        *,
        checklist_item:checklist_item_id(*)
      `
      )
      .eq('user_id', userId)
      .eq('checklist_item.phase_id', phaseId);

    if (error) throw error;
    return data as RecruitChecklistProgress[];
  },

  async updateChecklistItemStatus(
    userId: string,
    itemId: string,
    statusData: UpdateChecklistItemStatusInput
  ) {
    const updates: any = {
      status: statusData.status,
      notes: statusData.notes || null,
      metadata: statusData.metadata || null,
    };

    if (statusData.status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = statusData.completed_by;
    }

    if (statusData.status === 'approved') {
      updates.verified_at = new Date().toISOString();
      updates.verified_by = statusData.verified_by;
    }

    if (statusData.status === 'rejected') {
      updates.rejection_reason = statusData.rejection_reason;
      updates.verified_at = new Date().toISOString();
      updates.verified_by = statusData.verified_by;
    }

    if (statusData.document_id) {
      updates.document_id = statusData.document_id;
    }

    const { data, error } = await supabase
      .from('recruit_checklist_progress')
      .update(updates)
      .eq('user_id', userId)
      .eq('checklist_item_id', itemId)
      .select()
      .single();

    if (error) throw error;

    // Check if all required items in this phase are approved
    await this.checkPhaseAutoAdvancement(userId, itemId);

    return data as RecruitChecklistProgress;
  },

  async checkPhaseAutoAdvancement(userId: string, checklistItemId: string) {
    // Get the phase for this checklist item
    const { data: checklistItem, error: itemError } = await supabase
      .from('phase_checklist_items')
      .select('*, phase:phase_id(*)')
      .eq('id', checklistItemId)
      .single();

    if (itemError) throw itemError;

    const phase = checklistItem.phase as any;

    // Only auto-advance if phase allows it
    if (!phase.auto_advance) return;

    // Get all checklist progress for this phase
    const { data: allProgress, error: progressError } = await supabase
      .from('recruit_checklist_progress')
      .select('*, checklist_item:checklist_item_id(*)')
      .eq('user_id', userId)
      .eq('checklist_item.phase_id', phase.id);

    if (progressError) throw progressError;

    // Check if all required items are approved
    const allRequiredApproved = allProgress.every((progress) => {
      const item = progress.checklist_item as any;
      if (!item.is_required) return true; // Optional items don't block advancement
      return progress.status === 'approved' || progress.status === 'completed';
    });

    if (allRequiredApproved) {
      // Auto-advance to next phase
      await this.advanceToNextPhase(userId, phase.id);
    }
  },

  // ========================================
  // DOCUMENT APPROVAL
  // ========================================

  async approveDocument(documentId: string, approverId: string) {
    // Update document status
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .update({ status: 'approved' })
      .eq('id', documentId)
      .select()
      .single();

    if (docError) throw docError;

    // Find linked checklist item and mark as approved
    const { data: checklistProgress, error: progressError } = await supabase
      .from('recruit_checklist_progress')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (progressError) {
      // If no linked checklist item, just return the document
      if (progressError.code === 'PGRST116') return document;
      throw progressError;
    }

    // Update checklist item status to approved
    await this.updateChecklistItemStatus(document.user_id, checklistProgress.checklist_item_id, {
      status: 'approved',
      verified_by: approverId,
    });

    return document;
  },

  async rejectDocument(documentId: string, approverId: string, reason: string) {
    // Update document status
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .update({ status: 'rejected', notes: reason })
      .eq('id', documentId)
      .select()
      .single();

    if (docError) throw docError;

    // Find linked checklist item and mark as needs_resubmission
    const { data: checklistProgress, error: progressError } = await supabase
      .from('recruit_checklist_progress')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (progressError) {
      // If no linked checklist item, just return the document
      if (progressError.code === 'PGRST116') return document;
      throw progressError;
    }

    // Update checklist item status to needs_resubmission
    await this.updateChecklistItemStatus(document.user_id, checklistProgress.checklist_item_id, {
      status: 'needs_resubmission',
      verified_by: approverId,
      rejection_reason: reason,
    });

    return document;
  },
};
