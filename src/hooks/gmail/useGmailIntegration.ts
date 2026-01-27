// src/hooks/gmail/useGmailIntegration.ts
// TanStack Query hooks for Gmail OAuth integration

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { gmailService } from "@/services/gmail";
import { gmailKeys } from "@/types/gmail.types";
import { toast } from "sonner";
import type { GmailIntegration } from "@/types/gmail.types";

// ============================================================================
// Integration Hooks
// ============================================================================

/**
 * Get Gmail integration for the current user
 */
export function useGmailIntegration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gmailKeys.integration(user?.id ?? ""),
    queryFn: async (): Promise<GmailIntegration | null> => {
      if (!user?.id) return null;
      return gmailService.getIntegration(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if user has an active Gmail integration
 */
export function useHasGmailIntegration() {
  const { data: integration, isLoading } = useGmailIntegration();
  return {
    hasIntegration:
      !!integration && integration.connection_status === "connected",
    isLoading,
    integration,
  };
}

/**
 * Proactively check if Gmail token is expiring soon and show toast notification
 */
export function useGmailTokenExpiryCheck(
  integration: GmailIntegration | null | undefined,
) {
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (
      !integration ||
      hasShownToast.current ||
      integration.connection_status !== "connected"
    ) {
      return;
    }

    const tokenExpiresAt = integration.token_expires_at;
    if (!tokenExpiresAt) return;

    const expiresAt = new Date(tokenExpiresAt);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const minutesUntilExpiry = Math.ceil(diffMs / (1000 * 60));

    // Gmail tokens expire in 1 hour, show toast if expiring within 15 minutes
    // (This shouldn't happen often since we auto-refresh, but just in case)
    if (minutesUntilExpiry > 0 && minutesUntilExpiry <= 15) {
      hasShownToast.current = true;
      toast.warning("Gmail Token Expiring Soon", {
        description: `Your Gmail connection will need to refresh. If you see issues, try reconnecting.`,
        duration: 10000,
        action: {
          label: "Go to Settings",
          onClick: () => {
            window.location.href = "/settings?tab=integrations";
          },
        },
      });
    }
  }, [integration]);
}

/**
 * Initiate Gmail OAuth connection
 */
export function useConnectGmail() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (returnUrl?: string): Promise<void> => {
      if (!user?.id) {
        throw new Error("You must be logged in to connect Gmail");
      }

      console.log("[useConnectGmail] Initiating OAuth for user:", user.id);

      const oauthUrl = await gmailService.initiateOAuth(user.id, returnUrl);

      // Redirect to Google OAuth
      window.location.href = oauthUrl;
    },
    onError: (error) => {
      console.error("[useConnectGmail] Error:", error);
      toast.error("Failed to connect Gmail", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

/**
 * Disconnect Gmail integration
 */
export function useDisconnectGmail() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<void> => {
      await gmailService.disconnect(integrationId);
    },
    onSuccess: () => {
      // Invalidate integration query
      queryClient.invalidateQueries({
        queryKey: gmailKeys.integration(user?.id ?? ""),
      });
      toast.success("Gmail disconnected", {
        description: "Your Gmail account has been disconnected.",
      });
    },
    onError: (error) => {
      console.error("[useDisconnectGmail] Error:", error);
      toast.error("Failed to disconnect Gmail", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

/**
 * Trigger manual Gmail sync
 */
export function useSyncGmail() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<void> => {
      await gmailService.syncNow(integrationId);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: gmailKeys.integration(user?.id ?? ""),
      });
      toast.success("Gmail sync started", {
        description: "Your inbox is being synchronized.",
      });
    },
    onError: (error) => {
      console.error("[useSyncGmail] Error:", error);
      toast.error("Failed to sync Gmail", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
