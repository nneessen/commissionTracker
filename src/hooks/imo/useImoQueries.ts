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
import type { ReportDateRange } from '../../types/team-reports.schemas';

/**
 * Serialize a date range to a stable string for use in query keys.
 * Date objects have reference equality issues - identical dates with different
 * object references would create separate cache entries. This serializes to
 * ISO date strings for stable, value-based comparison.
 */
function serializeDateRange(dateRange?: ReportDateRange): string | undefined {
  if (!dateRange) return undefined;
  return `${dateRange.startDate.toISOString().split('T')[0]}_${dateRange.endDate.toISOString().split('T')[0]}`;
}

// Query keys
export const imoKeys = {
  all: ['imos'] as const,
  lists: () => [...imoKeys.all, 'list'] as const,
  list: (filters?: object) => [...imoKeys.lists(), filters] as const,
  details: () => [...imoKeys.all, 'detail'] as const,
  detail: (id: string) => [...imoKeys.details(), id] as const,
  myImo: () => [...imoKeys.all, 'my'] as const,
  metrics: (id: string) => [...imoKeys.detail(id), 'metrics'] as const,
  // Dashboard metrics keys (Phase 5)
  dashboardMetrics: () => [...imoKeys.all, 'dashboardMetrics'] as const,
  productionByAgency: () => [...imoKeys.all, 'productionByAgency'] as const,
  // Team report keys (Phase 6) - dateRange serialized to prevent cache thrashing
  performanceReport: (dateRange?: ReportDateRange) => [...imoKeys.all, 'performanceReport', serializeDateRange(dateRange)] as const,
  teamComparison: (dateRange?: ReportDateRange) => [...imoKeys.all, 'teamComparison', serializeDateRange(dateRange)] as const,
  topPerformers: (limit: number, dateRange?: ReportDateRange) => [...imoKeys.all, 'topPerformers', limit, serializeDateRange(dateRange)] as const,
  // Override summary keys (Phase 7)
  overrideSummary: () => [...imoKeys.all, 'overrideSummary'] as const,
  overridesByAgency: () => [...imoKeys.all, 'overridesByAgency'] as const,
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
  // Dashboard metrics keys (Phase 5)
  dashboardMetrics: (id?: string) => [...agencyKeys.all, 'dashboardMetrics', id] as const,
  productionByAgent: (id?: string) => [...agencyKeys.all, 'productionByAgent', id] as const,
  // Team report keys (Phase 6) - dateRange serialized to prevent cache thrashing
  performanceReport: (id?: string, dateRange?: ReportDateRange) => [...agencyKeys.all, 'performanceReport', id, serializeDateRange(dateRange)] as const,
  // Override summary keys (Phase 7)
  overrideSummary: (id?: string) => [...agencyKeys.all, 'overrideSummary', id] as const,
  overridesByAgent: (id?: string) => [...agencyKeys.all, 'overridesByAgent', id] as const,
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

// =============================================================================
// DASHBOARD METRICS HOOKS (Phase 5)
// =============================================================================

/**
 * Get IMO dashboard metrics (aggregated for IMO admins)
 * Only returns data if user is IMO admin, IMO owner, or super admin
 */
export function useImoDashboardMetrics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: imoKeys.dashboardMetrics(),
    queryFn: () => imoService.getDashboardMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get IMO production breakdown by agency
 * Only returns data if user is IMO admin, IMO owner, or super admin
 */
export function useImoProductionByAgency(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: imoKeys.productionByAgency(),
    queryFn: () => imoService.getProductionByAgency(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get agency dashboard metrics (aggregated for agency owners)
 * @param agencyId - Optional agency ID. Defaults to user's own agency.
 * Only returns data if user is agency owner, IMO admin, or super admin
 */
export function useAgencyDashboardMetrics(
  agencyId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: agencyKeys.dashboardMetrics(agencyId),
    queryFn: () => agencyService.getDashboardMetrics(agencyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get agency production breakdown by agent
 * @param agencyId - Optional agency ID. Defaults to user's own agency.
 * Only returns data if user is agency owner, IMO admin, or super admin
 */
export function useAgencyProductionByAgent(
  agencyId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: agencyKeys.productionByAgent(agencyId),
    queryFn: () => agencyService.getProductionByAgent(agencyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}

// =============================================================================
// TEAM PERFORMANCE REPORT HOOKS (Phase 6)
// =============================================================================

/**
 * Get IMO performance report with monthly trends
 * Only returns data if user is IMO admin, IMO owner, or super admin
 */
export function useImoPerformanceReport(
  dateRange?: ReportDateRange,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: imoKeys.performanceReport(dateRange),
    queryFn: () => imoService.getPerformanceReport(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get team comparison report (agency rankings)
 * Only returns data if user is IMO admin, IMO owner, or super admin
 */
export function useTeamComparisonReport(
  dateRange?: ReportDateRange,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: imoKeys.teamComparison(dateRange),
    queryFn: () => imoService.getTeamComparisonReport(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get top performers report (agent rankings)
 * Only returns data if user is IMO admin, IMO owner, or super admin
 */
export function useTopPerformersReport(
  limit: number = 20,
  dateRange?: ReportDateRange,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: imoKeys.topPerformers(limit, dateRange),
    queryFn: () => imoService.getTopPerformersReport(limit, dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get agency performance report with monthly trends
 * @param agencyId - Optional agency ID. Defaults to user's own agency.
 * Only returns data if user is agency owner, IMO admin, or super admin
 */
export function useAgencyPerformanceReport(
  agencyId?: string,
  dateRange?: ReportDateRange,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: agencyKeys.performanceReport(agencyId, dateRange),
    queryFn: () => agencyService.getPerformanceReport(agencyId, dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

// =============================================================================
// OVERRIDE COMMISSION SUMMARY HOOKS (Phase 7)
// =============================================================================

/**
 * Get IMO override commission summary
 * Only returns data if user is IMO admin, IMO owner, or super admin
 */
export function useImoOverrideSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: imoKeys.overrideSummary(),
    queryFn: () => imoService.getOverrideSummary(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get override commission breakdown by agency for IMO admins
 * Only returns data if user is IMO admin, IMO owner, or super admin
 */
export function useImoOverridesByAgency(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: imoKeys.overridesByAgency(),
    queryFn: () => imoService.getOverridesByAgency(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get agency override commission summary
 * @param agencyId - Optional agency ID. Defaults to user's own agency.
 * Only returns data if user is agency owner, IMO admin, or super admin
 */
export function useAgencyOverrideSummary(
  agencyId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: agencyKeys.overrideSummary(agencyId),
    queryFn: () => agencyService.getOverrideSummary(agencyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get override commission breakdown by agent for agency owners
 * @param agencyId - Optional agency ID. Defaults to user's own agency.
 * Only returns data if user is agency owner, IMO admin, or super admin
 */
export function useAgencyOverridesByAgent(
  agencyId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: agencyKeys.overridesByAgent(agencyId),
    queryFn: () => agencyService.getOverridesByAgent(agencyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled ?? true,
  });
}
