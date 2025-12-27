// src/services/signatures/DocuSealApiClient.ts
// API client wrapper for DocuSeal e-signature service

import type {
  DocuSealSubmission,
  DocuSealTemplate,
  CreateDocuSealSubmissionRequest,
} from "@/types/signature.types";
import { logger } from "@/services/base/logger";

// DocuSeal API configuration
const DOCUSEAL_API_BASE_URL = "https://api.docuseal.com";

// Environment variable for API key (set in Supabase Edge Functions or .env)
// For client-side, we'll use Supabase Edge Functions as a proxy
const getApiKey = (): string => {
  // In a browser environment, we won't have direct access to the API key
  // API calls should go through Supabase Edge Functions
  if (typeof window !== "undefined") {
    throw new Error(
      "DocuSeal API calls should be made through Supabase Edge Functions on the client side",
    );
  }
  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) {
    throw new Error("DOCUSEAL_API_KEY environment variable is not set");
  }
  return apiKey;
};

interface DocuSealApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * DocuSeal API client for server-side usage (Edge Functions)
 */
export const docuSealApiClient = {
  /**
   * Make an authenticated request to the DocuSeal API
   */
  async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
      apiKey?: string;
    } = {},
  ): Promise<DocuSealApiResponse<T>> {
    const { method = "GET", body, apiKey } = options;
    const key = apiKey || getApiKey();

    try {
      const response = await fetch(`${DOCUSEAL_API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          "X-Auth-Token": key,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const status = response.status;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `DocuSeal API error: ${status} - ${errorText}`,
          new Error(errorText),
          "DocuSealApiClient",
        );
        return { error: errorText, status };
      }

      const data = await response.json();
      return { data, status };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `DocuSeal API request failed: ${message}`,
        error instanceof Error ? error : new Error(message),
        "DocuSealApiClient",
      );
      return { error: message, status: 0 };
    }
  },

  // =========================================================================
  // Templates API
  // =========================================================================

  /**
   * List all templates
   */
  async listTemplates(
    apiKey?: string,
  ): Promise<DocuSealApiResponse<DocuSealTemplate[]>> {
    return this.request<DocuSealTemplate[]>("/templates", { apiKey });
  },

  /**
   * Get a template by ID
   */
  async getTemplate(
    templateId: number,
    apiKey?: string,
  ): Promise<DocuSealApiResponse<DocuSealTemplate>> {
    return this.request<DocuSealTemplate>(`/templates/${templateId}`, {
      apiKey,
    });
  },

  // =========================================================================
  // Submissions API
  // =========================================================================

  /**
   * Create a new submission (signature request)
   */
  async createSubmission(
    request: CreateDocuSealSubmissionRequest,
    apiKey?: string,
  ): Promise<DocuSealApiResponse<DocuSealSubmission>> {
    return this.request<DocuSealSubmission>("/submissions", {
      method: "POST",
      body: request,
      apiKey,
    });
  },

  /**
   * Get a submission by ID
   */
  async getSubmission(
    submissionId: number,
    apiKey?: string,
  ): Promise<DocuSealApiResponse<DocuSealSubmission>> {
    return this.request<DocuSealSubmission>(`/submissions/${submissionId}`, {
      apiKey,
    });
  },

  /**
   * List submissions with optional filters
   */
  async listSubmissions(
    options?: {
      status?: string;
      limit?: number;
      after?: number;
    },
    apiKey?: string,
  ): Promise<DocuSealApiResponse<DocuSealSubmission[]>> {
    const params = new URLSearchParams();
    if (options?.status) params.append("status", options.status);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.after) params.append("after", options.after.toString());

    const queryString = params.toString();
    const endpoint = queryString
      ? `/submissions?${queryString}`
      : "/submissions";

    return this.request<DocuSealSubmission[]>(endpoint, { apiKey });
  },

  /**
   * Archive (void) a submission
   */
  async archiveSubmission(
    submissionId: number,
    apiKey?: string,
  ): Promise<DocuSealApiResponse<{ id: number }>> {
    return this.request<{ id: number }>(`/submissions/${submissionId}`, {
      method: "DELETE",
      apiKey,
    });
  },

  // =========================================================================
  // Submitters API
  // =========================================================================

  /**
   * Get submitter embed URL for inline signing
   */
  async getSubmitterEmbedUrl(
    submitterId: number,
    apiKey?: string,
  ): Promise<DocuSealApiResponse<{ embed_src: string }>> {
    return this.request<{ embed_src: string }>(`/submitters/${submitterId}`, {
      apiKey,
    });
  },

  /**
   * Resend signing invitation email to a submitter
   */
  async resendSubmitterEmail(
    submitterId: number,
    apiKey?: string,
  ): Promise<DocuSealApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(
      `/submitters/${submitterId}/send_email`,
      {
        method: "POST",
        apiKey,
      },
    );
  },

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Build a submission request with proper field mappings
   */
  buildSubmissionRequest(params: {
    templateId: number;
    submitters: Array<{
      email: string;
      name?: string;
      role?: string;
      fields?: Record<string, string>;
    }>;
    sendEmail?: boolean;
    message?: {
      subject?: string;
      body?: string;
    };
    expiresAt?: Date;
  }): CreateDocuSealSubmissionRequest {
    return {
      template_id: params.templateId,
      submitters: params.submitters.map((s) => ({
        email: s.email,
        name: s.name,
        role: s.role || "Signer",
        values: s.fields,
        send_email: params.sendEmail ?? true,
      })),
      send_email: params.sendEmail ?? true,
      message: params.message,
      expire_at: params.expiresAt?.toISOString(),
    };
  },
};

// Type export for the client
export type DocuSealApiClient = typeof docuSealApiClient;
