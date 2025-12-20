// src/services/clients/client/ClientRepository.ts
import { BaseRepository, BaseEntity } from "../../base/BaseRepository";
import type {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientFilters,
  ClientSortConfig,
  ClientWithStats,
} from "@/types/client.types";

type ClientBaseEntity = Client & BaseEntity;

/**
 * Repository for clients data access
 * Extends BaseRepository for standard CRUD operations
 */
export class ClientRepository extends BaseRepository<
  ClientBaseEntity,
  CreateClientData,
  UpdateClientData
> {
  constructor() {
    super("clients");
  }

  /**
   * Transform database record to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): ClientBaseEntity {
    return {
      id: dbRecord.id as string,
      user_id: dbRecord.user_id as string | null,
      name: dbRecord.name as string,
      email: dbRecord.email as string | null,
      phone: dbRecord.phone as string | null,
      address: dbRecord.address as string | null,
      date_of_birth: dbRecord.date_of_birth as string | null,
      notes: dbRecord.notes as string | null,
      status: dbRecord.status as Client["status"],
      created_at: dbRecord.created_at as string,
      updated_at: dbRecord.updated_at as string,
    } as ClientBaseEntity;
  }

  /**
   * Transform entity to database record
   */
  protected transformToDB(
    data: CreateClientData | UpdateClientData,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if ("name" in data && data.name !== undefined) result.name = data.name;
    if ("email" in data) result.email = data.email ?? null;
    if ("phone" in data) result.phone = data.phone ?? null;
    if ("address" in data) result.address = data.address ?? null;
    if ("date_of_birth" in data)
      result.date_of_birth = data.date_of_birth ?? null;
    if ("notes" in data) result.notes = data.notes ?? null;
    if ("status" in data && data.status !== undefined)
      result.status = data.status;

    return result;
  }

  /**
   * Find all clients with filters and sorting
   */
  async findWithFilters(
    filters?: ClientFilters,
    sort?: ClientSortConfig,
  ): Promise<ClientBaseEntity[]> {
    let query = this.client.from(this.tableName).select("*");

    if (filters) {
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.searchTerm) {
        const searchPattern = `%${filters.searchTerm}%`;
        query = query.or(
          `name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`,
        );
      }

      if (filters.hasEmail === true) {
        query = query.not("email", "is", null);
      } else if (filters.hasEmail === false) {
        query = query.is("email", null);
      }

      if (filters.hasPhone === true) {
        query = query.not("phone", "is", null);
      } else if (filters.hasPhone === false) {
        query = query.is("phone", null);
      }
    }

    const sortField = sort?.field || "name";
    const sortDirection = sort?.direction || "asc";
    query = query.order(sortField, { ascending: sortDirection === "asc" });

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, "findWithFilters");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Get all clients with stats using database function
   */
  async findAllWithStats(): Promise<ClientWithStats[]> {
    const { data, error } = await this.client.rpc("get_clients_with_stats");

    if (error) {
      throw this.handleError(error, "findAllWithStats");
    }

    return (data || []) as ClientWithStats[];
  }

  /**
   * Search clients by name/email/phone
   */
  async search(query: string, limit = 10): Promise<ClientBaseEntity[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const searchPattern = `%${query}%`;
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .or(
        `name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`,
      )
      .eq("status", "active")
      .order("name")
      .limit(limit);

    if (error) {
      throw this.handleError(error, "search");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Find client by name and user
   */
  async findByNameAndUser(
    name: string,
    userId: string,
  ): Promise<ClientBaseEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("name", name)
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      throw this.handleError(error, "findByNameAndUser");
    }

    if (data && data.length > 0) {
      return this.transformFromDB(data[0]);
    }

    return null;
  }

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(
    clientIds: string[],
    status: Client["status"],
  ): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ status })
      .in("id", clientIds);

    if (error) {
      throw this.handleError(error, "bulkUpdateStatus");
    }
  }

  /**
   * Check if client has policies
   */
  async hasPolicies(clientId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("policies")
      .select("id")
      .eq("client_id", clientId)
      .limit(1);

    if (error) {
      throw this.handleError(error, "hasPolicies");
    }

    return data !== null && data.length > 0;
  }
}

export type { ClientBaseEntity };
