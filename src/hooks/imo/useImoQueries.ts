// src/hooks/imo/useImoQueries.ts
// TanStack Query hooks for IMO and Agency data

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { imoService } from '../../services/imo';
import { agencyService } from '../../services/agency';
import type {
  CreateImoData,
  CreateAgencyData,
  ImoUpdate,
  AgencyUpdate,
} from '../../types/imo.types';

// Query keys
export const imoKeys = {
  all: ['imos'] as const,
  lists: () => [...imoKeys.all, 'list'] as const,
  list: (filters?: object) => [...imoKeys.lists(), filters] as const,
  details: () => [...imoKeys.all, 'detail'] as const,
  detail: (id: string) => [...imoKeys.details(), id] as const,
  myImo: () => [...imoKeys.all, 'my'] as const,
  metrics: (id: string) => [...imoKeys.detail(id), 'metrics'] as const,
};

export const agencyKeys = {
  all: ['agencies'] as const,
  lists: () => [...agencyKeys.all, 'list'] as const,
  listByImo: (imoId: string) => [...agencyKeys.lists(), { imoId }] as const,
  details: () => [...agencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
  myAgency: () => [...agencyKeys.all, 'my'] as const,
  myImoAgencies: () => [...agencyKeys.all, 'myImo'] as const,
  metrics: (id: string) => [...agencyKeys.detail(id), 'metrics'] as const,
};

// =============================================================================
// IMO HOOKS
// =============================================================================

/**
 * Get the current user's IMO
 */
export function useMyImo() {
  return useQuery({
    queryKey: imoKeys.myImo(),
    queryFn: () => imoService.getMyImo(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get an IMO by ID
 */
export function useImoById(imoId: string | undefined) {
  return useQuery({
    queryKey: imoKeys.detail(imoId!),
    queryFn: () => imoService.getImo(imoId!),
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get an IMO with its agencies
 */
export function useImoWithAgencies(imoId: string | undefined) {
  return useQuery({
    queryKey: [...imoKeys.detail(imoId!), 'agencies'],
    queryFn: () => imoService.getImoWithAgencies(imoId!),
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get all active IMOs (super admin only)
 * @param options.enabled - Set to false to disable the query (LOW-1 fix)
 */
export function useAllActiveImos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: imoKeys.lists(),
    queryFn: () => imoService.getAllActiveImos(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get IMO metrics
 */
export function useImoMetrics(imoId: string | undefined) {
  return useQuery({
    queryKey: imoKeys.metrics(imoId!),
    queryFn: () => imoService.getImoMetrics(imoId!),
    enabled: !!imoId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create IMO mutation
 */
export function useCreateImo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateImoData) => imoService.createImo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imoKeys.all });
    },
  });
}

/**
 * Update IMO mutation
 */
export function useUpdateImo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ImoUpdate }) =>
      imoService.updateImo(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: imoKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: imoKeys.myImo() });
      queryClient.invalidateQueries({ queryKey: imoKeys.lists() });
    },
  });
}

/**
 * Deactivate IMO mutation
 */
export function useDeactivateImo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imoId: string) => imoService.deactivateImo(imoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imoKeys.all });
    },
  });
}

// =============================================================================
// AGENCY HOOKS
// =============================================================================

/**
 * Get the current user's agency
 */
export function useMyAgency() {
  return useQuery({
    queryKey: agencyKeys.myAgency(),
    queryFn: () => agencyService.getMyAgency(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get an agency by ID
 */
export function useAgencyById(agencyId: string | undefined) {
  return useQuery({
    queryKey: agencyKeys.detail(agencyId!),
    queryFn: () => agencyService.getAgency(agencyId!),
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get an agency with owner info
 */
export function useAgencyWithOwner(agencyId: string | undefined) {
  return useQuery({
    queryKey: [...agencyKeys.detail(agencyId!), 'owner'],
    queryFn: () => agencyService.getAgencyWithOwner(agencyId!),
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get all agencies in the current user's IMO
 */
export function useMyImoAgencies() {
  return useQuery({
    queryKey: agencyKeys.myImoAgencies(),
    queryFn: () => agencyService.getAgenciesInMyImo(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get all active agencies across all IMOs (super admin only)
 */
export function useAllActiveAgencies() {
  return useQuery({
    queryKey: [...agencyKeys.lists(), 'allActive'],
    queryFn: () => agencyService.getAllActiveAgencies(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get agencies in a specific IMO
 */
export function useAgenciesByImo(imoId: string | undefined) {
  return useQuery({
    queryKey: agencyKeys.listByImo(imoId!),
    queryFn: () => agencyService.getAgenciesByImo(imoId!),
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get agency metrics
 */
export function useAgencyMetrics(agencyId: string | undefined) {
  return useQuery({
    queryKey: agencyKeys.metrics(agencyId!),
    queryFn: () => agencyService.getAgencyMetrics(agencyId!),
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create agency mutation
 */
export function useCreateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgencyData) => agencyService.createAgency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
      queryClient.invalidateQueries({ queryKey: imoKeys.all }); // IMO might have agency count
    },
  });
}

/**
 * Update agency mutation
 */
export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgencyUpdate }) =>
      agencyService.updateAgency(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agencyKeys.myAgency() });
      queryClient.invalidateQueries({ queryKey: agencyKeys.myImoAgencies() });
    },
  });
}

/**
 * Delete agency mutation
 */
export function useDeleteAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) => agencyService.deleteAgency(agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  });
}

/**
 * Deactivate agency mutation
 */
export function useDeactivateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) => agencyService.deactivateAgency(agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  });
}

/**
 * Assign agent to agency mutation
 */
export function useAssignAgentToAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, agencyId }: { agentId: string; agencyId: string }) =>
      agencyService.assignAgentToAgency(agentId, agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
    },
  });
}

/**
 * Transfer agency ownership mutation
 */
export function useTransferAgencyOwnership(agencyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newOwnerId: string) =>
      agencyService.transferOwnership(agencyId, newOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.detail(agencyId) });
    },
  });
}
