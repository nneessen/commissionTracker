// src/hooks/linkedin/index.ts
// LinkedIn hooks exports

export {
  // Integration hooks
  useLinkedInIntegrations,
  useLinkedInIntegrationById,
  useActiveLinkedInIntegration,
  useHasLinkedInIntegration,
  useConnectLinkedIn,
  useDisconnectLinkedIn,
  useDeleteLinkedInIntegration,
  // Conversation hooks
  useLinkedInConversations,
  useLinkedInConversation,
  usePriorityLinkedInConversations,
  useSyncLinkedInConversations,
  // Message hooks
  useLinkedInMessages,
  useSyncLinkedInMessages,
  useSendLinkedInMessage,
  // Priority hooks
  useSetLinkedInPriority,
  // Contact info hooks
  useUpdateLinkedInContactInfo,
  // Lead hooks
  useCreateLeadFromLinkedIn,
  // Scheduled message hooks
  useLinkedInScheduledMessages,
  useCancelLinkedInScheduledMessage,
  useScheduleLinkedInMessage,
} from "./useLinkedInIntegration";

// Realtime subscription hooks
export {
  useLinkedInMessagesRealtime,
  useLinkedInConversationsRealtime,
  useLinkedInRealtime,
  useLinkedInUnreadCount,
} from "./useLinkedInRealtime";
