// src/features/landing/hooks/useLandingPageSettings.ts
// TanStack Query hooks for landing page settings

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { landingPageService, type AssetType } from '../services/landingPageService';
import type {
  LandingPageTheme,
  LandingPageSettingsRow,
  LandingPageSettingsInput,
} from '../types/landing-page.types';
import { DEFAULT_LANDING_PAGE_THEME } from '../types/landing-page.types';

// ===== QUERY KEYS =====

export const landingPageKeys = {
  all: ['landing-page'] as const,
  public: () => [...landingPageKeys.all, 'public'] as const,
  publicByImo: (imoId?: string) => [...landingPageKeys.public(), imoId] as const,
  admin: () => [...landingPageKeys.all, 'admin'] as const,
  adminByImo: (imoId: string) => [...landingPageKeys.admin(), imoId] as const,
};

// ===== PUBLIC HOOKS (No Auth Required) =====

/**
 * Hook to fetch public landing page settings (for the public landing page)
 * Note: PublicLandingPage uses direct fetch instead due to React Query context issues
 */
export function usePublicLandingPageSettings(imoId?: string) {
  const query = useQuery<LandingPageTheme>({
    queryKey: landingPageKeys.publicByImo(imoId),
    queryFn: () => landingPageService.getPublicSettings(imoId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Return with fallback to defaults if no data yet
  return {
    ...query,
    data: query.data ?? DEFAULT_LANDING_PAGE_THEME,
  };
}

// ===== ADMIN HOOKS (Auth Required) =====

/**
 * Hook to fetch landing page settings for admin editing
 */
export function useLandingPageSettings(imoId: string) {
  return useQuery<LandingPageSettingsRow | null>({
    queryKey: landingPageKeys.adminByImo(imoId),
    queryFn: () => landingPageService.getSettings(imoId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!imoId,
  });
}

/**
 * Hook to upsert landing page settings
 */
export function useUpsertLandingPageSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imoId, input }: { imoId: string; input: LandingPageSettingsInput }) =>
      landingPageService.upsertSettings(imoId, input),
    onSuccess: (data, { imoId }) => {
      // Invalidate both admin and public queries
      queryClient.invalidateQueries({ queryKey: landingPageKeys.adminByImo(imoId) });
      queryClient.invalidateQueries({ queryKey: landingPageKeys.public() });
      toast.success('Landing page settings saved');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

/**
 * Hook to delete landing page settings (reset to defaults)
 */
export function useDeleteLandingPageSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imoId: string) => landingPageService.deleteSettings(imoId),
    onSuccess: (_, imoId) => {
      queryClient.invalidateQueries({ queryKey: landingPageKeys.adminByImo(imoId) });
      queryClient.invalidateQueries({ queryKey: landingPageKeys.public() });
      toast.success('Landing page reset to defaults');
    },
    onError: (error) => {
      toast.error(`Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

// ===== ASSET HOOKS =====

/**
 * Hook to upload a landing page asset
 */
export function useUploadLandingPageAsset() {
  return useMutation({
    mutationFn: ({
      imoId,
      file,
      type,
    }: {
      imoId: string;
      file: File;
      type: AssetType;
    }) => landingPageService.uploadAsset(imoId, file, type),
    onError: (error) => {
      toast.error(`Failed to upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

/**
 * Hook to delete a landing page asset
 */
export function useDeleteLandingPageAsset() {
  return useMutation({
    mutationFn: (url: string) => landingPageService.deleteAsset(url),
    onError: (error) => {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

// ===== COMBINED OPERATIONS HOOK =====

/**
 * Combined hook with all landing page settings operations
 */
export function useLandingPageOperations(imoId: string) {
  const queryClient = useQueryClient();
  const settingsQuery = useLandingPageSettings(imoId);
  const upsertMutation = useUpsertLandingPageSettings();
  const deleteMutation = useDeleteLandingPageSettings();
  const uploadMutation = useUploadLandingPageAsset();
  const deleteAssetMutation = useDeleteLandingPageAsset();

  return {
    // Query
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    error: settingsQuery.error,
    refetch: settingsQuery.refetch,

    // Mutations
    save: (input: LandingPageSettingsInput) => upsertMutation.mutateAsync({ imoId, input }),
    reset: () => deleteMutation.mutateAsync(imoId),
    uploadAsset: (file: File, type: AssetType) =>
      uploadMutation.mutateAsync({ imoId, file, type }),
    deleteAsset: (url: string) => deleteAssetMutation.mutateAsync(url),

    // Mutation states
    isSaving: upsertMutation.isPending,
    isResetting: deleteMutation.isPending,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteAssetMutation.isPending,

    // Invalidate cache
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: landingPageKeys.adminByImo(imoId) });
      queryClient.invalidateQueries({ queryKey: landingPageKeys.public() });
    },
  };
}
