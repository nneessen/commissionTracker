// src/services/signatures/SignatureTemplateService.ts
import { BaseService, type ServiceResponse } from "@/services/base/BaseService";
import {
  SignatureTemplateRepository,
  signatureTemplateRepository,
} from "./repositories/SignatureTemplateRepository";
import type {
  SignatureTemplate,
  SignatureTemplateType,
  CreateSignatureTemplateInput,
  UpdateSignatureTemplateInput,
} from "@/types/signature.types";

export class SignatureTemplateService extends BaseService<
  SignatureTemplate,
  CreateSignatureTemplateInput,
  UpdateSignatureTemplateInput
> {
  constructor(repository: SignatureTemplateRepository) {
    super(repository);
  }

  /**
   * Initialize validation rules for templates
   */
  protected initializeValidationRules(): void {
    this.validationRules = [
      {
        field: "name",
        validate: (value) =>
          typeof value === "string" && value.trim().length > 0,
        message: "Template name is required",
      },
      {
        field: "agencyId",
        validate: (value) => typeof value === "string" && value.length > 0,
        message: "Agency ID is required",
      },
      {
        field: "templateType",
        validate: (value) =>
          [
            "agent_contract",
            "independent_agreement",
            "custom",
            "user_signup",
          ].includes(value as string),
        message: "Invalid template type",
      },
    ];
  }

  /**
   * Get templates by agency ID
   */
  async getByAgencyId(
    agencyId: string,
  ): Promise<ServiceResponse<SignatureTemplate[]>> {
    try {
      const repo = this.repository as SignatureTemplateRepository;
      const templates = await repo.findByAgencyId(agencyId);
      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get active templates by agency ID
   */
  async getActiveByAgencyId(
    agencyId: string,
  ): Promise<ServiceResponse<SignatureTemplate[]>> {
    try {
      const repo = this.repository as SignatureTemplateRepository;
      const templates = await repo.findActiveByAgencyId(agencyId);
      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get templates by type
   */
  async getByType(
    agencyId: string,
    templateType: SignatureTemplateType,
  ): Promise<ServiceResponse<SignatureTemplate[]>> {
    try {
      const repo = this.repository as SignatureTemplateRepository;
      const templates = await repo.findByType(agencyId, templateType);
      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get template by DocuSeal template ID
   */
  async getByDocuSealId(
    docusealTemplateId: number,
  ): Promise<ServiceResponse<SignatureTemplate>> {
    try {
      const repo = this.repository as SignatureTemplateRepository;
      const template = await repo.findByDocuSealId(docusealTemplateId);

      if (!template) {
        return {
          success: false,
          error: new Error("Template not found"),
        };
      }

      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Activate a template
   */
  async activate(id: string): Promise<ServiceResponse<SignatureTemplate>> {
    try {
      const repo = this.repository as SignatureTemplateRepository;
      const template = await repo.setActive(id, true);
      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Deactivate a template
   */
  async deactivate(id: string): Promise<ServiceResponse<SignatureTemplate>> {
    try {
      const repo = this.repository as SignatureTemplateRepository;
      const template = await repo.setActive(id, false);
      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

// Singleton instance
export const signatureTemplateService = new SignatureTemplateService(
  signatureTemplateRepository,
);
