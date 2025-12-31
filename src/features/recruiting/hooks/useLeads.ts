// src/features/recruiting/hooks/useLeads.ts
// React Query hooks for recruiting leads management

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { leadsService } from "@/services/leads";
import type {
  LeadsFilters,
  SubmitLeadInput,
  LeadStatus,
} from "@/types/leads.types";

// Query Keys
export const LEADS_QUERY_KEYS = {
  all: ["leads"] as const,
  lists: () => [...LEADS_QUERY_KEYS.all, "list"] as const,
  list: (filters?: LeadsFilters, page?: number) =>
    [...LEADS_QUERY_KEYS.lists(), { filters, page }] as const,
  detail: (id: string) => [...LEADS_QUERY_KEYS.all, "detail", id] as const,
  stats: (recruiterId?: string) =>
    [...LEADS_QUERY_KEYS.all, "stats", recruiterId] as const,
  pendingCount: () => [...LEADS_QUERY_KEYS.all, "pending-count"] as const,
  publicRecruiter: (slug: string) => ["public-recruiter", slug] as const,
};

// ============================================================================
// PUBLIC HOOKS (no auth required)
// ============================================================================

/**
 * Get public recruiter info for landing page
 */
export function usePublicRecruiterInfo(slug: string) {
  return useQuery({
    queryKey: LEADS_QUERY_KEYS.publicRecruiter(slug),
    queryFn: () => leadsService.getPublicRecruiterInfo(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Submit a new lead (public form submission)
 */
export function useSubmitLead() {
  return useMutation({
    mutationFn: (input: SubmitLeadInput) => leadsService.submitLead(input),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Your interest has been submitted!");
      } else {
        toast.error(data.error || "Failed to submit. Please try again.");
      }
    },
    onError: (error: Error) => {
      console.error("Failed to submit lead:", error);
      toast.error(error.message || "Failed to submit. Please try again.");
    },
  });
}

/**
 * Update discovery call scheduled (after Calendly booking)
 */
export function useUpdateDiscoveryCall() {
  return useMutation({
    mutationFn: ({
      leadId,
      scheduledAt,
      callUrl,
    }: {
      leadId: string;
      scheduledAt: Date;
      callUrl?: string;
    }) =>
      leadsService.updateDiscoveryCallScheduled(leadId, scheduledAt, callUrl),
  });
}

// ============================================================================
// AUTHENTICATED HOOKS
// ============================================================================

/**
 * Get leads for the current user with filters and pagination
 */
export function useLeads(
  filters?: LeadsFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: LEADS_QUERY_KEYS.list(filters, page),
    queryFn: () => leadsService.getMyLeads(filters, page, pageSize),
  });
}

/**
 * Get leads by status (convenience hook)
 */
export function useLeadsByStatus(
  status: LeadStatus,
  page: number = 1,
  pageSize: number = 25,
) {
  return useLeads({ status: [status] }, page, pageSize);
}

/**
 * Get a single lead by ID
 */
export function useLeadById(leadId: string) {
  return useQuery({
    queryKey: LEADS_QUERY_KEYS.detail(leadId),
    queryFn: () => leadsService.getLeadById(leadId),
    enabled: !!leadId,
  });
}

/**
 * Get leads stats for dashboard
 */
export function useLeadsStats(recruiterId?: string) {
  return useQuery({
    queryKey: LEADS_QUERY_KEYS.stats(recruiterId),
    queryFn: () => leadsService.getLeadsStats(recruiterId),
  });
}

/**
 * Get pending leads count for badge display
 */
export function usePendingLeadsCount() {
  return useQuery({
    queryKey: LEADS_QUERY_KEYS.pendingCount(),
    queryFn: () => leadsService.getPendingLeadsCount(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Accept a lead and create a recruit
 */
export function useAcceptLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      pipelineTemplateId,
    }: {
      leadId: string;
      pipelineTemplateId?: string;
    }) => leadsService.acceptLead(leadId, pipelineTemplateId),
    onSuccess: (data, _variables) => {
      if (data.success) {
        toast.success("Lead accepted! Recruit has been created.");
        // Invalidate all leads-related queries
        queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEYS.all });
        // Also invalidate recruits since we created a new one
        queryClient.invalidateQueries({ queryKey: ["recruits"] });
        queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
      } else {
        toast.error(data.error || "Failed to accept lead. Please try again.");
      }
    },
    onError: (error: Error) => {
      console.error("Failed to accept lead:", error);
      toast.error(error.message || "Failed to accept lead. Please try again.");
    },
  });
}

/**
 * Reject a lead
 */
export function useRejectLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: string; reason?: string }) =>
      leadsService.rejectLead(leadId, reason),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Lead has been rejected.");
        queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEYS.all });
      } else {
        toast.error(data.error || "Failed to reject lead. Please try again.");
      }
    },
    onError: (error: Error) => {
      console.error("Failed to reject lead:", error);
      toast.error(error.message || "Failed to reject lead. Please try again.");
    },
  });
}

/**
 * Combined leads mutations hook
 */
export function useLeadsMutations() {
  const acceptLead = useAcceptLead();
  const rejectLead = useRejectLead();

  return {
    acceptLead,
    rejectLead,
    isLoading: acceptLead.isPending || rejectLead.isPending,
  };
}
