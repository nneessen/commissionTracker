// src/services/messaging/index.ts

export {
  messagingService,
  MessagingServiceClass,
  MessagingRepository,
} from "./message";

// Re-export realtime messaging
export * from "./realtimeMessaging";
