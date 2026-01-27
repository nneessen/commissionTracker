// src/features/training-hub/hooks/useTrainingDocuments.ts
/**
 * TanStack Query hooks for training document operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingDocumentService } from "../services/trainingDocumentService";
import type {
  TrainingDocumentFilters,
  TrainingDocumentCategory,
  UpdateTrainingDocumentParams,
} from "../types/training-document.types";

// Query keys
export const trainingDocumentKeys = {
  all: ["training-documents"] as const,
  lists: () => [...trainingDocumentKeys.all, "list"] as const,
  list: (filters?: TrainingDocumentFilters) =>
    [...trainingDocumentKeys.lists(), filters] as const,
  details: () => [...trainingDocumentKeys.all, "detail"] as const,
  detail: (id: string) => [...trainingDocumentKeys.details(), id] as const,
  counts: () => [...trainingDocumentKeys.all, "counts"] as const,
  countsByCategory: () =>
    [...trainingDocumentKeys.counts(), "by-category"] as const,
  url: (storagePath: string) =>
    [...trainingDocumentKeys.all, "url", storagePath] as const,
};

/**
 * Fetch list of training documents with optional filters
 */
export function useTrainingDocuments(filters?: TrainingDocumentFilters) {
  return useQuery({
    queryKey: trainingDocumentKeys.list(filters),
    queryFn: () => trainingDocumentService.list(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single training document by ID
 */
export function useTrainingDocument(id: string | undefined) {
  return useQuery({
    queryKey: trainingDocumentKeys.detail(id!),
    queryFn: () => trainingDocumentService.getById(id!),
    enabled: !!id,
  });
}

/**
 * Fetch total document count
 */
export function useTrainingDocumentCount(filters?: TrainingDocumentFilters) {
  return useQuery({
    queryKey: [...trainingDocumentKeys.counts(), filters],
    queryFn: () => trainingDocumentService.getCount(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch document counts grouped by category
 */
export function useTrainingDocumentCountsByCategory() {
  return useQuery({
    queryKey: trainingDocumentKeys.countsByCategory(),
    queryFn: () => trainingDocumentService.getCountsByCategory(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Upload a new training document
 */
export function useUploadTrainingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      name,
      description,
      category,
      tags,
      uploadedBy,
    }: {
      file: File;
      name: string;
      description?: string;
      category: TrainingDocumentCategory;
      tags?: string[];
      uploadedBy: string;
    }) =>
      trainingDocumentService.upload({
        file,
        name,
        description,
        category,
        tags,
        uploadedBy,
      }),
    onSuccess: () => {
      // Invalidate all document queries
      queryClient.invalidateQueries({
        queryKey: trainingDocumentKeys.all,
      });
    },
  });
}

/**
 * Update training document metadata
 */
export function useUpdateTrainingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...params
    }: UpdateTrainingDocumentParams & { id: string }) =>
      trainingDocumentService.update(id, params),
    onSuccess: (data) => {
      // Update the specific document in cache
      queryClient.setQueryData(trainingDocumentKeys.detail(data.id), data);
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: trainingDocumentKeys.lists(),
      });
    },
  });
}

/**
 * Delete a training document
 */
export function useDeleteTrainingDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => trainingDocumentService.delete(id),
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({
        queryKey: trainingDocumentKeys.detail(id),
      });
      // Invalidate all list and count queries
      queryClient.invalidateQueries({
        queryKey: trainingDocumentKeys.all,
      });
    },
  });
}

/**
 * Get a signed URL for viewing/downloading a document
 */
export function useTrainingDocumentUrl(storagePath: string | null) {
  return useQuery({
    queryKey: trainingDocumentKeys.url(storagePath!),
    queryFn: () => trainingDocumentService.getSignedUrl(storagePath!),
    enabled: !!storagePath,
    staleTime: 1000 * 60 * 30, // 30 minutes (URL valid for 1 hour)
  });
}

/**
 * Download a document as a blob (for attaching to emails, etc.)
 */
export function useDownloadTrainingDocument() {
  return useMutation({
    mutationFn: (storagePath: string) =>
      trainingDocumentService.download(storagePath),
  });
}
