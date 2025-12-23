// src/services/sms/index.ts
export { smsService, SmsService, isValidPhoneNumber } from "./smsService";

export type {
  SendSmsRequest,
  SendSmsResponse,
  SendSmsBulkResult,
} from "./smsService";
