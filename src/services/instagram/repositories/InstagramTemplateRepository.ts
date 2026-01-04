// src/services/instagram/repositories/InstagramTemplateRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type {
  InstagramMessageTemplate,
  InstagramMessageTemplateInsert,
  InstagramMessageTemplateUpdate,
} from "@/types/instagram.types";

export class InstagramTemplateRepository extends BaseRepository<
  InstagramMessageTemplate,
  InstagramMessageTemplateInsert,
  InstagramMessageTemplateUpdate
> {
  constructor() {
    super("instagram_message_templates");
  }

  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): InstagramMessageTemplate {
    // No computed fields for templates - direct mapping
    return dbRecord as unknown as InstagramMessageTemplate;
  }

  protected transformToDB(
    data: InstagramMessageTemplateInsert | InstagramMessageTemplateUpdate,
  ): Record<string, unknown> {
    return { ...data };
  }

  /**
   * Find active templates for an IMO
   */
  async findActiveByImoId(imoId: string): Promise<InstagramMessageTemplate[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .order("use_count", { ascending: false });

    if (error) throw this.handleError(error, "findActiveByImoId");
    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Soft delete a template (set is_active to false)
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw this.handleError(error, "softDelete");
  }
}
