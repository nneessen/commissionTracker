// src/hooks/integrations/useSlackWorkspaceLogo.ts
// TanStack Query hook for Slack workspace logo upload operations

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/services/base/supabase";
import { logger } from "@/services/base/logger";
import { slackKeys } from "@/types/slack.types";
import { useCurrentUserProfile } from "@/hooks/admin";

const WORKSPACE_LOGOS_BUCKET = "workspace-logos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];
const TARGET_SIZE = 512;

/**
 * Validate uploaded file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload PNG, JPG, WebP, or SVG.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "File too large. Maximum size is 5MB.",
    };
  }

  return { valid: true };
}

/**
 * Extract storage path from a Supabase storage URL
 */
function extractStoragePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");
    const bucketIndex = pathParts.findIndex(
      (p) => p === WORKSPACE_LOGOS_BUCKET
    );
    if (bucketIndex === -1 || bucketIndex >= pathParts.length - 1) {
      return null;
    }
    return decodeURIComponent(pathParts.slice(bucketIndex + 1).join("/"));
  } catch {
    return null;
  }
}

/**
 * Hook to upload a workspace logo
 */
export function useUploadWorkspaceLogo() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      integrationId,
      file,
    }: {
      integrationId: string;
      file: File;
    }): Promise<string> => {
      if (!profile?.imo_id) {
        throw new Error("User not authenticated or no IMO assigned");
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate storage path: {imo_id}/{integration_id}_{timestamp}_{filename}
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${profile.imo_id}/${integrationId}_${timestamp}_${sanitizedName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(WORKSPACE_LOGOS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        logger.error(
          "Failed to upload workspace logo",
          uploadError,
          "useSlackWorkspaceLogo"
        );
        throw new Error("Failed to upload logo");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(WORKSPACE_LOGOS_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Update slack_integrations with the new logo URL
      const { error: updateError } = await supabase
        .from("slack_integrations")
        .update({ workspace_logo_url: publicUrl })
        .eq("id", integrationId);

      if (updateError) {
        // Clean up uploaded file on DB update failure
        await supabase.storage
          .from(WORKSPACE_LOGOS_BUCKET)
          .remove([storagePath]);
        logger.error(
          "Failed to update integration with logo URL",
          updateError,
          "useSlackWorkspaceLogo"
        );
        throw new Error("Failed to save logo");
      }

      return publicUrl;
    },
    onSuccess: (_, variables) => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.integrations(profile.imo_id),
        });
        queryClient.invalidateQueries({
          queryKey: slackKeys.integration(variables.integrationId),
        });
      }
      toast.success("Workspace logo uploaded successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload logo"
      );
    },
  });
}

/**
 * Hook to delete a workspace logo
 */
export function useDeleteWorkspaceLogo() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      integrationId,
      logoUrl,
    }: {
      integrationId: string;
      logoUrl: string;
    }): Promise<void> => {
      if (!profile?.imo_id) {
        throw new Error("User not authenticated or no IMO assigned");
      }

      // Extract storage path
      const storagePath = extractStoragePathFromUrl(logoUrl);

      // Update database first (remove logo URL)
      const { error: updateError } = await supabase
        .from("slack_integrations")
        .update({ workspace_logo_url: null })
        .eq("id", integrationId);

      if (updateError) {
        logger.error(
          "Failed to remove logo URL from integration",
          updateError,
          "useSlackWorkspaceLogo"
        );
        throw new Error("Failed to remove logo");
      }

      // Delete from storage if path was found
      if (storagePath) {
        const { error: deleteError } = await supabase.storage
          .from(WORKSPACE_LOGOS_BUCKET)
          .remove([storagePath]);

        if (deleteError) {
          // Log but don't fail - DB was updated successfully
          logger.warn(
            "Failed to delete logo file from storage",
            "useSlackWorkspaceLogo"
          );
        }
      }
    },
    onSuccess: (_, variables) => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: slackKeys.integrations(profile.imo_id),
        });
        queryClient.invalidateQueries({
          queryKey: slackKeys.integration(variables.integrationId),
        });
      }
      toast.success("Workspace logo removed");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove logo"
      );
    },
  });
}

/**
 * Combined hook for workspace logo operations
 */
export function useWorkspaceLogoOperations() {
  const uploadLogo = useUploadWorkspaceLogo();
  const deleteLogo = useDeleteWorkspaceLogo();

  return {
    uploadLogo: uploadLogo.mutateAsync,
    isUploading: uploadLogo.isPending,
    deleteLogo: deleteLogo.mutateAsync,
    isDeleting: deleteLogo.isPending,
  };
}

export { TARGET_SIZE as WORKSPACE_LOGO_SIZE };
