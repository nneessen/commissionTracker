// supabase/functions/send-sms/index.ts
// Send SMS Edge Function - Sends SMS messages via Twilio API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendSmsRequest {
  to: string; // Phone number (will be normalized to E.164)
  message: string; // SMS body content
  // Optional metadata for logging
  recruitId?: string;
  automationId?: string;
  trigger?: string;
}

interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface TwilioMessageResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

/**
 * Normalize phone number to E.164 format
 * Handles common US formats: (555) 123-4567, 555-123-4567, 5551234567, +15551234567
 */
function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // If starts with +, validate it's a full international number
  if (cleaned.startsWith("+")) {
    // Already in international format, validate length
    if (cleaned.length >= 11 && cleaned.length <= 15) {
      return cleaned;
    }
    return null;
  }

  // Handle US numbers
  if (cleaned.length === 10) {
    // Standard 10-digit US number
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
    // 11-digit with leading 1
    return `+${cleaned}`;
  }

  // Invalid format
  return null;
}

/**
 * Validate E.164 phone number format
 */
function isValidE164(phone: string): boolean {
  // E.164 format: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[send-sms] Function invoked");

    // Get Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER =
      Deno.env.get("MY_TWILIO_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");

    console.log("[send-sms] Env check:", {
      hasAccountSid: !!TWILIO_ACCOUNT_SID,
      hasAuthToken: !!TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!TWILIO_PHONE_NUMBER,
    });

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("[send-sms] Missing Twilio credentials");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS service not configured. Missing Twilio credentials.",
        } as SendSmsResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Normalize the Twilio phone number (from number)
    const fromNumber = normalizePhoneNumber(TWILIO_PHONE_NUMBER);
    if (!fromNumber) {
      console.error("[send-sms] Invalid Twilio phone number configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid Twilio phone number configuration",
        } as SendSmsResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: SendSmsRequest = await req.json();
    console.log("[send-sms] Request received:", {
      to: body.to,
      messageLength: body.message?.length,
      recruitId: body.recruitId,
      automationId: body.automationId,
    });

    const { to, message, recruitId, automationId, trigger } = body;

    // Validate required fields
    if (!to) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing 'to' phone number",
        } as SendSmsResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing 'message' body",
        } as SendSmsResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Normalize the recipient phone number
    const toNumber = normalizePhoneNumber(to);
    if (!toNumber || !isValidE164(toNumber)) {
      console.error("[send-sms] Invalid phone number:", to);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid phone number format: ${to}. Must be a valid US or international number.`,
        } as SendSmsResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // Prepare form data for Twilio
    const formData = new URLSearchParams();
    formData.append("To", toNumber);
    formData.append("From", fromNumber);
    formData.append("Body", message);

    // Add status callback URL if we have one configured
    const statusCallbackUrl = Deno.env.get("TWILIO_STATUS_CALLBACK_URL");
    if (statusCallbackUrl) {
      formData.append("StatusCallback", statusCallbackUrl);
    }

    console.log("[send-sms] Sending to Twilio:", {
      to: toNumber,
      from: fromNumber,
      messagePreview: message.substring(0, 50),
    });

    // Send via Twilio API
    const credentials = `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`;
    const encoder = new TextEncoder();
    const credentialsBytes = encoder.encode(credentials);
    const base64Credentials = btoa(String.fromCharCode(...credentialsBytes));

    let response: Response;
    let data: TwilioMessageResponse;

    try {
      response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const responseText = await response.text();
      console.log("[send-sms] Twilio response:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500),
      });

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("[send-sms] Failed to parse Twilio response as JSON");
        return new Response(
          JSON.stringify({
            success: false,
            error: `Twilio returned non-JSON response: ${responseText.substring(0, 200)}`,
          } as SendSmsResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } catch (fetchError) {
      console.error("[send-sms] Fetch to Twilio failed:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to connect to Twilio: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
        } as SendSmsResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check for Twilio errors
    if (!response.ok || data.error_code) {
      console.error("[send-sms] Twilio API error:", {
        status: response.status,
        errorCode: data.error_code,
        errorMessage: data.error_message,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error_message || `Twilio API error: ${response.status}`,
        } as SendSmsResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[send-sms] SMS sent successfully:", {
      sid: data.sid,
      status: data.status,
      to: toNumber,
      recruitId,
      automationId,
      trigger,
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.sid,
      } as SendSmsResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[send-sms] Unexpected error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      } as SendSmsResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
