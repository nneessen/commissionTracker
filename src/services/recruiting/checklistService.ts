// src/services/recruiting/checklistService.ts

import { supabase } from "@/services/base/supabase";
import {
  RecruitPhaseProgressRepository,
  type PhaseProgressStatus,
} from "./repositories/RecruitPhaseProgressRepository";
import {
  RecruitChecklistProgressRepository,
  type ChecklistProgressStatus,
} from "./repositories/RecruitChecklistProgressRepository";
import { PipelinePhaseRepository } from "./repositories/PipelinePhaseRepository";
import { PhaseChecklistItemRepository } from "./repositories/PhaseChecklistItemRepository";
import { documentService } from "@/services/documents";
import { pipelineAutomationService } from "./pipelineAutomationService";
import type {
  RecruitPhaseProgress,
  RecruitChecklistProgress,
  UpdateChecklistItemStatusInput,
  OnboardingStatus,
} from "@/types/recruiting.types";

// Fire-and-forget helper for automation triggers (don't block main flow)
const triggerAutomationAsync = (fn: () => Promise<void>) => {
  fn().catch((error) => {
    console.error("[checklistService] Automation trigger failed:", error);
  });
};

// Repository instances
const phaseProgressRepository = new RecruitPhaseProgressRepository();
const checklistProgressRepository = new RecruitChecklistProgressRepository();
const pipelinePhaseRepository = new PipelinePhaseRepository();
const checklistItemRepository = new PhaseChecklistItemRepository();

// Convert phase name to onboarding status key
const phaseNameToStatus = (phaseName: string): OnboardingStatus => {
  const normalized = phaseName.toLowerCase().replace(/[- ]/g, "_");
  const mapping: Record<string, OnboardingStatus> = {
    interview_1: "interview_1",
    zoom_interview: "zoom_interview",
    pre_licensing: "pre_licensing",
    exam: "exam",
    npn_received: "npn_received",
    contracting: "contracting",
    bootcamp: "bootcamp",
  };
  return mapping[normalized] || "interview_1";
};

export const checklistService = {
  // ========================================
  // RECRUIT PHASE PROGRESS
  // ========================================

  async getRecruitPhaseProgress(userId: string) {
    const data = await phaseProgressRepository.findByUserIdWithPhase(userId);

    // Sort by phase_order in JavaScript (Supabase doesn't support ordering by related fields)
    const sorted = (data ?? []).sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase relation type
      const orderA = (a.phase as any)?.phase_order ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase relation type
      const orderB = (b.phase as any)?.phase_order ?? 0;
      return orderA - orderB;
    });

    return sorted as RecruitPhaseProgress[];
  },

  async getCurrentPhase(userId: string) {
    const data =
      await phaseProgressRepository.findCurrentPhaseWithDetails(userId);
    return data as RecruitPhaseProgress | null;
  },

  async initializeRecruitProgress(userId: string, templateId: string) {
    // CRITICAL: Check if user already has pipeline progress to prevent duplicate initialization
    const existingProgress = await phaseProgressRepository.findByUserId(userId);
    if (existingProgress && existingProgress.length > 0) {
      console.warn(
        `[checklistService] User ${userId} already has pipeline progress (${existingProgress.length} phases). Skipping initialization.`,
      );
      // Return existing progress instead of creating duplicates
      const fullProgress =
        await phaseProgressRepository.findByUserIdWithPhase(userId);
      return fullProgress as unknown as RecruitPhaseProgress[];
    }

    // Get all phases for the template
    const phases = await pipelinePhaseRepository.findByTemplateId(templateId);

    if (!phases || phases.length === 0) {
      throw new Error("No phases found for template");
    }

    // Create progress records for all phases
    const progressRecords = phases.map((phase, index) => ({
      userId,
      phaseId: phase.id,
      templateId,
      status: (index === 0
        ? "in_progress"
        : "not_started") as PhaseProgressStatus,
      startedAt: index === 0 ? new Date().toISOString() : null,
    }));

    const data = await phaseProgressRepository.createMany(progressRecords);

    // Initialize checklist progress for first phase and update user status
    if (phases[0]) {
      await this.initializeChecklistProgress(userId, phases[0].id);

      // Update user's onboarding status and template to match first phase
      const firstPhaseStatus = phaseNameToStatus(phases[0].phaseName);
      await supabase
        .from("user_profiles")
        .update({
          pipeline_template_id: templateId,
          onboarding_status: firstPhaseStatus,
          current_onboarding_phase: phases[0].phaseName,
        })
        .eq("id", userId);

      // Trigger phase_enter automation for first phase (fire-and-forget)
      triggerAutomationAsync(() =>
        pipelineAutomationService.triggerPhaseAutomations(
          phases[0].id,
          "phase_enter",
          userId,
        ),
      );
    }

    return data as unknown as RecruitPhaseProgress[];
  },

  async updatePhaseStatus(
    userId: string,
    phaseId: string,
    status: "not_started" | "in_progress" | "completed" | "blocked" | "skipped",
    notes?: string,
    blockedReason?: string,
  ) {
    const data = await phaseProgressRepository.updateStatus(
      userId,
      phaseId,
      status as PhaseProgressStatus,
      { notes, blockedReason },
    );

    return data as unknown as RecruitPhaseProgress;
  },

  async advanceToNextPhase(userId: string, currentPhaseId: string) {
    // Get current phase to find template and order
    const { data: currentProgress, error: currentError } = await supabase
      .from("recruit_phase_progress")
      .select("*, phase:phase_id(*)")
      .eq("user_id", userId)
      .eq("phase_id", currentPhaseId)
      .single();

    if (currentError) throw currentError;

    // Mark current phase as completed
    await this.updatePhaseStatus(userId, currentPhaseId, "completed");

    // Trigger phase_complete automation for current phase (fire-and-forget)
    triggerAutomationAsync(() =>
      pipelineAutomationService.triggerPhaseAutomations(
        currentPhaseId,
        "phase_complete",
        userId,
      ),
    );

    // Get next phase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase relation type
    const currentOrder = (currentProgress.phase as any).phase_order;
    const nextPhase = await pipelinePhaseRepository.findNextPhase(
      currentProgress.template_id,
      currentOrder,
    );

    if (!nextPhase) {
      // No next phase found - recruiting is complete!
      await supabase
        .from("user_profiles")
        .update({
          onboarding_status: "completed",
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", userId);
      return null;
    }

    // Mark next phase as in_progress
    const nextProgress = await this.updatePhaseStatus(
      userId,
      nextPhase.id,
      "in_progress",
    );

    // Initialize checklist progress for next phase
    await this.initializeChecklistProgress(userId, nextPhase.id);

    // Trigger phase_enter automation for next phase (fire-and-forget)
    triggerAutomationAsync(() =>
      pipelineAutomationService.triggerPhaseAutomations(
        nextPhase.id,
        "phase_enter",
        userId,
      ),
    );

    // Update user_profiles with new phase and status
    const nextPhaseStatus = phaseNameToStatus(nextPhase.phaseName);
    await supabase
      .from("user_profiles")
      .update({
        onboarding_status: nextPhaseStatus,
        current_onboarding_phase: nextPhase.phaseName,
      })
      .eq("id", userId);

    return nextProgress;
  },

  async blockPhase(userId: string, phaseId: string, reason: string) {
    return this.updatePhaseStatus(
      userId,
      phaseId,
      "blocked",
      undefined,
      reason,
    );
  },

  // ========================================
  // CHECKLIST ITEM PROGRESS
  // ========================================

  async initializeChecklistProgress(userId: string, phaseId: string) {
    // Get all checklist items for the phase
    const items = await checklistItemRepository.findByPhaseId(phaseId);

    if (!items || items.length === 0) return [];

    // Create progress records for all items
    const progressRecords = items.map((item) => ({
      userId,
      checklistItemId: item.id,
      status: "not_started" as ChecklistProgressStatus,
    }));

    const data = await checklistProgressRepository.upsertMany(progressRecords);
    return data as unknown as RecruitChecklistProgress[];
  },

  async getChecklistProgress(userId: string, phaseId: string) {
    const data = await checklistProgressRepository.findByUserAndPhase(
      userId,
      phaseId,
    );
    return data as RecruitChecklistProgress[];
  },

  async updateChecklistItemStatus(
    userId: string,
    itemId: string,
    statusData: UpdateChecklistItemStatusInput,
  ) {
    const data = await checklistProgressRepository.updateStatus(
      userId,
      itemId,
      statusData.status as ChecklistProgressStatus,
      {
        completedBy: statusData.completed_by,
        verifiedBy: statusData.verified_by,
        documentId: statusData.document_id,
        notes: statusData.notes,
        rejectionReason: statusData.rejection_reason,
        metadata: statusData.metadata,
      },
    );

    // Trigger item automations based on status change (fire-and-forget)
    const status = statusData.status;
    if (status === "completed" || status === "approved") {
      triggerAutomationAsync(() =>
        pipelineAutomationService.triggerItemAutomations(
          itemId,
          "item_complete",
          userId,
        ),
      );
    } else if (status === "in_progress") {
      // "in_progress" with document upload means item is awaiting approval/verification
      // Only trigger if a document was attached (indicating submission for review)
      if (statusData.document_id) {
        triggerAutomationAsync(() =>
          pipelineAutomationService.triggerItemAutomations(
            itemId,
            "item_approval_needed",
            userId,
          ),
        );
      }
    }

    // Check if all required items in this phase are approved
    await this.checkPhaseAutoAdvancement(userId, itemId);

    return data as unknown as RecruitChecklistProgress;
  },

  async checkPhaseAutoAdvancement(userId: string, checklistItemId: string) {
    // Get the phase for this checklist item
    const { data: checklistItem, error: itemError } = await supabase
      .from("phase_checklist_items")
      .select("*, phase:phase_id(*)")
      .eq("id", checklistItemId)
      .single();

    if (itemError) throw itemError;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase relation type
    const phase = checklistItem.phase as any;

    // Only auto-advance if phase allows it
    if (!phase.auto_advance) return;

    // Get all checklist items for this phase
    const phaseChecklistItems = await checklistItemRepository.findByPhaseId(
      phase.id,
    );

    if (!phaseChecklistItems || phaseChecklistItems.length === 0) return;

    // Get all checklist progress for these items
    const allProgress = await checklistProgressRepository.findByUserAndPhase(
      userId,
      phase.id,
    );

    // Create a map of item_id to progress for quick lookup
    const progressMap = new Map(
      allProgress?.map((p) => [p.checklist_item_id, p]) || [],
    );

    // Determine which items to check:
    // - If there are required items, only those must be completed
    // - If NO required items exist, ALL items must be completed
    const requiredItems = phaseChecklistItems.filter((item) => item.isRequired);
    const itemsToCheck =
      requiredItems.length > 0 ? requiredItems : phaseChecklistItems;

    // Check if all relevant items are approved/completed
    const allItemsCompleted = itemsToCheck.every((item) => {
      const progress = progressMap.get(item.id);
      if (!progress) return false;

      return progress.status === "approved" || progress.status === "completed";
    });

    if (allItemsCompleted) {
      // Auto-advance to next phase
      await this.advanceToNextPhase(userId, phase.id);
    }
  },

  // ========================================
  // DOCUMENT APPROVAL (delegates to documentService)
  // ========================================

  async approveDocument(documentId: string, approverId: string) {
    // Update document status via documentService
    const document = await documentService.approve(documentId, approverId);

    // Find linked checklist item and mark as approved
    const checklistProgress =
      await checklistProgressRepository.findByDocumentId(documentId);

    if (checklistProgress) {
      // Update checklist item status to approved
      await this.updateChecklistItemStatus(
        checklistProgress.userId,
        checklistProgress.checklistItemId,
        {
          status: "approved",
          verified_by: approverId,
        },
      );
    }

    return document;
  },

  async rejectDocument(documentId: string, approverId: string, reason: string) {
    // Update document status via documentService
    const document = await documentService.reject(
      documentId,
      approverId,
      reason,
    );

    // Find linked checklist item and mark as needs_resubmission
    const checklistProgress =
      await checklistProgressRepository.findByDocumentId(documentId);

    if (checklistProgress) {
      // Update checklist item status to needs_resubmission
      await this.updateChecklistItemStatus(
        checklistProgress.userId,
        checklistProgress.checklistItemId,
        {
          status: "needs_resubmission",
          verified_by: approverId,
          rejection_reason: reason,
        },
      );
    }

    return document;
  },

  // ========================================
  // PIPELINE UNENROLLMENT
  // ========================================

  async unenrollFromPipeline(userId: string) {
    // Use RPC with SECURITY DEFINER to bypass RLS for deletion operations
    const { data, error } = await supabase.rpc("unenroll_from_pipeline", {
      target_user_id: userId,
    });

    if (error) {
      console.error("[checklistService] Unenroll RPC failed:", error);
      throw error;
    }

    if (data && !data.success) {
      console.error("[checklistService] Unenroll failed:", data.error);
      throw new Error(data.error || "Failed to unenroll from pipeline");
    }

    console.log(
      `[checklistService] Successfully unenrolled user ${userId} from pipeline:`,
      data,
    );

    return { success: true };
  },
};
