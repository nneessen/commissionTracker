// src/services/signatures/docusealEdgeFunctionClient.ts
// Browser-side client to call the DocuSeal Edge Function

import { supabase } from "@/services/base/supabase";
import { logger } from "@/services/base/logger";

/**
 * Submitter data for creating a DocuSeal submission
 */
export interface DocuSealSubmitterInput {
  email: string;
  name?: string;
  role?: string;
  phone?: string;
  values?: Record<string, string>;
  send_email?: boolean;
}

/**
 * Request to create a DocuSeal submission
 */
export interface CreateDocuSealSubmissionRequest {
  template_id: number;
  submitters: DocuSealSubmitterInput[];
  send_email?: boolean;
  message?: {
    subject?: string;
    body?: string;
  };
  expire_at?: string;
}

/**
 * DocuSeal submitter response (from API)
 */
export interface DocuSealSubmitterResponse {
  id: number;
  submission_id: number;
  uuid: string;
  email: string;
  name?: string;
  phone?: string;
  status: "pending" | "sent" | "opened" | "completed" | "declined";
  role?: string;
  completed_at?: string;
  opened_at?: string;
  sent_at?: string;
  declined_at?: string;
  embed_src?: string;
  values?: Record<string, unknown>[];
  documents?: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * DocuSeal submission response (from API)
 */
export interface DocuSealSubmissionResponse {
  id: number;
  source: string;
  submitters_order: string;
  slug: string;
  audit_log_url?: string;
  combined_document_url?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  status: "pending" | "completed" | "expired";
  submitters: DocuSealSubmitterResponse[];
  template: {
    id: number;
    name: string;
    external_id?: string;
    folder_name?: string;
    created_at: string;
    updated_at: string;
  };
  created_by_user?: {
    id: number;
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

/**
 * DocuSeal template response (from API)
 */
export interface DocuSealTemplateResponse {
  id: number;
  slug: string;
  name: string;
  schema: Array<{
    name: string;
    submitter_type: string;
  }>;
  fields: Array<{
    name: string;
    uuid: string;
    required: boolean;
    type: string;
  }>;
  folder_name?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Client for calling DocuSeal API via Edge Function
 */
export const docusealEdgeFunctionClient = {
  /**
   * Create a new signature submission
   */
  async createSubmission(
    request: CreateDocuSealSubmissionRequest,
  ): Promise<DocuSealSubmissionResponse> {
    logger.info(
      "Creating DocuSeal submission",
      {
        templateId: request.template_id,
        submitterCount: request.submitters.length,
      },
      "docusealClient",
    );

    const { data, error } = await supabase.functions.invoke("docuseal", {
      body: {
        action: "create-submission",
        data: request,
      },
    });

    if (error) {
      // Try to extract more details from the response
      const errorDetails = data?.details || data?.error || error.message;
      logger.error(
        "Failed to create DocuSeal submission",
        { error, data, details: errorDetails },
        "docusealClient",
      );
      throw new Error(
        `Failed to create submission: ${JSON.stringify(errorDetails)}`,
      );
    }

    if (data?.error) {
      const errorDetails = data.details || data.error;
      logger.error(
        "DocuSeal API error",
        { error: data.error, details: data.details },
        "docusealClient",
      );
      throw new Error(`DocuSeal error: ${JSON.stringify(errorDetails)}`);
    }

    logger.info(
      "DocuSeal submission created",
      {
        submissionId: data.id,
      },
      "docusealClient",
    );

    return data as DocuSealSubmissionResponse;
  },

  /**
   * Get submission status by ID
   */
  async getSubmission(
    submissionId: number,
  ): Promise<DocuSealSubmissionResponse> {
    logger.info(
      "Getting DocuSeal submission",
      {
        submissionId,
      },
      "docusealClient",
    );

    const { data, error } = await supabase.functions.invoke("docuseal", {
      body: {
        action: "get-submission",
        submission_id: submissionId,
      },
    });

    if (error) {
      logger.error(
        "Failed to get DocuSeal submission",
        error,
        "docusealClient",
      );
      throw new Error(`Failed to get submission: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as DocuSealSubmissionResponse;
  },

  /**
   * List all templates
   */
  async listTemplates(): Promise<DocuSealTemplateResponse[]> {
    logger.info("Listing DocuSeal templates", "docusealClient");

    const { data, error } = await supabase.functions.invoke("docuseal", {
      body: {
        action: "list-templates",
      },
    });

    if (error) {
      logger.error(
        "Failed to list DocuSeal templates",
        error,
        "docusealClient",
      );
      throw new Error(`Failed to list templates: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as DocuSealTemplateResponse[];
  },

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: number): Promise<DocuSealTemplateResponse> {
    logger.info("Getting DocuSeal template", { templateId }, "docusealClient");

    const { data, error } = await supabase.functions.invoke("docuseal", {
      body: {
        action: "get-template",
        template_id: templateId,
      },
    });

    if (error) {
      logger.error("Failed to get DocuSeal template", error, "docusealClient");
      throw new Error(`Failed to get template: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data as DocuSealTemplateResponse;
  },

  /**
   * Archive (void) a submission
   */
  async archiveSubmission(submissionId: number): Promise<void> {
    logger.info(
      "Archiving DocuSeal submission",
      {
        submissionId,
      },
      "docusealClient",
    );

    const { data, error } = await supabase.functions.invoke("docuseal", {
      body: {
        action: "archive-submission",
        submission_id: submissionId,
      },
    });

    if (error) {
      logger.error(
        "Failed to archive DocuSeal submission",
        error,
        "docusealClient",
      );
      throw new Error(`Failed to archive submission: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    logger.info(
      "DocuSeal submission archived",
      {
        submissionId,
      },
      "docusealClient",
    );
  },
};
