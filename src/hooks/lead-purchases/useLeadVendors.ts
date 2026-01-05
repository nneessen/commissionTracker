// src/hooks/lead-purchases/useLeadVendors.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadVendorService } from "@/services/lead-purchases";
import { useAuth } from "@/contexts/AuthContext";
import type {
  LeadVendor,
  CreateLeadVendorData,
  UpdateLeadVendorData,
} from "@/types/lead-purchase.types";

// Query keys
export const leadVendorKeys = {
  all: ["lead-vendors"] as const,
  lists: () => [...leadVendorKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...leadVendorKeys.lists(), filters] as const,
  details: () => [...leadVendorKeys.all, "detail"] as const,
  detail: (id: string) => [...leadVendorKeys.details(), id] as const,
};

/**
 * Fetch all active lead vendors for the current user's IMO
 */
export function useLeadVendors() {
  const { user } = useAuth();

  return useQuery({
    queryKey: leadVendorKeys.lists(),
    queryFn: async () => {
      const result = await leadVendorService.getActiveVendors();
      if (!result.success) {
        throw result.error;
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user?.id,
  });
}

/**
 * Get a single vendor by ID
 */
export function useLeadVendor(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: leadVendorKeys.detail(id),
    queryFn: async () => {
      const result = await leadVendorService.getById(id);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id && !!id,
  });
}

/**
 * Search vendors by name
 */
export function useSearchLeadVendors(searchTerm: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...leadVendorKeys.lists(), "search", searchTerm],
    queryFn: async () => {
      const result = await leadVendorService.searchVendors(searchTerm);
      if (!result.success) {
        throw result.error;
      }
      return result.data || [];
    },
    staleTime: 30 * 1000, // 30 seconds for search
    enabled: !!user?.id && searchTerm.length >= 2,
  });
}

/**
 * Create a new lead vendor
 */
export function useCreateLeadVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadVendorData) => {
      const result = await leadVendorService.create(data);
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadVendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadVendorKeys.all });
    },
  });
}

/**
 * Update a lead vendor
 */
export function useUpdateLeadVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateLeadVendorData;
    }) => {
      const result = await leadVendorService.update(id, data);
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadVendor;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadVendorKeys.all });
      queryClient.invalidateQueries({ queryKey: leadVendorKeys.detail(id) });
    },
  });
}

/**
 * Soft delete a lead vendor
 */
export function useDeleteLeadVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await leadVendorService.softDelete(id);
      if (!result.success) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadVendorKeys.all });
    },
  });
}
