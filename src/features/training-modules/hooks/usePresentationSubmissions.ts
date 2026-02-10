// src/features/training-modules/hooks/usePresentationSubmissions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { presentationSubmissionService } from "../services/presentationSubmissionService";
import type { PresentationSubmissionFilters } from "../types/training-module.types";

export const presentationKeys = {
  all: ["presentation-submissions"] as const,
  lists: () => [...presentationKeys.all, "list"] as const,
  list: (filters?: PresentationSubmissionFilters) =>
    [...presentationKeys.lists(), filters] as const,
  details: () => [...presentationKeys.all, "detail"] as const,
  detail: (id: string) => [...presentationKeys.details(), id] as const,
  compliance: (agencyId: string, weekStart: string) =>
    [...presentationKeys.all, "compliance", agencyId, weekStart] as const,
  signedUrl: (path: string) =>
    [...presentationKeys.all, "url", path] as const,
};

/**
 * List presentation submissions with filters
 */
export function usePresentationSubmissions(filters?: PresentationSubmissionFilters) {
  return useQuery({
    queryKey: presentationKeys.list(filters),
    queryFn: () => presentationSubmissionService.list(filters),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get a single presentation submission by ID
 */
export function usePresentationSubmission(id: string | undefined) {
  return useQuery({
    queryKey: presentationKeys.detail(id!),
    queryFn: () => presentationSubmissionService.getById(id!),
    enabled: !!id,
  });
}

/**
 * Submit a new presentation (upload + DB insert)
 */
export function useSubmitPresentation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: presentationSubmissionService.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
}

/**
 * Review a presentation submission (manager action)
 */
export function useReviewPresentation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: {
      id: string;
      status: "approved" | "needs_improvement";
      reviewerNotes?: string;
      reviewedBy: string;
    }) => presentationSubmissionService.review(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
}

/**
 * Delete a presentation submission
 */
export function useDeletePresentation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => presentationSubmissionService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: presentationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: presentationKeys.all });
    },
  });
}

/**
 * Get signed URL for video playback
 */
export function usePresentationSignedUrl(storagePath: string | null) {
  return useQuery({
    queryKey: presentationKeys.signedUrl(storagePath!),
    queryFn: () => presentationSubmissionService.getSignedUrl(storagePath!),
    enabled: !!storagePath,
    staleTime: 1000 * 60 * 30, // 30 minutes (URL valid for 1 hour)
  });
}

/**
 * Weekly compliance: which agents submitted this week
 */
export function useWeeklyCompliance(agencyId: string | undefined, weekStart: string | undefined) {
  return useQuery({
    queryKey: presentationKeys.compliance(agencyId!, weekStart!),
    queryFn: () => presentationSubmissionService.getWeeklyCompliance(agencyId!, weekStart!),
    enabled: !!agencyId && !!weekStart,
    staleTime: 1000 * 60 * 2,
  });
}
