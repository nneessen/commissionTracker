// src/services/signatures/repositories/SignatureTemplateRepository.ts
import { BaseRepository } from "@/services/base/BaseRepository";
import type { Database } from "@/types/database.types";
import type {
  SignatureTemplate,
  SignatureTemplateType,
  SignerRole,
  SigningOrder,
  CreateSignatureTemplateInput,
  UpdateSignatureTemplateInput,
} from "@/types/signature.types";

// Database row type
type SignatureTemplateRow =
  Database["public"]["Tables"]["signature_templates"]["Row"];

export class SignatureTemplateRepository extends BaseRepository<
  SignatureTemplate,
  CreateSignatureTemplateInput,
  UpdateSignatureTemplateInput
> {
  constructor() {
    super("signature_templates");
  }

  /**
   * Find templates by agency ID
   */
  async findByAgencyId(agencyId: string): Promise<SignatureTemplate[]> {
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
   * Find active templates by agency ID
   */
  async findActiveByAgencyId(agencyId: string): Promise<SignatureTemplate[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("agency_id", agencyId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findActiveByAgencyId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find templates by type
   */
  async findByType(
    agencyId: string,
    templateType: SignatureTemplateType,
  ): Promise<SignatureTemplate[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("agency_id", agencyId)
      .eq("template_type", templateType)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findByType");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find template by DocuSeal template ID
   */
  async findByDocuSealId(
    docusealTemplateId: number,
  ): Promise<SignatureTemplate | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("docuseal_template_id", docusealTemplateId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByDocuSealId");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Activate/deactivate a template
   */
  async setActive(id: string, isActive: boolean): Promise<SignatureTemplate> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "setActive");
    }

    return this.transformFromDB(data);
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): SignatureTemplate {
    const row = dbRecord as SignatureTemplateRow;
    return {
      id: row.id,
      agencyId: row.agency_id,
      imoId: row.imo_id,
      name: row.name,
      description: row.description,
      templateType: row.template_type as SignatureTemplateType,
      docusealTemplateId: row.docuseal_template_id,
      docusealTemplateSlug: row.docuseal_template_slug,
      requiredSignerRoles: (row.required_signer_roles || []) as SignerRole[],
      signingOrder: (row.signing_order || "any") as SigningOrder,
      isActive: row.is_active ?? true,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data: CreateSignatureTemplateInput | UpdateSignatureTemplateInput,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdateSignatureTemplateInput;
      const dbData: Record<string, unknown> = {};

      if (updateData.name !== undefined) dbData.name = updateData.name;
      if (updateData.description !== undefined)
        dbData.description = updateData.description;
      if (updateData.templateType !== undefined)
        dbData.template_type = updateData.templateType;
      if (updateData.docusealTemplateId !== undefined)
        dbData.docuseal_template_id = updateData.docusealTemplateId;
      if (updateData.docusealTemplateSlug !== undefined)
        dbData.docuseal_template_slug = updateData.docusealTemplateSlug;
      if (updateData.requiredSignerRoles !== undefined)
        dbData.required_signer_roles = updateData.requiredSignerRoles;
      if (updateData.signingOrder !== undefined)
        dbData.signing_order = updateData.signingOrder;
      if (updateData.isActive !== undefined)
        dbData.is_active = updateData.isActive;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreateSignatureTemplateInput;
    return {
      agency_id: createData.agencyId,
      imo_id: createData.imoId,
      name: createData.name,
      description: createData.description,
      template_type: createData.templateType,
      docuseal_template_id: createData.docusealTemplateId,
      docuseal_template_slug: createData.docusealTemplateSlug,
      required_signer_roles: createData.requiredSignerRoles || [],
      signing_order: createData.signingOrder || "any",
      created_by: createData.createdBy,
    };
  }
}

// Singleton instance
export const signatureTemplateRepository = new SignatureTemplateRepository();
