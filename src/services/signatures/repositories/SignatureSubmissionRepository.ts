// src/services/signatures/repositories/SignatureSubmissionRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type { Database } from "@/types/database.types";
import type {
  SignatureSubmission,
  SubmissionStatus,
  CreateSignatureSubmissionInput,
  UpdateSignatureSubmissionInput,
} from "@/types/signature.types";

// Database row type
type SignatureSubmissionRow =
  Database["public"]["Tables"]["signature_submissions"]["Row"];

export class SignatureSubmissionRepository extends BaseRepository<
  SignatureSubmission,
  CreateSignatureSubmissionInput,
  UpdateSignatureSubmissionInput
> {
  constructor() {
    super("signature_submissions");
  }

  /**
   * Find submissions by agency ID
   */
  async findByAgencyId(agencyId: string): Promise<SignatureSubmission[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByAgencyId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find submissions by target user ID
   */
  async findByTargetUserId(userId: string): Promise<SignatureSubmission[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByTargetUserId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find submission by checklist progress ID
   */
  async findByChecklistProgressId(
    checklistProgressId: string,
  ): Promise<SignatureSubmission | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("checklist_progress_id", checklistProgressId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByChecklistProgressId");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find submission by DocuSeal submission ID
   */
  async findByDocuSealId(
    docusealSubmissionId: number,
  ): Promise<SignatureSubmission | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("docuseal_submission_id", docusealSubmissionId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByDocuSealId");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find submissions by status
   */
  async findByStatus(
    agencyId: string,
    status: SubmissionStatus,
  ): Promise<SignatureSubmission[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("agency_id", agencyId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByStatus");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find pending submissions for a user (as target)
   */
  async findPendingForUser(userId: string): Promise<SignatureSubmission[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("target_user_id", userId)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: true });

    if (error) {
      throw this.handleError(error, "findPendingForUser");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Update submission status
   */
  async updateStatus(
    id: string,
    status: SubmissionStatus,
    additionalUpdates?: Partial<UpdateSignatureSubmissionInput>,
  ): Promise<SignatureSubmission> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    } else if (status === "declined") {
      updates.declined_at = new Date().toISOString();
    }

    if (additionalUpdates) {
      if (additionalUpdates.auditLogUrl)
        updates.audit_log_url = additionalUpdates.auditLogUrl;
      if (additionalUpdates.combinedDocumentUrl)
        updates.combined_document_url = additionalUpdates.combinedDocumentUrl;
      if (additionalUpdates.voidedBy)
        updates.voided_by = additionalUpdates.voidedBy;
      if (additionalUpdates.voidedReason)
        updates.voided_reason = additionalUpdates.voidedReason;
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateStatus");
    }

    return this.transformFromDB(data);
  }

  /**
   * Void a submission
   */
  async voidSubmission(
    id: string,
    voidedBy: string,
    reason?: string,
  ): Promise<SignatureSubmission> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: voidedBy,
        voided_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "voidSubmission");
    }

    return this.transformFromDB(data);
  }

  /**
   * Find submissions with template info
   */
  async findWithTemplate(
    submissionId: string,
  ): Promise<
    | (SignatureSubmission & {
        template: { name: string; templateType: string };
      })
    | null
  > {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        template:template_id(name, template_type)
      `,
      )
      .eq("id", submissionId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findWithTemplate");
    }

    if (!data) return null;

    const submission = this.transformFromDB(data);
    const template = data.template as { name: string; template_type: string };

    return {
      ...submission,
      template: {
        name: template.name,
        templateType: template.template_type,
      },
    };
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): SignatureSubmission {
    const row = dbRecord as SignatureSubmissionRow;
    return {
      id: row.id,
      agencyId: row.agency_id,
      imoId: row.imo_id,
      templateId: row.template_id,
      docusealSubmissionId: row.docuseal_submission_id,
      status: (row.status || "pending") as SubmissionStatus,
      initiatedBy: row.initiated_by,
      targetUserId: row.target_user_id,
      checklistProgressId: row.checklist_progress_id,
      auditLogUrl: row.audit_log_url,
      combinedDocumentUrl: row.combined_document_url,
      expiresAt: row.expires_at,
      completedAt: row.completed_at,
      declinedAt: row.declined_at,
      voidedAt: row.voided_at,
      voidedBy: row.voided_by,
      voidedReason: row.voided_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data: CreateSignatureSubmissionInput | UpdateSignatureSubmissionInput,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdateSignatureSubmissionInput;
      const dbData: Record<string, unknown> = {};

      if (updateData.docusealSubmissionId !== undefined)
        dbData.docuseal_submission_id = updateData.docusealSubmissionId;
      if (updateData.status !== undefined) dbData.status = updateData.status;
      if (updateData.auditLogUrl !== undefined)
        dbData.audit_log_url = updateData.auditLogUrl;
      if (updateData.combinedDocumentUrl !== undefined)
        dbData.combined_document_url = updateData.combinedDocumentUrl;
      if (updateData.completedAt !== undefined)
        dbData.completed_at = updateData.completedAt;
      if (updateData.declinedAt !== undefined)
        dbData.declined_at = updateData.declinedAt;
      if (updateData.voidedAt !== undefined)
        dbData.voided_at = updateData.voidedAt;
      if (updateData.voidedBy !== undefined)
        dbData.voided_by = updateData.voidedBy;
      if (updateData.voidedReason !== undefined)
        dbData.voided_reason = updateData.voidedReason;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreateSignatureSubmissionInput;
    return {
      agency_id: createData.agencyId,
      imo_id: createData.imoId,
      template_id: createData.templateId,
      target_user_id: createData.targetUserId,
      checklist_progress_id: createData.checklistProgressId,
      initiated_by: createData.initiatedBy,
      expires_at: createData.expiresAt,
      status: "pending",
    };
  }
}

// Singleton instance
export const signatureSubmissionRepository =
  new SignatureSubmissionRepository();
