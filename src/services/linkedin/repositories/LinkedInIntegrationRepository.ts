// src/services/linkedin/repositories/LinkedInIntegrationRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  LinkedInIntegration,
  LinkedInIntegrationRow,
  LinkedInIntegrationInsert,
  LinkedInIntegrationUpdate,
} from "@/types/linkedin.types";

export class LinkedInIntegrationRepository extends BaseRepository<
  LinkedInIntegration,
  LinkedInIntegrationInsert,
  LinkedInIntegrationUpdate
> {
  constructor() {
    super("linkedin_integrations");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): LinkedInIntegration {
    const row = dbRecord as unknown as LinkedInIntegrationRow;
    return {
      ...row,
      isConnected: row.is_active && row.connection_status === "connected",
      needsReconnection: row.connection_status === "credentials",
    };
  }

  protected transformToDB(
    data: LinkedInIntegrationInsert | LinkedInIntegrationUpdate,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find all integrations for an IMO
   */
  async findByImoId(imoId: string): Promise<LinkedInIntegration[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("imo_id", imoId)
      .order("created_at", { ascending: true });

    if (error) throw this.handleError(error, "findByImoId");
    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find active integration for a user
   */
  async findActiveByUserId(
    userId: string,
  ): Promise<LinkedInIntegration | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw this.handleError(error, "findActiveByUserId");
    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find integration by Unipile account ID
   */
  async findByUnipileAccountId(
    unipileAccountId: string,
  ): Promise<LinkedInIntegration | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("unipile_account_id", unipileAccountId)
      .maybeSingle();

    if (error) throw this.handleError(error, "findByUnipileAccountId");
    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Disconnect an integration (soft disable)
   */
  async disconnect(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        is_active: false,
        connection_status: "disconnected",
      })
      .eq("id", id);

    if (error) throw this.handleError(error, "disconnect");
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(
    id: string,
    status: "connected" | "disconnected" | "credentials" | "error",
    errorMessage?: string,
  ): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        connection_status: status,
        is_active: status === "connected",
        last_error: status !== "connected" ? errorMessage || null : null,
        last_error_at: status !== "connected" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) throw this.handleError(error, "updateConnectionStatus");
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw this.handleError(error, "updateLastSync");
  }
}
