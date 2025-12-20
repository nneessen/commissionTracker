// src/services/settings/products/ProductRepository.ts
import { BaseRepository, BaseEntity } from "../../base/BaseRepository";
import type { Database } from "@/types/database.types";
import type { Product, ProductFormData } from "@/types/product.types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

// Type that combines Product with BaseEntity for repository compatibility
type ProductBaseEntity = Product & BaseEntity;

/**
 * Repository for products data access
 * Extends BaseRepository for standard CRUD operations
 */
export class ProductRepository extends BaseRepository<
  ProductBaseEntity,
  ProductFormData,
  Partial<ProductFormData>
> {
  constructor() {
    super("products");
  }

  /**
   * Transform database record to Product entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): ProductBaseEntity {
    const row = dbRecord as ProductRow;
    return {
      id: row.id,
      carrier_id: row.carrier_id,
      name: row.name,
      code: row.code ?? undefined,
      product_type: row.product_type,
      description: row.description ?? undefined,
      min_premium: row.min_premium ?? undefined,
      max_premium: row.max_premium ?? undefined,
      min_age: row.min_age ?? undefined,
      max_age: row.max_age ?? undefined,
      commission_percentage: row.commission_percentage ?? undefined,
      is_active: row.is_active ?? true,
      metadata: row.metadata as Record<string, unknown> | undefined,
      created_at: row.created_at ? new Date(row.created_at) : new Date(),
      updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
    } as ProductBaseEntity;
  }

  /**
   * Transform entity to database record
   */
  protected transformToDB(
    data: ProductFormData | Partial<ProductFormData>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (data.carrier_id !== undefined) result.carrier_id = data.carrier_id;
    if (data.name !== undefined) result.name = data.name;
    if (data.code !== undefined) result.code = data.code || null;
    if (data.product_type !== undefined)
      result.product_type = data.product_type;
    if (data.description !== undefined)
      result.description = data.description || null;
    if (data.min_premium !== undefined) result.min_premium = data.min_premium;
    if (data.max_premium !== undefined) result.max_premium = data.max_premium;
    if (data.min_age !== undefined) result.min_age = data.min_age;
    if (data.max_age !== undefined) result.max_age = data.max_age;
    if (data.commission_percentage !== undefined) {
      result.commission_percentage = data.commission_percentage;
    }
    if (data.is_active !== undefined) result.is_active = data.is_active;

    return result;
  }

  /**
   * Override findAll to order by name
   */
  async findAll(): Promise<ProductBaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .order("name");

    if (error) {
      throw this.handleError(error, "findAll");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Find products by carrier ID
   */
  async findByCarrier(carrierId: string): Promise<ProductBaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("carrier_id", carrierId)
      .order("name");

    if (error) {
      throw this.handleError(error, "findByCarrier");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Find active products only
   */
  async findActive(): Promise<ProductBaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      throw this.handleError(error, "findActive");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Search products by name
   */
  async search(searchTerm: string): Promise<ProductBaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .order("name");

    if (error) {
      throw this.handleError(error, "search");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }
}
