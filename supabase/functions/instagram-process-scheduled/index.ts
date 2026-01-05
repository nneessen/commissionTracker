// supabase/functions/instagram-process-scheduled/index.ts
// CRON function to process Instagram scheduled messages
// Runs every 5 minutes to:
// 1. Expire messages whose windows have closed
// 2. Send due scheduled messages
// 3. Queue auto-reminders for priority conversations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

interface _ScheduledMessageRecord {
  id: string;
  conversation_id: string;
  message_text: string;
  template_id: string | null;
  scheduled_for: string;
  messaging_window_expires_at: string;
  retry_count: number;
  is_auto_reminder: boolean;
}

interface IntegrationData {
  id: string;
  instagram_user_id: string;
  instagram_username: string;
  access_token_encrypted: string;
}

interface ConversationData {
  id: string;
  participant_instagram_id: string;
  integration: IntegrationData;
}

interface ProcessResult {
  expired: number;
  sent: number;
  failed: number;
  autoRemindersQueued: number;
  errors: string[];
}

serve(async (req) => {
  // Handle OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify CRON authorization
  const authHeader = req.headers.get("Authorization");
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Allow either CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY for auth
  const isAuthorized =
    authHeader === `Bearer ${CRON_SECRET}` ||
    authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isAuthorized) {
    console.error("[instagram-process-scheduled] Unauthorized request");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result: ProcessResult = {
    expired: 0,
    sent: 0,
    failed: 0,
    autoRemindersQueued: 0,
    errors: [],
  };

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    // Step 1: Expire messages whose windows have closed
    console.log("[instagram-process-scheduled] Expiring past-window messages");
    const expiredCount = await expirePastWindowMessages(supabase, now);
    result.expired = expiredCount;

    // Step 2: Send due scheduled messages
    console.log("[instagram-process-scheduled] Sending due messages");
    const sendResult = await sendDueMessages(supabase, now);
    result.sent = sendResult.sent;
    result.failed = sendResult.failed;
    result.errors.push(...sendResult.errors);

    // Step 3: Queue auto-reminders for priority conversations
    console.log("[instagram-process-scheduled] Queueing auto-reminders");
    const autoReminderCount = await queueAutoReminders(supabase, now);
    result.autoRemindersQueued = autoReminderCount;

    console.log("[instagram-process-scheduled] Complete:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[instagram-process-scheduled] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage, result }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Mark scheduled messages as expired if their window has closed
 */
async function expirePastWindowMessages(
  supabase: ReturnType<typeof createClient>,
  now: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("instagram_scheduled_messages")
    .update({
      status: "expired",
      error_message: "Messaging window expired before scheduled send time",
      updated_at: now,
    })
    .eq("status", "pending")
    .lt("messaging_window_expires_at", now)
    .select("id");

  if (error) {
    console.error(
      "[instagram-process-scheduled] Error expiring messages:",
      error,
    );
    return 0;
  }

  return data?.length || 0;
}

/**
 * Process a single scheduled message - extracted for parallel execution
 */
async function processSingleMessage(
  supabase: ReturnType<typeof createClient>,
  msg: {
    id: string;
    conversation_id: string;
    message_text: string;
    template_id: string | null;
    retry_count: number;
    conversation: unknown;
  },
  accessToken: string,
  now: string,
): Promise<{ success: boolean; error?: string }> {
  const conversation = msg.conversation as ConversationData;
  const integration = conversation.integration;

  try {
    // Send via Meta Graph API
    const apiUrl = `https://graph.facebook.com/v18.0/${integration.instagram_user_id}/messages`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: conversation.participant_instagram_id },
        message: { text: msg.message_text },
        access_token: accessToken,
      }),
    });

    const apiResult = await response.json();

    if (apiResult.error) {
      console.error(
        `[instagram-process-scheduled] API error for ${msg.id}:`,
        apiResult.error,
      );

      // Handle token expiration
      if (
        apiResult.error.code === 190 ||
        apiResult.error.type === "OAuthException"
      ) {
        await supabase
          .from("instagram_integrations")
          .update({
            connection_status: "expired",
            last_error: apiResult.error.message,
            last_error_at: now,
          })
          .eq("id", integration.id);
      }

      // Handle window closed error
      if (
        apiResult.error.code === 10 ||
        apiResult.error.error_subcode === 2018278
      ) {
        await supabase
          .from("instagram_scheduled_messages")
          .update({
            status: "expired",
            error_message: "Messaging window closed",
            updated_at: now,
          })
          .eq("id", msg.id);
      } else {
        await markMessageFailed(
          supabase,
          msg.id,
          apiResult.error.message,
          msg.retry_count,
          now,
        );
      }

      return { success: false, error: apiResult.error.message };
    }

    // Success - store sent message and update records in parallel
    const sentMsgId = apiResult.message_id;

    await Promise.all([
      // Insert the sent message
      supabase.from("instagram_messages").insert({
        conversation_id: conversation.id,
        instagram_message_id: sentMsgId,
        message_text: msg.message_text,
        message_type: "text",
        direction: "outbound",
        status: "sent",
        sender_instagram_id: integration.instagram_user_id,
        sender_username: integration.instagram_username,
        sent_at: now,
        template_id: msg.template_id,
        scheduled_message_id: msg.id,
      }),

      // Mark scheduled message as sent
      supabase
        .from("instagram_scheduled_messages")
        .update({
          status: "sent",
          sent_at: now,
          sent_message_id: sentMsgId,
          updated_at: now,
        })
        .eq("id", msg.id),

      // Update conversation last message
      supabase
        .from("instagram_conversations")
        .update({
          last_message_at: now,
          last_message_preview: msg.message_text.substring(0, 100),
          last_message_direction: "outbound",
        })
        .eq("id", conversation.id),

      // Increment template use count if applicable
      msg.template_id
        ? supabase.rpc("increment_template_use_count", {
            p_template_id: msg.template_id,
          })
        : Promise.resolve(),
    ]);

    console.log(`[instagram-process-scheduled] Sent message ${msg.id}`);
    return { success: true };
  } catch (err) {
    console.error(
      `[instagram-process-scheduled] Error sending ${msg.id}:`,
      err,
    );
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await markMessageFailed(supabase, msg.id, errorMsg, msg.retry_count, now);
    return { success: false, error: errorMsg };
  }
}

/**
 * Process messages in batches with concurrency control
 * @param items - Items to process
 * @param processor - Async function to process each item
 * @param concurrency - Max parallel operations (default 5)
 */
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency = 5,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Send scheduled messages that are due - parallelized for performance
 * Previously: 50 messages processed serially = 10+ seconds
 * Now: 50 messages in batches of 5 = ~2 seconds
 */
async function sendDueMessages(
  supabase: ReturnType<typeof createClient>,
  now: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const result = { sent: 0, failed: 0, errors: [] as string[] };

  // Find due messages with their conversation and integration data
  const { data: messages, error } = await supabase
    .from("instagram_scheduled_messages")
    .select(
      `
      id,
      conversation_id,
      message_text,
      template_id,
      scheduled_for,
      messaging_window_expires_at,
      retry_count,
      is_auto_reminder,
      conversation:instagram_conversations!inner (
        id,
        participant_instagram_id,
        integration:instagram_integrations!inner (
          id,
          instagram_user_id,
          instagram_username,
          access_token_encrypted,
          is_active,
          connection_status
        )
      )
    `,
    )
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .gt("messaging_window_expires_at", now)
    .lt("retry_count", 3)
    .limit(50);

  if (error) {
    console.error(
      "[instagram-process-scheduled] Error fetching due messages:",
      error,
    );
    result.errors.push(error.message);
    return result;
  }

  if (!messages || messages.length === 0) {
    return result;
  }

  console.log(
    `[instagram-process-scheduled] Found ${messages.length} messages to send (parallel processing)`,
  );

  // Group messages by integration to batch decrypt tokens
  const messagesByIntegration = new Map<
    string,
    {
      integration: IntegrationData & {
        is_active: boolean;
        connection_status: string;
      };
      messages: typeof messages;
    }
  >();

  for (const msg of messages) {
    const conversation = msg.conversation as unknown as ConversationData;
    const integration = conversation?.integration as IntegrationData & {
      is_active: boolean;
      connection_status: string;
    };

    if (
      !integration?.is_active ||
      integration?.connection_status !== "connected"
    ) {
      console.log(
        `[instagram-process-scheduled] Skipping message ${msg.id} - integration not active`,
      );
      continue;
    }

    const key = integration.id;
    if (!messagesByIntegration.has(key)) {
      messagesByIntegration.set(key, { integration, messages: [] });
    }
    messagesByIntegration.get(key)!.messages.push(msg);
  }

  // Process each integration's messages in parallel
  for (const [
    integrationId,
    { integration, messages: integrationMessages },
  ] of messagesByIntegration) {
    // Decrypt token once per integration
    let accessToken: string;
    try {
      accessToken = await decrypt(integration.access_token_encrypted);
    } catch (err) {
      console.error(
        `[instagram-process-scheduled] Token decrypt failed for integration ${integrationId}:`,
        err,
      );

      // Mark integration as expired
      await supabase
        .from("instagram_integrations")
        .update({
          connection_status: "expired",
          last_error: "Token decryption failed",
          last_error_at: now,
        })
        .eq("id", integrationId);

      // Mark all messages for this integration as failed
      for (const msg of integrationMessages) {
        await markMessageFailed(
          supabase,
          msg.id,
          "Token decryption failed",
          msg.retry_count,
          now,
        );
        result.failed++;
      }
      continue;
    }

    // Process messages for this integration in parallel with concurrency limit
    // Limit to 5 concurrent API calls to avoid rate limiting
    const processingResults = await processWithConcurrency(
      integrationMessages,
      (msg) => processSingleMessage(supabase, msg, accessToken, now),
      5,
    );

    // Aggregate results
    for (let i = 0; i < processingResults.length; i++) {
      const processResult = processingResults[i];
      const msg = integrationMessages[i];

      if (processResult.status === "fulfilled" && processResult.value.success) {
        result.sent++;
      } else {
        result.failed++;
        const errorMsg =
          processResult.status === "rejected"
            ? processResult.reason?.message || "Unknown error"
            : processResult.value.error || "Unknown error";
        result.errors.push(`Message ${msg.id}: ${errorMsg}`);
      }
    }
  }

  console.log(
    `[instagram-process-scheduled] Parallel processing complete: ${result.sent} sent, ${result.failed} failed`,
  );

  return result;
}

/**
 * Mark a message as failed with retry logic
 */
async function markMessageFailed(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
  errorMessage: string,
  currentRetryCount: number,
  now: string,
): Promise<void> {
  const newRetryCount = currentRetryCount + 1;
  const newStatus = newRetryCount >= 3 ? "failed" : "pending";

  await supabase
    .from("instagram_scheduled_messages")
    .update({
      status: newStatus,
      error_message: errorMessage,
      retry_count: newRetryCount,
      updated_at: now,
    })
    .eq("id", messageId);
}

/**
 * Queue auto-reminders for priority conversations that need them
 */
async function queueAutoReminders(
  supabase: ReturnType<typeof createClient>,
  now: string,
): Promise<number> {
  // Find priority conversations with opt-in auto-reminders that need a reminder
  // Conditions:
  // - is_priority = true
  // - auto_reminder_enabled = true
  // - window is open (can_reply_until > now)
  // - last outbound message was more than auto_reminder_hours ago
  // - no pending auto-reminder exists

  const { data: conversations, error } = await supabase
    .from("instagram_conversations")
    .select(
      `
      id,
      auto_reminder_template_id,
      auto_reminder_hours,
      last_message_at,
      can_reply_until,
      integration:instagram_integrations!inner (
        id,
        user_id
      )
    `,
    )
    .eq("is_priority", true)
    .eq("auto_reminder_enabled", true)
    .eq("last_message_direction", "outbound")
    .gt("can_reply_until", now);

  if (error || !conversations) {
    console.error(
      "[instagram-process-scheduled] Error fetching auto-reminder candidates:",
      error,
    );
    return 0;
  }

  let queued = 0;

  for (const conv of conversations) {
    // Check if enough time has passed since last outbound message
    const lastMessageAt = conv.last_message_at
      ? new Date(conv.last_message_at)
      : null;
    const hoursThreshold = conv.auto_reminder_hours || 12;

    if (!lastMessageAt) continue;

    const hoursSinceLastMessage =
      (Date.now() - lastMessageAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastMessage < hoursThreshold) {
      continue;
    }

    // Check if there's already a pending auto-reminder
    const { data: existingReminder } = await supabase
      .from("instagram_scheduled_messages")
      .select("id")
      .eq("conversation_id", conv.id)
      .eq("status", "pending")
      .eq("is_auto_reminder", true)
      .limit(1)
      .single();

    if (existingReminder) {
      continue;
    }

    // Get template content or use default
    let reminderText = "Just checking in - did you have any questions?";

    if (conv.auto_reminder_template_id) {
      const { data: template } = await supabase
        .from("instagram_message_templates")
        .select("content")
        .eq("id", conv.auto_reminder_template_id)
        .eq("is_active", true)
        .single();

      if (template) {
        reminderText = template.content;
      }
    }

    // Type assertion for nested join data
    const integration = conv.integration as unknown as {
      id: string;
      user_id: string;
    };

    // Queue the auto-reminder for immediate sending
    const { error: insertError } = await supabase
      .from("instagram_scheduled_messages")
      .insert({
        conversation_id: conv.id,
        message_text: reminderText,
        template_id: conv.auto_reminder_template_id,
        scheduled_for: now,
        scheduled_by: integration.user_id,
        messaging_window_expires_at: conv.can_reply_until,
        status: "pending",
        is_auto_reminder: true,
        retry_count: 0,
      });

    if (insertError) {
      console.error(
        `[instagram-process-scheduled] Error queueing auto-reminder for ${conv.id}:`,
        insertError,
      );
      continue;
    }

    console.log(
      `[instagram-process-scheduled] Queued auto-reminder for ${conv.id}`,
    );
    queued++;
  }

  return queued;
}
