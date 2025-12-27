// src/services/signatures/repositories/SignatureSubmitterRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type { Database } from "@/types/database.types";
import type {
  SignatureSubmitter,
  SignerRole,
  SubmitterStatus,
  CreateSignatureSubmitterInput,
  UpdateSignatureSubmitterInput,
} from "@/types/signature.types";

// Database row type
type SignatureSubmitterRow =
  Database["public"]["Tables"]["signature_submitters"]["Row"];

export class SignatureSubmitterRepository extends BaseRepository<
  SignatureSubmitter,
  CreateSignatureSubmitterInput,
  UpdateSignatureSubmitterInput
> {
  constructor() {
    super("signature_submitters");
  }

  /**
   * Find submitters by submission ID
   */
  async findBySubmissionId(
    submissionId: string,
  ): Promise<SignatureSubmitter[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("submission_id", submissionId)
      .order("signing_order", { ascending: true });

    if (error) {
      throw this.handleError(error, "findBySubmissionId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find submitter by user ID and submission ID
   */
  async findByUserAndSubmission(
    userId: string,
    submissionId: string,
  ): Promise<SignatureSubmitter | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("submission_id", submissionId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByUserAndSubmission");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find submitter by email and submission ID
   */
  async findByEmailAndSubmission(
    email: string,
    submissionId: string,
  ): Promise<SignatureSubmitter | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("submission_id", submissionId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByEmailAndSubmission");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find submitter by DocuSeal submitter ID
   */
  async findByDocuSealId(
    docusealSubmitterId: number,
  ): Promise<SignatureSubmitter | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("docuseal_submitter_id", docusealSubmitterId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByDocuSealId");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find all pending submitters for a user across all submissions
   */
  async findPendingForUser(userId: string): Promise<SignatureSubmitter[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending", "sent", "opened"])
      .order("created_at", { ascending: true });

    if (error) {
      throw this.handleError(error, "findPendingForUser");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find pending submitters by email
   */
  async findPendingByEmail(email: string): Promise<SignatureSubmitter[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("email", email.toLowerCase())
      .in("status", ["pending", "sent", "opened"])
      .order("created_at", { ascending: true });

    if (error) {
      throw this.handleError(error, "findPendingByEmail");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Update submitter status
   */
  async updateStatus(
    id: string,
    status: SubmitterStatus,
    additionalUpdates?: Partial<UpdateSignatureSubmitterInput>,
  ): Promise<SignatureSubmitter> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set timestamps based on status
    if (status === "sent" && !additionalUpdates?.sentAt) {
      updates.sent_at = new Date().toISOString();
    } else if (status === "opened" && !additionalUpdates?.openedAt) {
      updates.opened_at = new Date().toISOString();
    } else if (status === "completed") {
      updates.signed_at = new Date().toISOString();
    } else if (status === "declined") {
      updates.declined_at = new Date().toISOString();
    }

    if (additionalUpdates) {
      if (additionalUpdates.docusealSubmitterId !== undefined)
        updates.docuseal_submitter_id = additionalUpdates.docusealSubmitterId;
      if (additionalUpdates.embedUrl !== undefined)
        updates.embed_url = additionalUpdates.embedUrl;
      if (additionalUpdates.embedUrlExpiresAt !== undefined)
        updates.embed_url_expires_at = additionalUpdates.embedUrlExpiresAt;
      if (additionalUpdates.ipAddress !== undefined)
        updates.ip_address = additionalUpdates.ipAddress;
      if (additionalUpdates.userAgent !== undefined)
        updates.user_agent = additionalUpdates.userAgent;
      if (additionalUpdates.declineReason !== undefined)
        updates.decline_reason = additionalUpdates.declineReason;
      if (additionalUpdates.sentAt !== undefined)
        updates.sent_at = additionalUpdates.sentAt;
      if (additionalUpdates.openedAt !== undefined)
        updates.opened_at = additionalUpdates.openedAt;
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
   * Update embed URL for a submitter
   */
  async updateEmbedUrl(
    id: string,
    embedUrl: string,
    expiresAt?: string,
  ): Promise<SignatureSubmitter> {
    const updates: Record<string, unknown> = {
      embed_url: embedUrl,
      updated_at: new Date().toISOString(),
    };

    if (expiresAt) {
      updates.embed_url_expires_at = expiresAt;
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateEmbedUrl");
    }

    return this.transformFromDB(data);
  }

  /**
   * Mark submitter as signed with audit info
   */
  async markAsSigned(
    id: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SignatureSubmitter> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        status: "completed",
        signed_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "markAsSigned");
    }

    return this.transformFromDB(data);
  }

  /**
   * Mark submitter as declined
   */
  async markAsDeclined(
    id: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SignatureSubmitter> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        decline_reason: reason,
        ip_address: ipAddress,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "markAsDeclined");
    }

    return this.transformFromDB(data);
  }

  /**
   * Create multiple submitters for a submission
   */
  async createManyForSubmission(
    submissionId: string,
    submitters: Omit<CreateSignatureSubmitterInput, "submissionId">[],
  ): Promise<SignatureSubmitter[]> {
    const dbData = submitters.map((s, index) => ({
      submission_id: submissionId,
      user_id: s.userId,
      role: s.role,
      email: s.email.toLowerCase(),
      name: s.name,
      signing_order: s.signingOrder ?? index,
      status: "pending",
    }));

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(dbData)
      .select();

    if (error) {
      throw this.handleError(error, "createManyForSubmission");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): SignatureSubmitter {
    const row = dbRecord as SignatureSubmitterRow;
    return {
      id: row.id,
      submissionId: row.submission_id,
      userId: row.user_id,
      docusealSubmitterId: row.docuseal_submitter_id,
      role: row.role as SignerRole,
      email: row.email,
      name: row.name,
      signingOrder: row.signing_order ?? 0,
      status: (row.status || "pending") as SubmitterStatus,
      embedUrl: row.embed_url,
      embedUrlExpiresAt: row.embed_url_expires_at,
      signedAt: row.signed_at,
      declinedAt: row.declined_at,
      declineReason: row.decline_reason,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data: CreateSignatureSubmitterInput | UpdateSignatureSubmitterInput,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdateSignatureSubmitterInput;
      const dbData: Record<string, unknown> = {};

      if (updateData.docusealSubmitterId !== undefined)
        dbData.docuseal_submitter_id = updateData.docusealSubmitterId;
      if (updateData.status !== undefined) dbData.status = updateData.status;
      if (updateData.embedUrl !== undefined)
        dbData.embed_url = updateData.embedUrl;
      if (updateData.embedUrlExpiresAt !== undefined)
        dbData.embed_url_expires_at = updateData.embedUrlExpiresAt;
      if (updateData.signedAt !== undefined)
        dbData.signed_at = updateData.signedAt;
      if (updateData.declinedAt !== undefined)
        dbData.declined_at = updateData.declinedAt;
      if (updateData.declineReason !== undefined)
        dbData.decline_reason = updateData.declineReason;
      if (updateData.ipAddress !== undefined)
        dbData.ip_address = updateData.ipAddress;
      if (updateData.userAgent !== undefined)
        dbData.user_agent = updateData.userAgent;
      if (updateData.sentAt !== undefined) dbData.sent_at = updateData.sentAt;
      if (updateData.openedAt !== undefined)
        dbData.opened_at = updateData.openedAt;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreateSignatureSubmitterInput;
    return {
      submission_id: createData.submissionId,
      user_id: createData.userId,
      role: createData.role,
      email: createData.email.toLowerCase(),
      name: createData.name,
      signing_order: createData.signingOrder ?? 0,
      status: "pending",
    };
  }
}

// Singleton instance
export const signatureSubmitterRepository = new SignatureSubmitterRepository();
