// src/features/settings/hooks/useBrandingSettings.ts
// TanStack Query hooks for recruiting page branding settings

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { brandingSettingsService } from "@/services/recruiting/brandingSettingsService";
import type {
  RecruitingPageSettingsInput,
  RecruitingAssetType,
} from "@/types/recruiting-theme.types";

// Query keys
export const brandingSettingsKeys = {
  all: ["brandingSettings"] as const,
  current: () => [...brandingSettingsKeys.all, "current"] as const,
};

/**
 * Hook to fetch the current user's branding settings
 */
export function useBrandingSettings() {
  return useQuery({
    queryKey: brandingSettingsKeys.current(),
    queryFn: () => brandingSettingsService.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create or update branding settings
 */
export function useUpsertBrandingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecruitingPageSettingsInput) =>
      brandingSettingsService.upsertSettings(input),
    onSuccess: (data) => {
      queryClient.setQueryData(brandingSettingsKeys.current(), data);
      toast.success("Branding settings saved successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save branding settings",
      );
    },
  });
}

/**
 * Hook to upload a branding asset (logo or hero image)
 */
export function useUploadBrandingAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      type,
    }: {
      file: File;
      type: RecruitingAssetType;
    }) => {
      return brandingSettingsService.uploadAsset(file, type);
    },
    onSuccess: () => {
      // Invalidate to refetch settings after upload
      queryClient.invalidateQueries({
        queryKey: brandingSettingsKeys.current(),
      });
      toast.success("Asset uploaded successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload asset",
      );
    },
  });
}

/**
 * Hook to delete a branding asset
 */
export function useDeleteBrandingAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => brandingSettingsService.deleteAsset(url),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: brandingSettingsKeys.current(),
      });
      toast.success("Asset deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete asset",
      );
    },
  });
}

/**
 * Hook to delete all branding settings
 */
export function useDeleteBrandingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => brandingSettingsService.deleteSettings(),
    onSuccess: () => {
      queryClient.setQueryData(brandingSettingsKeys.current(), null);
      toast.success("Branding settings reset to defaults");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset branding settings",
      );
    },
  });
}

/**
 * Combined hook that provides all branding settings operations
 */
export function useBrandingSettingsOperations() {
  const settings = useBrandingSettings();
  const upsert = useUpsertBrandingSettings();
  const uploadAsset = useUploadBrandingAsset();
  const deleteAsset = useDeleteBrandingAsset();
  const deleteSettings = useDeleteBrandingSettings();

  return {
    // Query
    settings: settings.data,
    isLoading: settings.isLoading,
    error: settings.error,

    // Mutations
    saveSettings: upsert.mutateAsync,
    isSaving: upsert.isPending,

    uploadAsset: uploadAsset.mutateAsync,
    isUploading: uploadAsset.isPending,

    deleteAsset: deleteAsset.mutateAsync,
    isDeleting: deleteAsset.isPending,

    resetToDefaults: deleteSettings.mutateAsync,
    isResetting: deleteSettings.isPending,
  };
}
