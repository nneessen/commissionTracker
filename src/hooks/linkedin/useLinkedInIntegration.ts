// src/hooks/linkedin/useLinkedInIntegration.ts
// TanStack Query hooks for LinkedIn DM integration via Unipile

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserProfile } from "@/hooks/admin";
import { linkedinService } from "@/services/linkedin";
import { linkedinKeys } from "@/types/linkedin.types";
import type {
  LinkedInIntegration,
  LinkedInConversation,
  LinkedInMessage,
  LinkedInScheduledMessage,
  LinkedInConversationFilters,
  CreateLeadFromLinkedInInput,
  LinkedInAccountType,
} from "@/types/linkedin.types";

// ============================================================================
// Integration Hooks
// ============================================================================

/**
 * Get all LinkedIn integrations for the current user's IMO
 */
export function useLinkedInIntegrations() {
  const { data: profile } = useCurrentUserProfile();
  const imoId = profile?.imo_id;

  return useQuery({
    queryKey: linkedinKeys.integrations(imoId ?? ""),
    queryFn: async (): Promise<LinkedInIntegration[]> => {
      if (!imoId) return [];
      return linkedinService.getIntegrations(imoId);
    },
    enabled: !!imoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a specific LinkedIn integration by ID
 */
export function useLinkedInIntegrationById(integrationId: string | undefined) {
  return useQuery({
    queryKey: linkedinKeys.integration(integrationId ?? ""),
    queryFn: async (): Promise<LinkedInIntegration | null> => {
      if (!integrationId) return null;
      return linkedinService.getIntegrationById(integrationId);
    },
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get the active LinkedIn integration for the current user
 */
export function useActiveLinkedInIntegration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...linkedinKeys.all, "active", user?.id ?? ""],
    queryFn: async (): Promise<LinkedInIntegration | null> => {
      if (!user?.id) return null;
      return linkedinService.getActiveIntegration(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if user has at least one active LinkedIn integration
 */
export function useHasLinkedInIntegration() {
  const { data: integration, isLoading } = useActiveLinkedInIntegration();
  return {
    hasIntegration: !!integration,
    isLoading,
  };
}

/**
 * Initiate LinkedIn OAuth connection via Unipile Hosted Auth
 */
export function useConnectLinkedIn() {
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  return useMutation({
    mutationFn: async ({
      returnUrl,
      accountType,
    }: {
      returnUrl?: string;
      accountType?: LinkedInAccountType;
    } = {}): Promise<void> => {
      if (!profile?.imo_id || !user?.id) {
        throw new Error("User not authenticated or no IMO assigned");
      }

      const oauthUrl = await linkedinService.initiateOAuth(
        profile.imo_id,
        user.id,
        returnUrl || "/messages",
        accountType,
      );

      // Redirect to Unipile Hosted Auth
      window.location.href = oauthUrl;
    },
  });
}

/**
 * Disconnect a LinkedIn integration
 */
export function useDisconnectLinkedIn() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<void> => {
      await linkedinService.disconnect(integrationId);
    },
    onSuccess: () => {
      // Invalidate all LinkedIn queries
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: linkedinKeys.integrations(profile.imo_id),
        });
      }
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: [...linkedinKeys.all, "active", user.id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.all,
      });
    },
  });
}

/**
 * Delete a LinkedIn integration
 */
export function useDeleteLinkedInIntegration() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (integrationId: string): Promise<void> => {
      await linkedinService.deleteIntegration(integrationId);
    },
    onSuccess: () => {
      if (profile?.imo_id) {
        queryClient.invalidateQueries({
          queryKey: linkedinKeys.integrations(profile.imo_id),
        });
      }
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: [...linkedinKeys.all, "active", user.id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.all,
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
export function useLinkedInConversations(
  integrationId: string | undefined,
  filters?: LinkedInConversationFilters,
) {
  return useQuery({
    queryKey: [...linkedinKeys.conversations(integrationId ?? ""), filters],
    queryFn: async (): Promise<LinkedInConversation[]> => {
      if (!integrationId) return [];
      return linkedinService.getConversations(integrationId, filters);
    },
    enabled: !!integrationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get a single conversation by ID
 */
export function useLinkedInConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: linkedinKeys.conversation(conversationId ?? ""),
    queryFn: async (): Promise<LinkedInConversation | null> => {
      if (!conversationId) return null;
      return linkedinService.getConversationById(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get priority conversations for an integration
 */
export function usePriorityLinkedInConversations(
  integrationId: string | undefined,
) {
  return useQuery({
    queryKey: linkedinKeys.priorityConversations(integrationId ?? ""),
    queryFn: async (): Promise<LinkedInConversation[]> => {
      if (!integrationId) return [];
      return linkedinService.getConversations(integrationId, {
        isPriority: true,
      });
    },
    enabled: !!integrationId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Sync conversations from Unipile API
 */
export function useSyncLinkedInConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      limit,
      cursor,
    }: {
      integrationId: string;
      limit?: number;
      cursor?: string;
    }): Promise<{
      conversations: LinkedInConversation[];
      hasMore: boolean;
      nextCursor?: string;
      syncedCount: number;
    }> => {
      return linkedinService.syncConversations(integrationId, {
        limit,
        cursor,
      });
    },
    onSuccess: (data, variables) => {
      // Update the conversations in cache
      queryClient.setQueryData(
        linkedinKeys.conversations(variables.integrationId),
        data.conversations,
      );
      // Also invalidate to ensure any filtered queries are refreshed
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.conversations(variables.integrationId),
      });
    },
  });
}

// ============================================================================
// Message Hooks
// ============================================================================

/**
 * Sync messages from Unipile API for a conversation
 */
export function useSyncLinkedInMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      limit,
      cursor,
    }: {
      conversationId: string;
      limit?: number;
      cursor?: string;
    }): Promise<{
      messages: LinkedInMessage[];
      hasMore: boolean;
      nextCursor?: string;
      syncedCount: number;
    }> => {
      return linkedinService.syncMessages(conversationId, { limit, cursor });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.messages(variables.conversationId),
      });
    },
  });
}

/**
 * Send a message via Unipile API
 */
export function useSendLinkedInMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageText,
      templateId,
    }: {
      conversationId: string;
      messageText: string;
      templateId?: string;
    }): Promise<LinkedInMessage> => {
      return linkedinService.sendMessage(
        conversationId,
        messageText,
        templateId,
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.messages(variables.conversationId),
      });
      // Invalidate conversation to update last_message_preview
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.conversation(variables.conversationId),
      });
      // Invalidate conversations list too
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "linkedin" &&
          query.queryKey[1] === "conversations",
      });
    },
  });
}

/**
 * Get messages for a conversation
 */
export function useLinkedInMessages(
  conversationId: string | undefined,
  options?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [...linkedinKeys.messages(conversationId ?? ""), options],
    queryFn: async (): Promise<{
      messages: LinkedInMessage[];
      total: number;
    }> => {
      if (!conversationId) return { messages: [], total: 0 };
      return linkedinService.getMessages(
        conversationId,
        options?.limit,
        options?.offset,
      );
    },
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - realtime handles live updates
  });
}

// ============================================================================
// Priority Hooks
// ============================================================================

/**
 * Set priority status for a conversation
 * Uses optimistic updates for immediate UI feedback
 */
export function useSetLinkedInPriority() {
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
      await linkedinService.setPriority(
        conversationId,
        isPriority,
        user.id,
        notes,
      );
    },
    onMutate: async ({ conversationId, isPriority }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        predicate: (query) =>
          query.queryKey[0] === "linkedin" &&
          query.queryKey[1] === "conversations",
      });

      // Snapshot all conversations queries for rollback
      const snapshots: Array<
        [readonly unknown[], LinkedInConversation[] | undefined]
      > = [];
      queryClient
        .getQueriesData<LinkedInConversation[]>({
          predicate: (query) =>
            query.queryKey[0] === "linkedin" &&
            query.queryKey[1] === "conversations",
        })
        .forEach(([queryKey, data]) => {
          snapshots.push([queryKey, data]);
        });

      // Optimistically update all matching conversations queries
      queryClient.setQueriesData<LinkedInConversation[]>(
        {
          predicate: (query) =>
            query.queryKey[0] === "linkedin" &&
            query.queryKey[1] === "conversations",
        },
        (old) =>
          old?.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  is_priority: isPriority,
                  priority_set_at: isPriority ? new Date().toISOString() : null,
                }
              : conv,
          ),
      );

      return { snapshots };
    },
    onError: (_err, _variables, context) => {
      // Rollback all snapshots on error
      context?.snapshots?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_, __, variables) => {
      // Refetch to ensure server state consistency
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "linkedin" &&
          query.queryKey[1] === "conversations",
      });
    },
  });
}

/**
 * Update manually-entered contact info for a conversation participant
 */
export function useUpdateLinkedInContactInfo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      email,
      phone,
      notes,
    }: {
      conversationId: string;
      email?: string;
      phone?: string;
      notes?: string;
    }): Promise<void> => {
      if (!user?.id) throw new Error("User not authenticated");
      await linkedinService.updateContactInfo(conversationId, user.id, {
        email,
        phone,
        notes,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.conversation(variables.conversationId),
      });
    },
  });
}

/**
 * Create a recruiting lead from a LinkedIn conversation
 */
export function useCreateLeadFromLinkedIn() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateLeadFromLinkedInInput): Promise<string> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return linkedinService.createLeadFromConversation(input, user.id);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific conversation
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.conversation(variables.conversationId),
      });
      // Invalidate conversations list
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "linkedin" &&
          query.queryKey[1] === "conversations",
      });
      // Invalidate recruiting leads
      queryClient.invalidateQueries({
        queryKey: ["recruiting", "leads"],
      });
    },
  });
}

// ============================================================================
// Scheduled Message Hooks
// ============================================================================

/**
 * Get scheduled messages for a conversation
 */
export function useLinkedInScheduledMessages(
  conversationId: string | undefined,
) {
  return useQuery({
    queryKey: linkedinKeys.scheduled(conversationId ?? ""),
    queryFn: async (): Promise<LinkedInScheduledMessage[]> => {
      if (!conversationId) return [];
      return linkedinService.getScheduledMessages(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Cancel a scheduled message
 */
export function useCancelLinkedInScheduledMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
    }: {
      messageId: string;
      conversationId: string;
    }): Promise<void> => {
      await linkedinService.cancelScheduledMessage(messageId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.scheduled(variables.conversationId),
      });
    },
  });
}

/**
 * Schedule a message for future sending
 */
export function useScheduleLinkedInMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageText,
      scheduledFor,
      templateId,
      validUntil,
    }: {
      conversationId: string;
      messageText: string;
      scheduledFor: Date;
      templateId?: string;
      validUntil?: Date;
    }): Promise<LinkedInScheduledMessage> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return linkedinService.scheduleMessage(
        conversationId,
        messageText,
        scheduledFor,
        user.id,
        templateId,
        validUntil,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: linkedinKeys.scheduled(variables.conversationId),
      });
    },
  });
}
