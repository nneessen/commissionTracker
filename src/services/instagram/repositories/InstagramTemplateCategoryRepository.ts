// src/services/instagram/repositories/InstagramTemplateCategoryRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  InstagramTemplateCategory,
  InstagramTemplateCategoryInsert,
  InstagramTemplateCategoryUpdate,
} from "@/types/instagram.types";

export class InstagramTemplateCategoryRepository extends BaseRepository<
  InstagramTemplateCategory,
  InstagramTemplateCategoryInsert,
  InstagramTemplateCategoryUpdate
> {
  constructor() {
    super("instagram_template_categories");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): InstagramTemplateCategory {
    // Direct mapping - no computed fields
    return dbRecord as unknown as InstagramTemplateCategory;
  }

  protected transformToDB(
    data: InstagramTemplateCategoryInsert | InstagramTemplateCategoryUpdate,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find all active categories for a user
   */
  async findByUserId(userId: string): Promise<InstagramTemplateCategory[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw this.handleError(error, "findByUserId");
    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Reorder categories for a user
   */
  async reorder(userId: string, categoryIds: string[]): Promise<void> {
    // Update each category with its new display_order
    const updates = categoryIds.map((id, index) =>
      this.client
        .from(this.tableName)
        .update({ display_order: index })
        .eq("id", id)
        .eq("user_id", userId),
    );

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      throw this.handleError(errors[0].error!, "reorder");
    }
  }

  /**
   * Soft delete a category (set is_active to false)
   * Includes user_id check for defense-in-depth (RLS also enforces this)
   */
  async softDelete(id: string, userId?: string): Promise<void> {
    let query = this.client
      .from(this.tableName)
      .update({ is_active: false })
      .eq("id", id);

    // Add user_id verification if provided
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { error } = await query;

    if (error) throw this.handleError(error, "softDelete");
  }
}
