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
  InstagramTemplateCategory,
  InstagramScheduledMessage,
  ConversationFilters,
  CreateLeadFromIGInput,
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

/**
 * Sync conversations from Instagram API
 */
export function useSyncInstagramConversations() {
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
      conversations: InstagramConversation[];
      hasMore: boolean;
      nextCursor?: string;
      syncedCount: number;
    }> => {
      return instagramService.syncConversations(integrationId, {
        limit,
        cursor,
      });
    },
    onSuccess: (data, variables) => {
      // Update the conversations in cache
      queryClient.setQueryData(
        instagramKeys.conversations(variables.integrationId),
        data.conversations,
      );
      // Also invalidate to ensure any filtered queries are refreshed
      queryClient.invalidateQueries({
        queryKey: instagramKeys.conversations(variables.integrationId),
      });
    },
  });
}

// ============================================================================
// Message Hooks
// ============================================================================

/**
 * Sync messages from Instagram API for a conversation
 */
export function useSyncInstagramMessages() {
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
      messages: InstagramMessage[];
      hasMore: boolean;
      nextCursor?: string;
      syncedCount: number;
    }> => {
      return instagramService.syncMessages(conversationId, { limit, cursor });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instagramKeys.messages(variables.conversationId),
      });
    },
  });
}

/**
 * Send a message via Instagram API
 */
export function useSendInstagramMessage() {
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
    }): Promise<InstagramMessage> => {
      return instagramService.sendMessage(
        conversationId,
        messageText,
        templateId,
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: instagramKeys.messages(variables.conversationId),
      });
      // Invalidate conversation to update last_message_preview
      queryClient.invalidateQueries({
        queryKey: instagramKeys.conversation(variables.conversationId),
      });
      // Invalidate conversations list too
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "instagram" &&
          query.queryKey[1] === "conversations",
      });
    },
  });
}

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
    onMutate: async ({ conversationId, isPriority }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        predicate: (query) =>
          query.queryKey[0] === "instagram" &&
          query.queryKey[1] === "conversations",
      });

      // Snapshot all conversations queries for rollback
      const snapshots: Array<
        [readonly unknown[], InstagramConversation[] | undefined]
      > = [];
      queryClient
        .getQueriesData<InstagramConversation[]>({
          predicate: (query) =>
            query.queryKey[0] === "instagram" &&
            query.queryKey[1] === "conversations",
        })
        .forEach(([queryKey, data]) => {
          snapshots.push([queryKey, data]);
        });

      // Optimistically update all matching conversations queries
      queryClient.setQueriesData<InstagramConversation[]>(
        {
          predicate: (query) =>
            query.queryKey[0] === "instagram" &&
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
        queryKey: instagramKeys.conversation(variables.conversationId),
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "instagram" &&
          query.queryKey[1] === "conversations",
      });
    },
  });
}

/**
 * Update manually-entered contact info for a conversation participant
 */
export function useUpdateInstagramContactInfo() {
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
      await instagramService.updateContactInfo(conversationId, user.id, {
        email,
        phone,
        notes,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instagramKeys.conversation(variables.conversationId),
      });
    },
  });
}

/**
 * Create a recruiting lead from an Instagram conversation
 */
export function useCreateLeadFromInstagram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateLeadFromIGInput): Promise<string> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return instagramService.createLeadFromConversation(input, user.id);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific conversation
      queryClient.invalidateQueries({
        queryKey: instagramKeys.conversation(variables.conversationId),
      });
      // Invalidate conversations list (more targeted than instagramKeys.all)
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "instagram" &&
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
// Template Hooks
// ============================================================================

/**
 * Get message templates for the current user (personal templates)
 */
export function useInstagramTemplates() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    // Use a proper key only when user is authenticated to avoid cache pollution
    queryKey: userId
      ? instagramKeys.userTemplates(userId)
      : ["instagram", "templates", "disabled"],
    queryFn: async (): Promise<InstagramMessageTemplate[]> => {
      if (!userId) return [];
      return instagramService.getTemplatesByUser(userId);
    },
    enabled: !!userId,
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
      message_stage?: string;
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
        message_stage: template.message_stage || "opener",
        is_active: true,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.userTemplates(user.id),
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: {
        name?: string;
        content?: string;
        category?: string;
        message_stage?: string;
      };
    }): Promise<InstagramMessageTemplate> => {
      return instagramService.updateTemplate(templateId, updates);
    },
    onSuccess: (_, variables) => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.userTemplates(user.id),
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      await instagramService.deleteTemplate(templateId, user?.id);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.userTemplates(user.id),
        });
      }
    },
  });
}

// ============================================================================
// Template Category Hooks
// ============================================================================

/**
 * Get custom template categories for the current user
 */
export function useInstagramTemplateCategories() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    // Use a proper key only when user is authenticated to avoid cache pollution
    queryKey: userId
      ? instagramKeys.templateCategories(userId)
      : ["instagram", "templateCategories", "disabled"],
    queryFn: async (): Promise<InstagramTemplateCategory[]> => {
      if (!userId) return [];
      return instagramService.getTemplateCategories(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new template category
 */
export function useCreateTemplateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (category: {
      name: string;
      display_order?: number;
    }): Promise<InstagramTemplateCategory> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return instagramService.createTemplateCategory({
        user_id: user.id,
        name: category.name,
        display_order: category.display_order ?? 0,
        is_active: true,
      });
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.templateCategories(user.id),
        });
      }
    },
  });
}

/**
 * Update a template category
 */
export function useUpdateTemplateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      categoryId,
      updates,
    }: {
      categoryId: string;
      updates: { name?: string; display_order?: number };
    }): Promise<InstagramTemplateCategory> => {
      return instagramService.updateTemplateCategory(categoryId, updates);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.templateCategories(user.id),
        });
      }
    },
  });
}

/**
 * Delete a template category
 * Also invalidates templates query since templates using this category are updated
 */
export function useDeleteTemplateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (categoryId: string): Promise<void> => {
      await instagramService.deleteTemplateCategory(categoryId);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: instagramKeys.templateCategories(user.id),
        });
        // Also invalidate templates since their categories may have been cleared
        queryClient.invalidateQueries({
          queryKey: instagramKeys.userTemplates(user.id),
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
    }: {
      messageId: string;
      conversationId: string;
    }): Promise<void> => {
      await instagramService.cancelScheduledMessage(messageId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instagramKeys.scheduled(variables.conversationId),
      });
    },
  });
}

/**
 * Schedule a message for future sending
 */
export function useScheduleInstagramMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageText,
      scheduledFor,
      templateId,
    }: {
      conversationId: string;
      messageText: string;
      scheduledFor: Date;
      templateId?: string;
    }): Promise<InstagramScheduledMessage> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return instagramService.scheduleMessage(
        conversationId,
        messageText,
        scheduledFor,
        user.id,
        templateId,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: instagramKeys.scheduled(variables.conversationId),
      });
    },
  });
}
