// src/hooks/signatures/useSignatureTemplates.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signatureTemplateService } from "@/services/signatures";
import type {
  SignatureTemplateType,
  CreateSignatureTemplateInput,
  UpdateSignatureTemplateInput,
} from "@/types/signature.types";
import { logger } from "@/services/base/logger";

// Query keys for React Query cache management
export const signatureTemplateQueryKeys = {
  all: ["signatureTemplates"] as const,
  lists: () => [...signatureTemplateQueryKeys.all, "list"] as const,
  listByAgency: (agencyId: string) =>
    [...signatureTemplateQueryKeys.lists(), agencyId] as const,
  listActiveByAgency: (agencyId: string) =>
    [...signatureTemplateQueryKeys.lists(), agencyId, "active"] as const,
  listByType: (agencyId: string, type: SignatureTemplateType) =>
    [...signatureTemplateQueryKeys.lists(), agencyId, "type", type] as const,
  detail: (id: string) =>
    [...signatureTemplateQueryKeys.all, "detail", id] as const,
};

/**
 * Hook to fetch all signature templates for an agency
 */
export function useAgencySignatureTemplates(
  agencyId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  },
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = false,
  } = options || {};

  return useQuery({
    queryKey: signatureTemplateQueryKeys.listByAgency(agencyId || ""),
    queryFn: async () => {
      if (!agencyId) throw new Error("Agency ID is required");
      const result = await signatureTemplateService.getByAgencyId(agencyId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to fetch signature templates",
      );
    },
    enabled: enabled && !!agencyId,
    staleTime,
    refetchOnWindowFocus,
  });
}

/**
 * Hook to fetch active signature templates for an agency
 */
export function useActiveSignatureTemplates(
  agencyId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options || {};

  return useQuery({
    queryKey: signatureTemplateQueryKeys.listActiveByAgency(agencyId || ""),
    queryFn: async () => {
      if (!agencyId) throw new Error("Agency ID is required");
      const result =
        await signatureTemplateService.getActiveByAgencyId(agencyId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to fetch active signature templates",
      );
    },
    enabled: enabled && !!agencyId,
    staleTime,
  });
}

/**
 * Hook to fetch signature templates by type
 */
export function useSignatureTemplatesByType(
  agencyId: string | undefined,
  templateType: SignatureTemplateType,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options || {};

  return useQuery({
    queryKey: signatureTemplateQueryKeys.listByType(
      agencyId || "",
      templateType,
    ),
    queryFn: async () => {
      if (!agencyId) throw new Error("Agency ID is required");
      const result = await signatureTemplateService.getByType(
        agencyId,
        templateType,
      );
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message ||
          `Failed to fetch ${templateType} signature templates`,
      );
    },
    enabled: enabled && !!agencyId,
    staleTime,
  });
}

/**
 * Hook to fetch a signature template by ID
 */
export function useSignatureTemplate(
  templateId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options || {};

  return useQuery({
    queryKey: signatureTemplateQueryKeys.detail(templateId || ""),
    queryFn: async () => {
      if (!templateId) throw new Error("Template ID is required");
      const result = await signatureTemplateService.getById(templateId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to fetch signature template",
      );
    },
    enabled: enabled && !!templateId,
    staleTime,
  });
}

/**
 * Hook to create a signature template
 */
export function useCreateSignatureTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSignatureTemplateInput) => {
      const result = await signatureTemplateService.create(data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to create signature template",
      );
    },
    onSuccess: (newTemplate) => {
      // Invalidate all lists for this agency
      queryClient.invalidateQueries({
        queryKey: signatureTemplateQueryKeys.listByAgency(newTemplate.agencyId),
      });
      // Add to cache
      queryClient.setQueryData(
        signatureTemplateQueryKeys.detail(newTemplate.id),
        newTemplate,
      );
    },
    onError: (error) => {
      logger.error(
        "Error creating signature template",
        error instanceof Error ? error : new Error(String(error)),
        "useSignatureTemplates",
      );
    },
  });
}

/**
 * Hook to update a signature template
 */
export function useUpdateSignatureTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSignatureTemplateInput;
    }) => {
      const result = await signatureTemplateService.update(id, data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to update signature template",
      );
    },
    onSuccess: (updatedTemplate) => {
      // Update the specific template in cache
      queryClient.setQueryData(
        signatureTemplateQueryKeys.detail(updatedTemplate.id),
        updatedTemplate,
      );
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: signatureTemplateQueryKeys.listByAgency(
          updatedTemplate.agencyId,
        ),
      });
    },
    onError: (error) => {
      logger.error(
        "Error updating signature template",
        error instanceof Error ? error : new Error(String(error)),
        "useSignatureTemplates",
      );
    },
  });
}

/**
 * Hook to delete (deactivate) a signature template
 */
export function useDeactivateSignatureTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await signatureTemplateService.deactivate(id);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to deactivate signature template",
      );
    },
    onSuccess: (deactivatedTemplate) => {
      // Update in cache
      queryClient.setQueryData(
        signatureTemplateQueryKeys.detail(deactivatedTemplate.id),
        deactivatedTemplate,
      );
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: signatureTemplateQueryKeys.listByAgency(
          deactivatedTemplate.agencyId,
        ),
      });
    },
    onError: (error) => {
      logger.error(
        "Error deactivating signature template",
        error instanceof Error ? error : new Error(String(error)),
        "useSignatureTemplates",
      );
    },
  });
}
