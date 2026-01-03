// src/hooks/instagram/index.ts
// Instagram hooks exports

export {
  // Integration hooks
  useInstagramIntegrations,
  useInstagramIntegrationById,
  useActiveInstagramIntegration,
  useHasInstagramIntegration,
  useConnectInstagram,
  useDisconnectInstagram,
  useDeleteInstagramIntegration,
  // Conversation hooks
  useInstagramConversations,
  useInstagramConversation,
  usePriorityInstagramConversations,
  // Message hooks
  useInstagramMessages,
  // Priority hooks
  useSetInstagramPriority,
  // Template hooks
  useInstagramTemplates,
  useCreateInstagramTemplate,
  useUpdateInstagramTemplate,
  useDeleteInstagramTemplate,
  // Scheduled message hooks
  useInstagramScheduledMessages,
  useCancelInstagramScheduledMessage,
} from "./useInstagramIntegration";
