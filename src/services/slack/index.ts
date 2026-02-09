// src/services/slack/index.ts
export { slackService, default } from "./slackService";
export { userSlackPreferencesService } from "./userSlackPreferencesService";
export { webhookService } from "./webhookService";
export {
  findSelfMadeIntegration,
  findRecruitChannel,
  buildNewRecruitMessage,
  buildNpnReceivedMessage,
  checkNotificationSent,
  sendRecruitNotification,
  autoPostRecruitNotification,
} from "./recruitNotificationService";
