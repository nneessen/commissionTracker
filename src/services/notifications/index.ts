// src/services/notifications/index.ts

export {
  notificationService,
  NotificationServiceClass,
  NotificationRepository,
} from "./notification";

// Re-export realtime notifications
export { subscribeToNotifications } from "./realtimeNotifications";
