// src/services/signatures/SignatureSubmissionService.ts
import { BaseService, type ServiceResponse } from "@/services/base/BaseService";
import { logger } from "@/services/base/logger";
import {
  SignatureSubmissionRepository,
  signatureSubmissionRepository,
} from "./repositories/SignatureSubmissionRepository";
import { signatureSubmitterRepository } from "./repositories/SignatureSubmitterRepository";
import { signatureTemplateRepository } from "./repositories/SignatureTemplateRepository";
import {
  docusealEdgeFunctionClient,
  type DocuSealSubmitterInput,
} from "./docusealEdgeFunctionClient";
import type {
  SignatureSubmission,
  SignatureSubmitter,
  SignatureTemplate,
  SubmissionStatus,
  SignerRole,
  CreateSignatureSubmissionInput,
  UpdateSignatureSubmissionInput,
  SignatureRequiredResponse,
  SignatureSubmitterSummary,
} from "@/types/signature.types";

interface SubmitterInput {
  userId?: string;
  role: SignerRole;
  email: string;
  name?: string;
  signingOrder?: number;
}

interface CreateSubmissionWithSubmittersInput extends CreateSignatureSubmissionInput {
  submitters: SubmitterInput[];
}

export interface SubmissionWithDetails extends SignatureSubmission {
  template?: SignatureTemplate;
  submitters?: SignatureSubmitter[];
}

export class SignatureSubmissionService extends BaseService<
  SignatureSubmission,
  CreateSignatureSubmissionInput,
  UpdateSignatureSubmissionInput
> {
  constructor(repository: SignatureSubmissionRepository) {
    super(repository);
  }

  /**
   * Initialize validation rules for submissions
   */
  protected initializeValidationRules(): void {
    this.validationRules = [
      {
        field: "agencyId",
        validate: (value) => typeof value === "string" && value.length > 0,
        message: "Agency ID is required",
      },
      {
        field: "templateId",
        validate: (value) => typeof value === "string" && value.length > 0,
        message: "Template ID is required",
      },
    ];
  }

  /**
   * Create a submission with submitters
   * This method:
   * 1. Validates the template exists and has a DocuSeal template ID
   * 2. Calls DocuSeal API to create the submission
   * 3. Creates local DB records with DocuSeal IDs and embed URLs
   */
  async createWithSubmitters(
    input: CreateSubmissionWithSubmittersInput,
  ): Promise<ServiceResponse<SubmissionWithDetails>> {
    try {
      // Validate template exists
      const template = await signatureTemplateRepository.findById(
        input.templateId,
      );
      if (!template) {
        return {
          success: false,
          error: new Error("Template not found"),
        };
      }

      // Validate template has DocuSeal template ID
      if (!template.docusealTemplateId) {
        return {
          success: false,
          error: new Error(
            "Template is not linked to a DocuSeal template. Please configure the DocuSeal template ID.",
          ),
        };
      }

      // Validate submitters
      if (!input.submitters || input.submitters.length === 0) {
        return {
          success: false,
          error: new Error("At least one submitter is required"),
        };
      }

      // Build DocuSeal submitters with role mapping
      // DocuSeal expects role names that match the template's submitter types
      const docusealSubmitters: DocuSealSubmitterInput[] = input.submitters.map(
        (submitter) => ({
          email: submitter.email,
          name: submitter.name,
          // Use the role name directly - templates should be configured with matching roles
          role: submitter.role,
          send_email: true,
        }),
      );

      logger.info(
        "Creating DocuSeal submission",
        {
          templateId: template.docusealTemplateId,
          submitterCount: docusealSubmitters.length,
        },
        "SignatureSubmissionService",
      );

      // Call DocuSeal API FIRST - fail fast if API is unavailable
      let docusealResponse;
      try {
        docusealResponse = await docusealEdgeFunctionClient.createSubmission({
          template_id: template.docusealTemplateId,
          submitters: docusealSubmitters,
          send_email: true,
          expire_at: input.expiresAt,
        });
      } catch (apiError) {
        logger.error(
          "DocuSeal API call failed",
          apiError instanceof Error ? apiError : new Error(String(apiError)),
          "SignatureSubmissionService",
        );
        return {
          success: false,
          error: new Error(
            `Failed to create signature request: ${apiError instanceof Error ? apiError.message : "DocuSeal API error"}`,
          ),
        };
      }

      logger.info(
        "DocuSeal submission created successfully",
        {
          docusealSubmissionId: docusealResponse.id,
          submitterCount: docusealResponse.submitters.length,
        },
        "SignatureSubmissionService",
      );

      // Create the local submission record with DocuSeal ID
      const repo = this.repository as SignatureSubmissionRepository;
      let submission: SignatureSubmission;
      try {
        submission = await repo.create({
          ...input,
          docusealSubmissionId: docusealResponse.id,
        } as CreateSignatureSubmissionInput & { docusealSubmissionId: number });
      } catch (dbError) {
        // API succeeded but DB failed - log for manual reconciliation
        logger.error(
          "DB write failed after DocuSeal success - manual reconciliation needed",
          dbError instanceof Error ? dbError : new Error(String(dbError)),
          "SignatureSubmissionService",
        );
        throw dbError;
      }

      // Map DocuSeal submitter IDs to our submitters and create records
      const submittersWithDocuSealIds = input.submitters.map(
        (submitter, index) => {
          const docusealSubmitter = docusealResponse.submitters[index];
          return {
            ...submitter,
            docusealSubmitterId: docusealSubmitter?.id,
            embedUrl: docusealSubmitter?.embed_src,
          };
        },
      );

      // Create submitter records with DocuSeal IDs
      const submitters =
        await signatureSubmitterRepository.createManyForSubmission(
          submission.id,
          submittersWithDocuSealIds.map((s) => ({
            userId: s.userId,
            role: s.role,
            email: s.email,
            name: s.name,
            signingOrder: s.signingOrder,
          })),
        );

      // Update submitters with embed URLs from DocuSeal response
      for (let i = 0; i < submitters.length; i++) {
        const docusealSubmitter = docusealResponse.submitters[i];
        if (docusealSubmitter?.embed_src) {
          await signatureSubmitterRepository.updateEmbedUrl(
            submitters[i].id,
            docusealSubmitter.embed_src,
          );
          submitters[i].embedUrl = docusealSubmitter.embed_src;
        }
        if (docusealSubmitter?.id) {
          await signatureSubmitterRepository.updateStatus(
            submitters[i].id,
            "sent",
            {
              docusealSubmitterId: docusealSubmitter.id,
            },
          );
          submitters[i].docusealSubmitterId = docusealSubmitter.id;
          submitters[i].status = "sent";
        }
      }

      logger.info(
        "Signature submission created successfully",
        {
          submissionId: submission.id,
          docusealSubmissionId: docusealResponse.id,
        },
        "SignatureSubmissionService",
      );

      return {
        success: true,
        data: {
          ...submission,
          docusealSubmissionId: docusealResponse.id,
          template,
          submitters,
        },
      };
    } catch (error) {
      logger.error(
        "Failed to create submission with submitters",
        error instanceof Error ? error : new Error(String(error)),
        "SignatureSubmissionService",
      );
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get submission by ID with all details
   */
  async getWithDetails(
    id: string,
  ): Promise<ServiceResponse<SubmissionWithDetails>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submission = await repo.findById(id);

      if (!submission) {
        return {
          success: false,
          error: new Error("Submission not found"),
        };
      }

      const [template, submitters] = await Promise.all([
        signatureTemplateRepository.findById(submission.templateId),
        signatureSubmitterRepository.findBySubmissionId(submission.id),
      ]);

      return {
        success: true,
        data: {
          ...submission,
          template: template || undefined,
          submitters,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get submissions by target user ID
   */
  async getByTargetUserId(
    userId: string,
  ): Promise<ServiceResponse<SignatureSubmission[]>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submissions = await repo.findByTargetUserId(userId);
      return { success: true, data: submissions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get submission by checklist progress ID
   */
  async getByChecklistProgressId(
    checklistProgressId: string,
  ): Promise<ServiceResponse<SubmissionWithDetails>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submission =
        await repo.findByChecklistProgressId(checklistProgressId);

      if (!submission) {
        return {
          success: false,
          error: new Error("Submission not found"),
        };
      }

      const submitters = await signatureSubmitterRepository.findBySubmissionId(
        submission.id,
      );

      return {
        success: true,
        data: {
          ...submission,
          submitters,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get submission by DocuSeal submission ID
   */
  async getByDocuSealId(
    docusealSubmissionId: number,
  ): Promise<ServiceResponse<SubmissionWithDetails>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submission = await repo.findByDocuSealId(docusealSubmissionId);

      if (!submission) {
        return {
          success: false,
          error: new Error("Submission not found"),
        };
      }

      const submitters = await signatureSubmitterRepository.findBySubmissionId(
        submission.id,
      );

      return {
        success: true,
        data: {
          ...submission,
          submitters,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get pending submissions for a user
   */
  async getPendingForUser(
    userId: string,
  ): Promise<ServiceResponse<SignatureSubmission[]>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submissions = await repo.findPendingForUser(userId);
      return { success: true, data: submissions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update submission status
   */
  async updateStatus(
    id: string,
    status: SubmissionStatus,
    additionalUpdates?: Partial<UpdateSignatureSubmissionInput>,
  ): Promise<ServiceResponse<SignatureSubmission>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submission = await repo.updateStatus(id, status, additionalUpdates);
      return { success: true, data: submission };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Void a submission
   */
  async voidSubmission(
    id: string,
    voidedBy: string,
    reason?: string,
  ): Promise<ServiceResponse<SignatureSubmission>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submission = await repo.voidSubmission(id, voidedBy, reason);
      return { success: true, data: submission };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Check if all submitters have signed
   */
  async checkAllSigned(submissionId: string): Promise<boolean> {
    const submitters =
      await signatureSubmitterRepository.findBySubmissionId(submissionId);
    return submitters.every((s) => s.status === "completed");
  }

  /**
   * Check if any submitter has declined
   */
  async checkAnyDeclined(submissionId: string): Promise<boolean> {
    const submitters =
      await signatureSubmitterRepository.findBySubmissionId(submissionId);
    return submitters.some((s) => s.status === "declined");
  }

  /**
   * Build response data for checklist integration
   */
  async buildChecklistResponse(
    submissionId: string,
  ): Promise<ServiceResponse<SignatureRequiredResponse>> {
    try {
      const repo = this.repository as SignatureSubmissionRepository;
      const submission = await repo.findById(submissionId);

      if (!submission) {
        return {
          success: false,
          error: new Error("Submission not found"),
        };
      }

      const submitters =
        await signatureSubmitterRepository.findBySubmissionId(submissionId);

      const signers: SignatureSubmitterSummary[] = submitters.map((s) => ({
        role: s.role,
        user_id: s.userId,
        email: s.email,
        name: s.name,
        status: s.status,
        signed_at: s.signedAt ?? undefined,
        declined_at: s.declinedAt ?? undefined,
      }));

      const response: SignatureRequiredResponse = {
        submission_id: submission.id,
        docuseal_submission_id: submission.docusealSubmissionId ?? 0,
        status: submission.status,
        signers,
        audit_log_url: submission.auditLogUrl ?? undefined,
        combined_document_url: submission.combinedDocumentUrl ?? undefined,
        completed_at: submission.completedAt ?? undefined,
        initiated_at: submission.createdAt ?? new Date().toISOString(),
      };

      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

// Singleton instance
export const signatureSubmissionService = new SignatureSubmissionService(
  signatureSubmissionRepository,
);
