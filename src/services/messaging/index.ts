// src/services/messaging/index.ts

// Main service
export { messagingService, MessagingServiceClass } from "./MessagingService";

// Repositories (extending BaseRepository)
export { MessageThreadRepository } from "./MessageThreadRepository";
export { MessageRepository } from "./MessageRepository";

// Re-export realtime messaging
export * from "./realtimeMessaging";
