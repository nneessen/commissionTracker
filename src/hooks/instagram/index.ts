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
  useSyncInstagramConversations,
  // Message hooks
  useInstagramMessages,
  useSyncInstagramMessages,
  useSendInstagramMessage,
  // Priority hooks
  useSetInstagramPriority,
  // Lead hooks
  useCreateLeadFromInstagram,
  // Template hooks
  useInstagramTemplates,
  useCreateInstagramTemplate,
  useUpdateInstagramTemplate,
  useDeleteInstagramTemplate,
  // Scheduled message hooks
  useInstagramScheduledMessages,
  useCancelInstagramScheduledMessage,
  useScheduleInstagramMessage,
} from "./useInstagramIntegration";
