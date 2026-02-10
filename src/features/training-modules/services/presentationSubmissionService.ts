// src/features/training-modules/services/presentationSubmissionService.ts
import { supabase } from "@/services/base";
import type { PresentationSubmission, PresentationSubmissionFilters } from "../types/training-module.types";

const STORAGE_BUCKET = "presentation-recordings";
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Build storage path for a presentation recording.
 * Convention: {user_id}/{week_start_YYYYMMDD}_{timestamp}.{ext}
 */
function buildStoragePath(userId: string, weekStart: string, fileName: string): string {
  const weekFormatted = weekStart.replace(/-/g, "");
  const timestamp = Date.now();
  const ext = fileName.split(".").pop()?.toLowerCase() || "webm";
  return `${userId}/${weekFormatted}_${timestamp}.${ext}`;
}

export const presentationSubmissionService = {
  /**
   * List submissions with optional filters
   */
  async list(filters?: PresentationSubmissionFilters): Promise<PresentationSubmission[]> {
    let query = supabase
      .from("presentation_submissions")
      .select(`
        *,
        submitter:user_profiles!presentation_submissions_user_id_fkey(
          id, first_name, last_name, email
        ),
        reviewer:user_profiles!presentation_submissions_reviewed_by_fkey(
          id, first_name, last_name
        )
      `)
      .order("created_at", { ascending: false });

    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }
    if (filters?.agencyId) {
      query = query.eq("agency_id", filters.agencyId);
    }
    if (filters?.weekStart) {
      query = query.eq("week_start", filters.weekStart);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list submissions: ${error.message}`);
    return (data || []) as unknown as PresentationSubmission[];
  },

  /**
   * Get a single submission by ID with joined profiles
   */
  async getById(id: string): Promise<PresentationSubmission | null> {
    const { data, error } = await supabase
      .from("presentation_submissions")
      .select(`
        *,
        submitter:user_profiles!presentation_submissions_user_id_fkey(
          id, first_name, last_name, email
        ),
        reviewer:user_profiles!presentation_submissions_reviewed_by_fkey(
          id, first_name, last_name
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to get submission: ${error.message}`);
    }
    return data as unknown as PresentationSubmission;
  },

  /**
   * Upload recording to storage + create DB row.
   * Cleans up storage on DB failure.
   */
  async submit(params: {
    file: File | Blob;
    fileName: string;
    title: string;
    description?: string;
    weekStart: string;
    userId: string;
    imoId: string;
    agencyId: string;
    mimeType: string;
    recordingType: "browser_recording" | "upload";
    durationSeconds?: number;
  }): Promise<PresentationSubmission> {
    const storagePath = buildStoragePath(params.userId, params.weekStart, params.fileName);

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, params.file, { contentType: params.mimeType });

    if (uploadError) {
      throw new Error(`Failed to upload recording: ${uploadError.message}`);
    }

    // Create DB record
    const { data, error: dbError } = await supabase
      .from("presentation_submissions")
      .insert({
        imo_id: params.imoId,
        agency_id: params.agencyId,
        user_id: params.userId,
        title: params.title,
        description: params.description || null,
        week_start: params.weekStart,
        storage_path: storagePath,
        file_name: params.fileName,
        file_size: params.file instanceof File ? params.file.size : params.file.size,
        mime_type: params.mimeType,
        duration_seconds: params.durationSeconds || null,
        recording_type: params.recordingType,
      })
      .select(`
        *,
        submitter:user_profiles!presentation_submissions_user_id_fkey(
          id, first_name, last_name, email
        ),
        reviewer:user_profiles!presentation_submissions_reviewed_by_fkey(
          id, first_name, last_name
        )
      `)
      .single();

    if (dbError) {
      // Clean up uploaded file
      const { error: cleanupError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);
      if (cleanupError) {
        console.error(`ORPHANED FILE: Failed to clean up ${storagePath}:`, cleanupError);
      }
      throw new Error(`Failed to create submission record: ${dbError.message}`);
    }

    return data as unknown as PresentationSubmission;
  },

  /**
   * Update submission metadata (title/description) while still pending
   */
  async update(id: string, params: { title?: string; description?: string }): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (params.title !== undefined) updateData.title = params.title;
    if (params.description !== undefined) updateData.description = params.description;

    const { error } = await supabase
      .from("presentation_submissions")
      .update(updateData)
      .eq("id", id);
    if (error) throw new Error(`Failed to update submission: ${error.message}`);
  },

  /**
   * Manager reviews a submission
   */
  async review(id: string, params: {
    status: "approved" | "needs_improvement";
    reviewerNotes?: string;
    reviewedBy: string;
  }): Promise<void> {
    const { error } = await supabase
      .from("presentation_submissions")
      .update({
        status: params.status,
        reviewer_notes: params.reviewerNotes || null,
        reviewed_by: params.reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`Failed to review submission: ${error.message}`);
  },

  /**
   * Delete submission (removes storage file + DB row)
   */
  async delete(id: string): Promise<void> {
    const submission = await this.getById(id);
    if (!submission) throw new Error("Submission not found");

    // Remove from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([submission.storage_path]);
    if (storageError) {
      console.warn(`Failed to remove recording from storage: ${storageError.message}`);
    }

    // Delete DB row
    const { error: dbError } = await supabase
      .from("presentation_submissions")
      .delete()
      .eq("id", id);
    if (dbError) throw new Error(`Failed to delete submission: ${dbError.message}`);
  },

  /**
   * Get a signed URL for video playback (1-hour expiry)
   */
  async getSignedUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
    if (error) {
      console.error("Failed to create signed URL:", error);
      return null;
    }
    return data?.signedUrl || null;
  },

  /**
   * Get weekly compliance: list of agents in agency + whether they submitted this week
   */
  async getWeeklyCompliance(agencyId: string, weekStart: string): Promise<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    submitted: boolean;
    submissionId: string | null;
    status: string | null;
  }[]> {
    // Get all agents in the agency
    const { data: agents, error: agentsError } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, email")
      .eq("agency_id", agencyId)
      .eq("status", "approved")
      .not("roles", "ov", "{trainer,contracting_manager}");

    if (agentsError) throw new Error(`Failed to fetch agents: ${agentsError.message}`);

    // Get submissions for this week
    const { data: submissions, error: subError } = await supabase
      .from("presentation_submissions")
      .select("id, user_id, status")
      .eq("agency_id", agencyId)
      .eq("week_start", weekStart);

    if (subError) throw new Error(`Failed to fetch submissions: ${subError.message}`);

    const submissionMap = new Map(
      (submissions || []).map((s) => [s.user_id, { id: s.id, status: s.status }])
    );

    return (agents || []).map((agent) => {
      const sub = submissionMap.get(agent.id);
      return {
        userId: agent.id,
        firstName: agent.first_name || "",
        lastName: agent.last_name || "",
        email: agent.email || "",
        submitted: !!sub,
        submissionId: sub?.id || null,
        status: sub?.status || null,
      };
    });
  },
};
