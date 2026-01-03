// src/hooks/instagram/useInstagramIntegration.ts
// TanStack Query hooks for Instagram DM integration

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { instagramService } from "@/services/instagram";
import { instagramKeys } from "@/types/instagram.types";
import type {
  InstagramIntegration,
  InstagramConversation,
  InstagramMessage,
  InstagramMessageTemplate,
  InstagramScheduledMessage,
  ConversationFilters,
} from "@/types/instagram.types";

// ============================================================================
// Integration Hooks
// ============================================================================

/**
 * Get all Instagram integrations for the current user's IMO
 */
export function useInstagramIntegrations() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: instagramKeys.integrations(imoId ?? ""),
    queryFn: async (): Promise<InstagramIntegration[]> => {
      if (!imoId) return [];
      return instagramService.getIntegrations(imoId);
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a specific Instagram integration by ID
 */
export function useInstagramIntegrationById(integrationId: string | undefined) {
  return useQuery({
    queryKey: instagramKeys.integration(integrationId ?? ""),
    queryFn: async (): Promise<InstagramIntegration | null> => {
      if (!integrationId) return null;
      return instagramService.getIntegrationById(integrationId);
    },
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get the active Instagram integration for the current user
 */
export function useActiveInstagramIntegration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...instagramKeys.all, "active", user?.id ?? ""],
    queryFn: async (): Promise<InstagramIntegration | null> => {
      if (!user?.id) return null;
      return instagramService.getActiveIntegration(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if user has at least one active Instagram integration
 */
export function useHasInstagramIntegration() {
  const { data: integration, isLoading } = useActiveInstagramIntegration();
  return {
    hasIntegration: !!integration,
    isLoading,
  };
}

/**
 * Initiate Instagram OAuth connection
 */
export function useConnectInstagram() {
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (returnUrl?: string): Promise<void> => {
      if (!profile?.imo_id || !user?.id) {
        throw new Error("User not authenticated or no IMO assigned");
      }

      const oauthUrl = await instagramService.initiateOAuth(
        profile.imo_id,
        user.id,
        returnUrl || "/messages",
      );

      // Redirect to Meta OAuth
      window.location.href = oauthUrl;
    },
  });
}

/**
 * Disconnect an Instagram integration
 */
export function useDisconnectInstagram() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<void> => {
      await instagramService.disconnect(integrationId);
    },
    onSuccess: () => {
      // Invalidate all Instagram queries
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.integrations(profile.imo_id),
        });
      }
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: [...instagramKeys.all, "active", user.id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: instagramKeys.all,
      });
    },
  });
}

/**
 * Delete an Instagram integration
 */
export function useDeleteInstagramIntegration() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<void> => {
      await instagramService.deleteIntegration(integrationId);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.integrations(profile.imo_id),
        });
      }
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: [...instagramKeys.all, "active", user.id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: instagramKeys.all,
      });
    },
  });
}

// ============================================================================
// Conversation Hooks
// ============================================================================

/**
 * Get conversations for an integration
 */
export function useInstagramConversations(
  integrationId: string | undefined,
  filters?: ConversationFilters,
) {
  return useQuery({
    queryKey: [...instagramKeys.conversations(integrationId ?? ""), filters],
    queryFn: async (): Promise<InstagramConversation[]> => {
      if (!integrationId) return [];
      return instagramService.getConversations(integrationId, filters);
    },
    enabled: !!integrationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get a single conversation by ID
 */
export function useInstagramConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: instagramKeys.conversation(conversationId ?? ""),
    queryFn: async (): Promise<InstagramConversation | null> => {
      if (!conversationId) return null;
      return instagramService.getConversationById(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get priority conversations for an integration
 */
export function usePriorityInstagramConversations(
  integrationId: string | undefined,
) {
  return useQuery({
    queryKey: instagramKeys.priorityConversations(integrationId ?? ""),
    queryFn: async (): Promise<InstagramConversation[]> => {
      if (!integrationId) return [];
      return instagramService.getConversations(integrationId, {
        isPriority: true,
      });
    },
    enabled: !!integrationId,
    staleTime: 1 * 60 * 1000,
  });
}

// ============================================================================
// Message Hooks
// ============================================================================

/**
 * Get messages for a conversation
 */
export function useInstagramMessages(
  conversationId: string | undefined,
  options?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [...instagramKeys.messages(conversationId ?? ""), options],
    queryFn: async (): Promise<{
      messages: InstagramMessage[];
      total: number;
    }> => {
      if (!conversationId) return { messages: [], total: 0 };
      return instagramService.getMessages(
        conversationId,
        options?.limit,
        options?.offset,
      );
    },
    enabled: !!conversationId,
    staleTime: 30 * 1000, // 30 seconds - messages update frequently
  });
}

// ============================================================================
// Priority Hooks
// ============================================================================

/**
 * Set priority status for a conversation
 */
export function useSetInstagramPriority() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      isPriority,
      notes,
    }: {
      conversationId: string;
      isPriority: boolean;
      notes?: string;
    }): Promise<void> => {
      if (!user?.id) throw new Error("User not authenticated");
      await instagramService.setPriority(
        conversationId,
        isPriority,
        user.id,
        notes,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instagramKeys.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: instagramKeys.all,
      });
    },
  });
}

// ============================================================================
// Template Hooks
// ============================================================================

/**
 * Get message templates for the current IMO
 */
export function useInstagramTemplates() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: instagramKeys.templates(imoId ?? ""),
    queryFn: async (): Promise<InstagramMessageTemplate[]> => {
      if (!imoId) return [];
      return instagramService.getTemplates(imoId);
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new message template
 */
export function useCreateInstagramTemplate() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: {
      name: string;
      content: string;
      category?: string;
    }): Promise<InstagramMessageTemplate> => {
      if (!profile?.imo_id || !user?.id) {
        throw new Error("User not authenticated or no IMO assigned");
      }
      return instagramService.createTemplate({
        imo_id: profile.imo_id,
        user_id: user.id,
        name: template.name,
        content: template.content,
        category: template.category || null,
        is_active: true,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.templates(profile.imo_id),
        });
      }
    },
  });
}

/**
 * Update a message template
 */
export function useUpdateInstagramTemplate() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: { name?: string; content?: string; category?: string };
    }): Promise<InstagramMessageTemplate> => {
      return instagramService.updateTemplate(templateId, updates);
    },
    onSuccess: (_, variables) => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.templates(profile.imo_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: instagramKeys.template(variables.templateId),
      });
    },
  });
}

/**
 * Delete a message template
 */
export function useDeleteInstagramTemplate() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      await instagramService.deleteTemplate(templateId);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.templates(profile.imo_id),
        });
      }
    },
  });
}

// ============================================================================
// Scheduled Message Hooks
// ============================================================================

/**
 * Get scheduled messages for a conversation
 */
export function useInstagramScheduledMessages(
  conversationId: string | undefined,
) {
  return useQuery({
    queryKey: instagramKeys.scheduled(conversationId ?? ""),
    queryFn: async (): Promise<InstagramScheduledMessage[]> => {
      if (!conversationId) return [];
      return instagramService.getScheduledMessages(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Cancel a scheduled message
 */
export function useCancelInstagramScheduledMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId: _conversationId,
    }: {
      messageId: string;
      conversationId: string;
    }): Promise<void> => {
      void _conversationId; // Used in onSuccess via variables
      await instagramService.cancelScheduledMessage(messageId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instagramKeys.scheduled(variables.conversationId),
      });
    },
  });
}
