// src/services/sms/smsService.ts
// Service for sending SMS messages via Twilio Edge Function

import { supabase } from "../base/supabase";

/**
 * Request payload for sending an SMS
 */
export interface SendSmsRequest {
  /** Phone number (will be normalized to E.164 by the Edge Function) */
  to: string;
  /** SMS message content (max ~160 chars for single SMS) */
  message: string;
  /** Optional: Recruit ID for logging/tracking */
  recruitId?: string;
  /** Optional: Automation ID for logging/tracking */
  automationId?: string;
  /** Optional: Trigger type for logging */
  trigger?: string;
}

/**
 * Response from the SMS Edge Function
 */
export interface SendSmsResponse {
  success: boolean;
  /** Twilio message SID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from sending SMS to multiple recipients
 */
export interface SendSmsBulkResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

/**
 * Normalize phone number to a consistent format for display/validation
 * This is a client-side normalization; the Edge Function does the final E.164 conversion
 */
function normalizePhoneForValidation(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Basic validation - must have enough digits
  const digitsOnly = cleaned.replace(/\+/g, "");
  if (digitsOnly.length < 10) return null;

  return cleaned;
}

/**
 * Check if a phone number appears valid for SMS
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const normalized = normalizePhoneForValidation(phone);
  if (!normalized) return false;

  // Must have at least 10 digits
  const digitsOnly = normalized.replace(/\+/g, "");
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * SMS Service - handles sending SMS messages via Twilio
 */
class SmsService {
  /**
   * Send a single SMS message
   * @param request - SMS request with recipient and message
   * @returns Response indicating success/failure
   */
  async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    // Validate phone number client-side first
    if (!isValidPhoneNumber(request.to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${request.to}`,
      };
    }

    // Validate message content
    if (!request.message || request.message.trim().length === 0) {
      return {
        success: false,
        error: "Message content cannot be empty",
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: request,
      });

      if (error) {
        console.error("[smsService] Edge function error:", error);
        return {
          success: false,
          error: error.message || "Failed to send SMS",
        };
      }

      // The Edge Function returns { success, messageId?, error? }
      return data as SendSmsResponse;
    } catch (err) {
      console.error("[smsService] Unexpected error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error sending SMS",
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   * @param phoneNumbers - Array of phone numbers
   * @param message - Message to send to all recipients
   * @param metadata - Optional metadata for tracking
   * @returns Bulk result with success/failure counts
   */
  async sendSmsBulk(
    phoneNumbers: string[],
    message: string,
    metadata?: {
      recruitId?: string;
      automationId?: string;
      trigger?: string;
    },
  ): Promise<SendSmsBulkResult> {
    const results: SendSmsBulkResult["results"] = [];
    let successCount = 0;
    let failureCount = 0;

    // Filter to only valid phone numbers
    const validPhones = phoneNumbers.filter((phone) => {
      const isValid = isValidPhoneNumber(phone);
      if (!isValid) {
        console.warn(`[smsService] Skipping invalid phone: ${phone}`);
        results.push({
          to: phone,
          success: false,
          error: "Invalid phone number format",
        });
        failureCount++;
      }
      return isValid;
    });

    // Send to each valid recipient
    // Note: Could be parallelized with Promise.all, but sequential is safer for rate limits
    for (const phone of validPhones) {
      const result = await this.sendSms({
        to: phone,
        message,
        ...metadata,
      });

      results.push({
        to: phone,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      successCount,
      failureCount,
      results,
    };
  }
}

// Singleton instance
export const smsService = new SmsService();
export { SmsService };
