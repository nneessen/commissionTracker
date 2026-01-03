// src/services/email/UserEmailRepository.ts
// Repository for user_emails table - extends BaseRepository

import { BaseRepository, type BaseEntity } from "../base/BaseRepository";
import type {
  UserEmailEntity,
  CreateUserEmailData,
  UpdateUserEmailData,
} from "./types";

// Type assertion to satisfy BaseEntity constraint while using string dates

type UserEmailBaseEntity = UserEmailEntity & BaseEntity;

export class UserEmailRepository extends BaseRepository<
  UserEmailBaseEntity,
  CreateUserEmailData,
  UpdateUserEmailData
> {
  constructor() {
    super("user_emails");
  }

  /**
   * Transform database record to UserEmailEntity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): UserEmailBaseEntity {
    return {
      id: dbRecord.id as string,
      user_id: dbRecord.user_id as string,
      sender_id: dbRecord.sender_id as string | null,
      subject: dbRecord.subject as string,
      body_html: dbRecord.body_html as string | null,
      body_text: dbRecord.body_text as string | null,
      status: dbRecord.status as UserEmailEntity["status"],
      sent_at: dbRecord.sent_at as string | null,
      delivered_at: dbRecord.delivered_at as string | null,
      opened_at: dbRecord.opened_at as string | null,
      failed_reason: dbRecord.failed_reason as string | null,
      metadata: dbRecord.metadata as Record<string, unknown> | null,
      // Keep dates as strings for backward compatibility
      created_at: (dbRecord.created_at as string) || "",
      updated_at: (dbRecord.updated_at as string) || "",
      // Handle joined attachments if present
      attachments: Array.isArray(dbRecord.attachments)
        ? dbRecord.attachments
        : undefined,
    } as UserEmailBaseEntity;
  }

  /**
   * Transform entity data to database record
   */
  protected transformToDB(
    data: CreateUserEmailData | UpdateUserEmailData,
  ): Record<string, unknown> {
    const dbData: Record<string, unknown> = {};

    if ("userId" in data && data.userId !== undefined)
      dbData.user_id = data.userId;
    if ("senderId" in data && data.senderId !== undefined)
      dbData.sender_id = data.senderId;
    if ("subject" in data && data.subject !== undefined)
      dbData.subject = data.subject;
    if ("bodyHtml" in data && data.bodyHtml !== undefined)
      dbData.body_html = data.bodyHtml;
    if ("bodyText" in data && data.bodyText !== undefined)
      dbData.body_text = data.bodyText;
    if ("status" in data && data.status !== undefined)
      dbData.status = data.status;
    if ("toAddresses" in data && data.toAddresses !== undefined)
      dbData.to_addresses = data.toAddresses;
    if ("ccAddresses" in data && data.ccAddresses !== undefined)
      dbData.cc_addresses = data.ccAddresses;
    if ("fromAddress" in data && data.fromAddress !== undefined)
      dbData.from_address = data.fromAddress;
    if ("sentAt" in data && data.sentAt !== undefined)
      dbData.sent_at = data.sentAt;
    if ("deliveredAt" in data && data.deliveredAt !== undefined)
      dbData.delivered_at = data.deliveredAt;
    if ("openedAt" in data && data.openedAt !== undefined)
      dbData.opened_at = data.openedAt;
    if ("failedReason" in data && data.failedReason !== undefined)
      dbData.failed_reason = data.failedReason;
    if ("isRead" in data && data.isRead !== undefined)
      dbData.is_read = data.isRead;
    if ("metadata" in data && data.metadata !== undefined)
      dbData.metadata = data.metadata;

    return dbData;
  }

  // ========================================
  // Domain-specific query methods
  // ========================================

  /**
   * Find all emails for a user (as sender or recipient)
   */
  async findByUser(userId: string): Promise<UserEmailBaseEntity[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .or(`user_id.eq.${userId},sender_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw this.handleError(error, "findByUser");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByUser");
    }
  }

  /**
   * Find emails where user is the recipient (recruit)
   */
  async findByRecruit(recruitId: string): Promise<UserEmailBaseEntity[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .eq("user_id", recruitId)
        .order("created_at", { ascending: false });

      if (error) throw this.handleError(error, "findByRecruit");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByRecruit");
    }
  }

  /**
   * Override findById to include attachments
   */
  override async findById(id: string): Promise<UserEmailBaseEntity | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw this.handleError(error, "findById");
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, "findById");
    }
  }

  /**
   * Find emails by sender
   */
  async findBySender(senderId: string): Promise<UserEmailBaseEntity[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .eq("sender_id", senderId)
        .order("created_at", { ascending: false });

      if (error) throw this.handleError(error, "findBySender");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findBySender");
    }
  }

  /**
   * Find emails by status
   */
  async findByStatus(status: string): Promise<UserEmailBaseEntity[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`*, attachments:user_email_attachments(*)`)
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (error) throw this.handleError(error, "findByStatus");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findByStatus");
    }
  }
}
