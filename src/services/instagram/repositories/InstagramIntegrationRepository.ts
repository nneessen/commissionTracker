// src/services/instagram/repositories/InstagramIntegrationRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  InstagramIntegration,
  InstagramIntegrationRow,
  InstagramIntegrationInsert,
  InstagramIntegrationUpdate,
} from "@/types/instagram.types";

export class InstagramIntegrationRepository extends BaseRepository<
  InstagramIntegration,
  InstagramIntegrationInsert,
  InstagramIntegrationUpdate
> {
  constructor() {
    super("instagram_integrations");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): InstagramIntegration {
    const row = dbRecord as unknown as InstagramIntegrationRow;
    const now = new Date();
    const tokenExpires = row.token_expires_at
      ? new Date(row.token_expires_at)
      : null;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return {
      ...row,
      isConnected: row.is_active && row.connection_status === "connected",
      tokenExpiringSoon: tokenExpires
        ? tokenExpires.getTime() - now.getTime() < sevenDaysMs
        : false,
    };
  }

  protected transformToDB(
    data: InstagramIntegrationInsert | InstagramIntegrationUpdate,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find all integrations for an IMO
   */
  async findByImoId(imoId: string): Promise<InstagramIntegration[]> {
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
  ): Promise<InstagramIntegration | null> {
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
}
