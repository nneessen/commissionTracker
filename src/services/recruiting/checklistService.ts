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
import { createAuthUserWithProfile } from "./authUserService";
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

// Sync cache to prevent redundant sync checks (TTL: 30 seconds)
const SYNC_CACHE_TTL_MS = 30000;
const syncCache = new Map<string, number>();

const isSyncCacheValid = (cacheKey: string): boolean => {
  const lastSync = syncCache.get(cacheKey);
  if (!lastSync) return false;
  return Date.now() - lastSync < SYNC_CACHE_TTL_MS;
};

const markSyncComplete = (cacheKey: string): void => {
  syncCache.set(cacheKey, Date.now());
};

export const checklistService = {
  // ========================================
  // RECRUIT PHASE PROGRESS
  // ========================================

  async getRecruitPhaseProgress(userId: string) {
    // First, sync progress records with template to handle new phases
    await this.syncPhaseProgressWithTemplate(userId);

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

  /**
   * Sync phase progress records with template.
   * Creates missing progress records for phases added after enrollment.
   * Uses caching to prevent redundant sync checks.
   */
  async syncPhaseProgressWithTemplate(userId: string) {
    const cacheKey = `phase:${userId}`;

    // Skip if recently synced
    if (isSyncCacheValid(cacheKey)) {
      return;
    }

    try {
      // Get user's existing progress to find their template
      const existingProgress =
        await phaseProgressRepository.findByUserId(userId);
      if (!existingProgress || existingProgress.length === 0) {
        // User not enrolled in any pipeline
        markSyncComplete(cacheKey);
        return;
      }

      const templateId = existingProgress[0].templateId;
      const existingPhaseIds = new Set(existingProgress.map((p) => p.phaseId));

      // Get all phases from template
      const templatePhases =
        await pipelinePhaseRepository.findByTemplateId(templateId);
      if (!templatePhases || templatePhases.length === 0) {
        markSyncComplete(cacheKey);
        return;
      }

      // Find phases that exist in template but not in progress
      const missingPhases = templatePhases.filter(
        (phase) => !existingPhaseIds.has(phase.id),
      );

      if (missingPhases.length === 0) {
        markSyncComplete(cacheKey);
        return;
      }

      console.log(
        `[checklistService] Syncing ${missingPhases.length} new phases for user ${userId}`,
      );

      // Create progress records for missing phases
      const newProgressRecords = missingPhases.map((phase) => ({
        userId,
        phaseId: phase.id,
        templateId,
        status: "not_started" as PhaseProgressStatus,
        startedAt: null,
      }));

      await phaseProgressRepository.upsertMany(newProgressRecords);
      markSyncComplete(cacheKey);
    } catch (error) {
      console.error(
        `[checklistService] Phase sync failed for user ${userId}:`,
        error,
      );
      // Don't throw - allow main query to proceed with potentially stale data
    }
  },

  async getCurrentPhase(userId: string) {
    // Sync phase progress first to handle new phases
    await this.syncPhaseProgressWithTemplate(userId);

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
    // Ensure phase progress record exists before updating
    // This handles cases where a phase was added after enrollment
    const existingProgress = await phaseProgressRepository.findByUserAndPhase(
      userId,
      phaseId,
    );

    if (!existingProgress) {
      console.log(
        `[checklistService] Creating missing phase progress record for phase ${phaseId} user ${userId}`,
      );
      // Get template ID from user's other phases
      const userProgress = await phaseProgressRepository.findByUserId(userId);
      if (!userProgress || userProgress.length === 0) {
        throw new Error("User has no pipeline enrollment to update phase for");
      }
      const templateId = userProgress[0].templateId;

      // Create the phase progress record first
      await phaseProgressRepository.createMany([
        {
          userId,
          phaseId,
          templateId,
          status: "not_started" as PhaseProgressStatus,
          startedAt: null,
        },
      ]);
    }

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

    // Check if next phase requires login access (phase 2+)
    // Phase 1 is for prospects without login, phase 2+ requires auth user
    if (nextPhase.phaseOrder >= 2) {
      try {
        const authResult = await this.ensureRecruitHasAuthUser(userId);
        if (authResult.created && authResult.emailSent) {
          console.log(
            `[checklistService] Login instructions sent to recruit ${userId}`,
          );
        }
      } catch (error) {
        // Log but don't block phase advancement
        console.error(
          "[checklistService] Failed to ensure auth user on phase advance:",
          error,
        );
        // Re-throw to prevent advancing without login access
        throw new Error(
          "Could not send login instructions. Please try again or use the Resend Invite button.",
        );
      }
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

  async revertPhase(userId: string, phaseId: string) {
    // Get current phase progress to validate it's completed
    const currentProgress = await phaseProgressRepository.findByUserAndPhase(
      userId,
      phaseId,
    );

    if (!currentProgress) {
      throw new Error("Phase progress not found");
    }

    if (currentProgress.status !== "completed") {
      throw new Error("Can only revert completed phases");
    }

    // Get phase details for updating user profile
    const phase = await pipelinePhaseRepository.findById(phaseId);
    if (!phase) {
      throw new Error("Phase not found");
    }

    // Get all phases for this template to find subsequent ones
    const allPhases = await pipelinePhaseRepository.findByTemplateId(
      phase.templateId,
    );

    // Find phases that come AFTER this one (higher phase_order)
    const subsequentPhases = allPhases.filter(
      (p) => p.phaseOrder > phase.phaseOrder,
    );

    // Reset all subsequent phases to "not_started"
    for (const subsequentPhase of subsequentPhases) {
      await this.updatePhaseStatus(
        userId,
        subsequentPhase.id,
        "not_started",
        "Reset due to phase revert",
      );

      // Also reset the started_at and completed_at timestamps
      await supabase
        .from("recruit_phase_progress")
        .update({
          started_at: null,
          completed_at: null,
        })
        .eq("user_id", userId)
        .eq("phase_id", subsequentPhase.id);
    }

    // Set the target phase back to in_progress
    const updatedProgress = await this.updatePhaseStatus(
      userId,
      phaseId,
      "in_progress",
      "Reverted by recruiter",
    );

    // Reset completed_at for the reverted phase (keep started_at)
    await supabase
      .from("recruit_phase_progress")
      .update({
        completed_at: null,
      })
      .eq("user_id", userId)
      .eq("phase_id", phaseId);

    // Update user_profiles with the reverted phase's status
    const revertedPhaseStatus = phaseNameToStatus(phase.phaseName);
    await supabase
      .from("user_profiles")
      .update({
        onboarding_status: revertedPhaseStatus,
        current_onboarding_phase: phase.phaseName,
      })
      .eq("id", userId);

    // Trigger phase_enter automation for reverted phase (fire-and-forget)
    triggerAutomationAsync(() =>
      pipelineAutomationService.triggerPhaseAutomations(
        phaseId,
        "phase_enter",
        userId,
      ),
    );

    return updatedProgress;
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
    // First, sync checklist progress with phase items to handle new items
    await this.syncChecklistProgressWithPhase(userId, phaseId);

    const data = await checklistProgressRepository.findByUserAndPhase(
      userId,
      phaseId,
    );
    return data as RecruitChecklistProgress[];
  },

  /**
   * Sync checklist progress records with phase items.
   * Creates missing progress records for items added after enrollment.
   * Uses caching and upsert for safe idempotent operation.
   */
  async syncChecklistProgressWithPhase(userId: string, phaseId: string) {
    const cacheKey = `checklist:${userId}:${phaseId}`;

    // Skip if recently synced
    if (isSyncCacheValid(cacheKey)) {
      return;
    }

    try {
      // Get all checklist items for the phase
      const items = await checklistItemRepository.findByPhaseId(phaseId);
      if (!items || items.length === 0) {
        markSyncComplete(cacheKey);
        return;
      }

      // Get existing progress records
      const existingProgress =
        await checklistProgressRepository.findByUserAndPhase(userId, phaseId);
      const existingItemIds = new Set(
        existingProgress?.map((p) => p.checklist_item_id) || [],
      );

      // Find items that exist in phase but not in progress
      const missingItems = items.filter(
        (item) => !existingItemIds.has(item.id),
      );

      if (missingItems.length === 0) {
        markSyncComplete(cacheKey);
        return;
      }

      console.log(
        `[checklistService] Syncing ${missingItems.length} new checklist items for user ${userId} in phase ${phaseId}`,
      );

      // Create progress records for missing items using upsert
      const progressRecords = missingItems.map((item) => ({
        userId,
        checklistItemId: item.id,
        status: "not_started" as ChecklistProgressStatus,
      }));

      await checklistProgressRepository.upsertMany(progressRecords);
      markSyncComplete(cacheKey);
    } catch (error) {
      console.error(
        `[checklistService] Checklist sync failed for user ${userId} phase ${phaseId}:`,
        error,
      );
      // Don't throw - allow main query to proceed with potentially stale data
    }
  },

  async updateChecklistItemStatus(
    userId: string,
    itemId: string,
    statusData: UpdateChecklistItemStatusInput,
  ) {
    // Ensure progress record exists using upsert (race-condition safe)
    // This handles cases where an item was added after enrollment
    await checklistProgressRepository.upsertMany([
      {
        userId,
        checklistItemId: itemId,
        status: "not_started" as ChecklistProgressStatus,
      },
    ]);

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

  // ========================================
  // AUTH USER MANAGEMENT
  // ========================================

  /**
   * Ensures recruit has an auth user. Creates one if missing.
   * Called when advancing to a phase that requires login access (phase 2+).
   * Returns whether an email was sent (only on new auth user creation).
   */
  async ensureRecruitHasAuthUser(
    userId: string,
  ): Promise<{ emailSent: boolean; created: boolean }> {
    // Get recruit profile to check if they need auth user creation
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, email, first_name, last_name, roles")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error(
        "[checklistService] Failed to get profile for auth user check:",
        profileError,
      );
      throw new Error("Recruit profile not found");
    }

    // Check if auth user already exists by trying to query auth.users
    // Note: This requires checking if the profile was created via auth
    // If profile.id matches an auth.users.id, then auth user exists
    // We can check this by trying to call the edge function and handling the "already exists" error
    try {
      console.log(
        `[checklistService] Creating auth user for recruit ${userId} (${profile.email})`,
      );

      const authResult = await createAuthUserWithProfile({
        email: profile.email,
        fullName: `${profile.first_name} ${profile.last_name}`,
        roles: (profile.roles as string[]) || ["recruit"],
        isAdmin: false,
        skipPipeline: true, // Pipeline already exists, just need auth
      });

      console.log(
        `[checklistService] Auth user created for ${profile.email}, email sent: ${authResult.emailSent}`,
      );

      return { emailSent: authResult.emailSent, created: true };
    } catch (error) {
      // If error indicates user already exists, that's fine
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("already registered")
      ) {
        console.log(
          `[checklistService] Auth user already exists for ${profile.email}`,
        );
        return { emailSent: false, created: false };
      }

      // Re-throw other errors
      console.error("[checklistService] Failed to create auth user:", error);
      throw error;
    }
  },
};
