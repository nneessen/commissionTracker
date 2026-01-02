// src/services/settings/carriers/CarrierRepository.ts
import { BaseRepository, type BaseEntity } from "../../base/BaseRepository";
import type { Carrier, CarrierRow } from "@/types/carrier.types";

// Type assertion to satisfy BaseEntity constraint while using string dates

type CarrierBaseEntity = Carrier & BaseEntity;

/**
 * Repository for carrier database operations
 * Extends BaseRepository for standard CRUD
 */
export class CarrierRepository extends BaseRepository<
  CarrierBaseEntity,
  Omit<CarrierRow, "id" | "created_at" | "updated_at">,
  Partial<CarrierRow>
> {
  constructor() {
    super("carriers");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): CarrierBaseEntity {
    return {
      id: dbRecord.id as string,
      name: dbRecord.name as string,
      code: dbRecord.code as string | null,
      commission_structure:
        dbRecord.commission_structure as Carrier["commission_structure"],
      contact_info: dbRecord.contact_info as Carrier["contact_info"],
      is_active: dbRecord.is_active as boolean | null,
      imo_id: dbRecord.imo_id as string | null,
      advance_cap: dbRecord.advance_cap as number | null,
      // Keep dates as strings for backward compatibility
      created_at: (dbRecord.created_at as string) || null,
      updated_at: (dbRecord.updated_at as string) || null,
    } as CarrierBaseEntity;
  }

  protected transformToDB(
    data:
      | Omit<CarrierRow, "id" | "created_at" | "updated_at">
      | Partial<CarrierRow>,
  ): Record<string, unknown> {
    const dbData: Record<string, unknown> = {};

    if ("name" in data && data.name !== undefined) dbData.name = data.name;
    if ("code" in data && data.code !== undefined) dbData.code = data.code;
    if (
      "commission_structure" in data &&
      data.commission_structure !== undefined
    ) {
      dbData.commission_structure = data.commission_structure;
    }
    if ("contact_info" in data && data.contact_info !== undefined) {
      dbData.contact_info = data.contact_info;
    }
    if ("is_active" in data && data.is_active !== undefined) {
      dbData.is_active = data.is_active;
    }
    if ("imo_id" in data && data.imo_id !== undefined) {
      dbData.imo_id = data.imo_id;
    }
    if ("advance_cap" in data && data.advance_cap !== undefined) {
      dbData.advance_cap = data.advance_cap;
    }

    return dbData;
  }

  /**
   * Search carriers by name or code (case-insensitive)
   */
  async search(query: string): Promise<CarrierBaseEntity[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .order("name", { ascending: true });

      if (error) throw this.handleError(error, "search");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "search");
    }
  }

  /**
   * Get all active carriers
   */
  async findActive(): Promise<CarrierBaseEntity[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw this.handleError(error, "findActive");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findActive");
    }
  }

  /**
   * Override findAll to always order by name
   */
  override async findAll(): Promise<CarrierBaseEntity[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .order("name", { ascending: true });

      if (error) throw this.handleError(error, "findAll");
      return data?.map((item) => this.transformFromDB(item)) || [];
    } catch (error) {
      throw this.wrapError(error, "findAll");
    }
  }
}
