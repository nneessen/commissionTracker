// src/services/recruiting/recruitingService.ts
import { supabase } from "../base/supabase";
import {
  workflowEventEmitter,
  WORKFLOW_EVENTS,
} from "../events/workflowEventEmitter";
import { createAuthUserWithProfile } from "./authUserService";
import { RecruitRepository } from "./repositories/RecruitRepository";
import { documentService, documentStorageService } from "@/services/documents";
import { activityLogService } from "@/services/activity";
import type { UserProfile } from "@/types/hierarchy.types";
import type {
  OnboardingPhase,
  UserDocument,
  UserActivityLog,
  RecruitFilters,
  UpdateRecruitInput,
  UpdatePhaseInput,
} from "@/types/recruiting.types";
import type { CreateRecruitInput } from "@/types/recruiting.types";

// Repository instance
const recruitRepository = new RecruitRepository();

export const recruitingService = {
  // ========================================
  // RECRUIT CRUD (using RecruitRepository)
  // ========================================

  async getRecruits(filters?: RecruitFilters, page = 1, limit = 50) {
    return recruitRepository.findRecruits(filters, page, limit);
  },

  async getRecruitById(id: string) {
    const recruit = await recruitRepository.findByIdWithRelations(id);
    if (!recruit) {
      throw new Error("Recruit not found");
    }
    return recruit;
  },

  async createRecruit(recruit: CreateRecruitInput) {
    // Extract skip_pipeline and other non-database fields
    const { skip_pipeline, ...dbFields } = recruit;

    // Determine role based on agent status and skip_pipeline flag
    let roles: string[] = ["recruit"]; // Default
    let pipelineTemplateId: string | null = null;

    if (skip_pipeline || recruit.agent_status === "not_applicable") {
      // Admin or non-agent roles - no pipeline
      roles = recruit.roles || ["view_only"];
      pipelineTemplateId = null;
    } else if (recruit.agent_status === "licensed") {
      // Licensed agent - gets agent role and fast-track pipeline
      roles = ["agent"];

      // Get the fast-track template
      const { data: template } = await supabase
        .from("pipeline_templates")
        .select("id")
        .eq("name", "Licensed Agent Fast-Track")
        .eq("is_active", true)
        .single();

      pipelineTemplateId = template?.id || null;
    } else {
      // Unlicensed recruit - gets standard pipeline
      roles = ["recruit"];

      // Get the standard template
      const { data: template } = await supabase
        .from("pipeline_templates")
        .select("id")
        .eq("name", "Standard Recruiting Pipeline")
        .eq("is_active", true)
        .single();

      pipelineTemplateId = template?.id || null;
    }

    // CRITICAL FIX: Create auth user FIRST, which triggers profile creation
    const fullName = `${recruit.first_name} ${recruit.last_name}`;
    let authUserId: string | null = null;
    let newRecruit: UserProfile;

    let emailSent = false;
    try {
      // Create auth user - this will trigger automatic user_profile creation
      const authResult = await createAuthUserWithProfile({
        email: recruit.email,
        fullName,
        roles,
        isAdmin: recruit.is_admin || false,
        skipPipeline: skip_pipeline || false,
      });

      authUserId = authResult.user.id;
      emailSent = authResult.emailSent;

      // Update the auto-created profile with recruit-specific data
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...dbFields,
          roles,
          agent_status: recruit.agent_status || "unlicensed",
          pipeline_template_id: pipelineTemplateId,
          licensing_info: recruit.licensing_info || {},
          onboarding_status: skip_pipeline ? null : "interview_1",
          current_onboarding_phase: skip_pipeline ? null : "initial_contact",
          onboarding_started_at: skip_pipeline
            ? null
            : new Date().toISOString(),
          // Note: id = authUserId (same UUID, no separate user_id column)
          // Required hierarchy fields (set defaults)
          hierarchy_path: "", // Will be updated by trigger
          hierarchy_depth: 0, // Will be updated by trigger
          approval_status: "pending",
          is_admin: recruit.is_admin || false,
        })
        .eq("id", authUserId)
        .select()
        .single();

      if (error) throw error;
      newRecruit = data as UserProfile;
    } catch (authError) {
      // Fallback: Create profile without auth user (for leads/prospects)
      console.warn(
        "Auth user creation failed, creating profile-only recruit:",
        authError,
      );

      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          ...dbFields,
          roles,
          agent_status: recruit.agent_status || "unlicensed",
          pipeline_template_id: pipelineTemplateId,
          licensing_info: recruit.licensing_info || {},
          onboarding_status: skip_pipeline ? null : "interview_1",
          current_onboarding_phase: skip_pipeline ? null : "initial_contact",
          onboarding_started_at: skip_pipeline
            ? null
            : new Date().toISOString(),
          // Note: Without auth user, profile id is auto-generated
          // Required hierarchy fields (set defaults)
          hierarchy_path: "",
          hierarchy_depth: 0,
          approval_status: "pending",
          is_admin: recruit.is_admin || false,
        })
        .select()
        .single();

      if (error) throw error;
      newRecruit = data as UserProfile;
    }

    // Emit recruit created event
    await workflowEventEmitter.emit(WORKFLOW_EVENTS.RECRUIT_CREATED, {
      recruitId: newRecruit.id,
      userId: newRecruit.id,
      userEmail: newRecruit.email,
      recruitName: `${newRecruit.first_name} ${newRecruit.last_name}`,
      recruiterId: newRecruit.recruiter_id || undefined,
      uplineId: newRecruit.upline_id || undefined,
      agentStatus: newRecruit.agent_status,
      onboardingStatus: newRecruit.onboarding_status,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

    // Return recruit with emailSent status for UI feedback
    return { ...newRecruit, _emailSent: emailSent };
  },

  async updateRecruit(id: string, updates: UpdateRecruitInput) {
    // Get current recruit data to check for status changes
    const { data: currentRecruit } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .single();

    // Update the recruit
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const updatedRecruit = data as UserProfile;

    // Check for status changes and emit events
    if (currentRecruit && updates.onboarding_status) {
      const oldStatus = currentRecruit.onboarding_status;
      const newStatus = updates.onboarding_status;

      // Emit phase changed event for any status change
      if (oldStatus !== newStatus) {
        await workflowEventEmitter.emit(WORKFLOW_EVENTS.RECRUIT_PHASE_CHANGED, {
          recruitId: id,
          userId: updatedRecruit.id,
          userEmail: updatedRecruit.email,
          recruitName: `${updatedRecruit.first_name} ${updatedRecruit.last_name}`,
          oldPhase: oldStatus,
          newPhase: newStatus,
          recruiterId: updatedRecruit.recruiter_id || undefined,
          uplineId: updatedRecruit.upline_id || undefined,
          timestamp: new Date().toISOString(),
        });

        // Check for graduation (completed status)
        if (newStatus === "completed") {
          await workflowEventEmitter.emit(
            WORKFLOW_EVENTS.RECRUIT_GRADUATED_TO_AGENT,
            {
              recruitId: id,
              userId: updatedRecruit.id,
              userEmail: updatedRecruit.email,
              recruitName: `${updatedRecruit.first_name} ${updatedRecruit.last_name}`,
              graduatedAt: new Date().toISOString(),
              recruiterId: updatedRecruit.recruiter_id || undefined,
              uplineId: updatedRecruit.upline_id || undefined,
              agentStatus: updatedRecruit.agent_status,
              licensingInfo: updatedRecruit.licensing_info,
              timestamp: new Date().toISOString(),
            },
          );
        }

        // Check for dropout
        if (newStatus === "dropped") {
          await workflowEventEmitter.emit(WORKFLOW_EVENTS.RECRUIT_DROPPED_OUT, {
            recruitId: id,
            userId: updatedRecruit.id,
            userEmail: updatedRecruit.email,
            recruitName: `${updatedRecruit.first_name} ${updatedRecruit.last_name}`,
            droppedAt: new Date().toISOString(),
            lastPhase: oldStatus,
            recruiterId: updatedRecruit.recruiter_id || undefined,
            uplineId: updatedRecruit.upline_id || undefined,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return updatedRecruit;
  },

  // Hard delete recruit - permanently removes user and all related data
  async deleteRecruit(id: string) {
    return recruitRepository.deleteRecruit(id);
  },

  // ========================================
  // ONBOARDING PHASES
  // ========================================

  async getRecruitPhases(userId: string) {
    const { data, error } = await supabase
      .from("onboarding_phases")
      .select("*")
      .eq("user_id", userId)
      .order("phase_order", { ascending: true });

    if (error) throw error;
    return data as OnboardingPhase[];
  },

  async updatePhase(phaseId: string, updates: UpdatePhaseInput) {
    const { data, error } = await supabase
      .from("onboarding_phases")
      .update(updates)
      .eq("id", phaseId)
      .select()
      .single();

    if (error) throw error;
    return data as OnboardingPhase;
  },

  // ========================================
  // DOCUMENTS (delegates to documentService)
  // ========================================

  async getRecruitDocuments(userId: string) {
    const documents = await documentService.getDocumentsForUser(userId);
    // Transform to expected format (snake_case for backward compatibility)
    return documents.map((doc) => ({
      id: doc.id,
      user_id: doc.userId,
      document_type: doc.documentType,
      document_name: doc.documentName,
      file_name: doc.fileName,
      file_size: doc.fileSize,
      file_type: doc.fileType,
      storage_path: doc.storagePath,
      status: doc.status,
      uploaded_by: doc.uploadedBy,
      uploaded_at: doc.uploadedAt,
      notes: doc.notes,
      required: doc.required,
      expires_at: doc.expiresAt,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    })) as UserDocument[];
  },

  async uploadDocument(
    userId: string,
    file: File,
    documentType: string,
    documentName: string,
    uploadedBy: string,
    required = false,
    expiresAt?: string,
  ) {
    const document = await documentService.uploadDocument({
      userId,
      file,
      documentType,
      documentName,
      uploadedBy,
      required,
      expiresAt,
    });

    // Transform to expected format
    return {
      id: document.id,
      user_id: document.userId,
      document_type: document.documentType,
      document_name: document.documentName,
      file_name: document.fileName,
      file_size: document.fileSize,
      file_type: document.fileType,
      storage_path: document.storagePath,
      status: document.status,
      uploaded_by: document.uploadedBy,
      uploaded_at: document.uploadedAt,
      notes: document.notes,
      required: document.required,
      expires_at: document.expiresAt,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    } as UserDocument;
  },

  async downloadDocument(storagePath: string) {
    return documentStorageService.download(storagePath);
  },

  async getDocumentUrl(storagePath: string) {
    return documentStorageService.getSignedUrl(storagePath);
  },

  async deleteDocument(id: string, _storagePath?: string) {
    // Note: storagePath is ignored - documentService fetches it internally
    return documentService.deleteDocument(id);
  },

  async updateDocumentStatus(
    id: string,
    status: "pending" | "received" | "approved" | "rejected" | "expired",
    notes?: string,
  ) {
    const document = await documentService.updateStatus(id, status, notes);

    // Transform to expected format
    return {
      id: document.id,
      user_id: document.userId,
      document_type: document.documentType,
      document_name: document.documentName,
      file_name: document.fileName,
      file_size: document.fileSize,
      file_type: document.fileType,
      storage_path: document.storagePath,
      status: document.status,
      uploaded_by: document.uploadedBy,
      uploaded_at: document.uploadedAt,
      notes: document.notes,
      required: document.required,
      expires_at: document.expiresAt,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    } as UserDocument;
  },

  // ========================================
  // ACTIVITY LOG (delegates to activityLogService)
  // ========================================

  async getRecruitActivityLog(userId: string, limit = 50) {
    const logs = await activityLogService.getForUser(userId, limit);

    // Transform to expected format (snake_case for backward compatibility)
    return logs.map((log) => ({
      id: log.id,
      user_id: log.userId,
      action_type: log.actionType,
      details: log.details as Record<string, unknown> | null,
      performed_by: log.performedBy,
      created_at: log.createdAt ?? new Date().toISOString(),
    })) as UserActivityLog[];
  },

  // ========================================
  // OAUTH
  // ========================================

  getLinkedInOAuthUrl(userId: string) {
    const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-oauth`;
    const state = userId; // Pass userId as state
    const scope = "r_liteprofile r_emailaddress";

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI,
    )}&state=${state}&scope=${scope}`;

    return authUrl;
  },

  getInstagramOAuthUrl(userId: string) {
    const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;
    const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-oauth`;
    const state = userId;
    const scope = "user_profile,user_media";

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI,
    )}&scope=${scope}&response_type=code&state=${state}`;

    return authUrl;
  },

  // ========================================
  // STATS & ANALYTICS (using RecruitRepository)
  // ========================================

  async getRecruitingStats(recruiterId?: string) {
    return recruitRepository.getStats(recruiterId);
  },

  // ========================================
  // SEARCH & FILTERS (using RecruitRepository)
  // ========================================

  async searchRecruits(searchTerm: string, limit = 10) {
    return recruitRepository.searchRecruits(searchTerm, limit);
  },
};
