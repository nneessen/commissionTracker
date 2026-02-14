// supabase/functions/gmail-sync-inbox/index.ts
// Sync Gmail inbox for all active integrations
// Called by cron every 5 minutes or manually triggered

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt, encrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface SyncRequest {
  integrationId?: string; // Sync specific integration (manual trigger)
  manual?: boolean; // Manual trigger vs cron
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailPayload;
  raw?: string;
}

interface GmailPayload {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPayload[];
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailBody {
  size: number;
  data?: string;
}

interface GmailHistoryRecord {
  id: string;
  messages?: Array<{ id: string; threadId: string }>;
  messagesAdded?: Array<{ message: GmailMessage }>;
  labelsAdded?: Array<{ message: GmailMessage; labelIds: string[] }>;
  labelsRemoved?: Array<{ message: GmailMessage; labelIds: string[] }>;
}

interface GmailIntegration {
  id: string;
  user_id: string;
  gmail_address: string;
  gmail_name: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  history_id: string | null;
  last_synced_at: string | null;
  api_calls_today: number;
}

const BATCH_SIZE = 50; // Max messages per sync
const MAX_RESULTS = 100; // Gmail API max results per page

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  const startTime = Date.now();

  try {
    console.log("[gmail-sync-inbox] Function invoked");

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[gmail-sync-inbox] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("[gmail-sync-inbox] Missing Google OAuth credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Gmail OAuth not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request
    let body: SyncRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is OK for cron triggers
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get integrations to sync
    let integrations: GmailIntegration[];

    if (body.integrationId) {
      // Sync specific integration
      const { data, error } = await supabase
        .from("gmail_integrations")
        .select("*")
        .eq("id", body.integrationId)
        .eq("is_active", true)
        .eq("connection_status", "connected")
        .single();

      if (error || !data) {
        console.error("[gmail-sync-inbox] Integration not found:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Integration not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      integrations = [data as GmailIntegration];
    } else {
      // Sync all active integrations (cron mode)
      const { data, error } = await supabase
        .from("gmail_integrations")
        .select("*")
        .eq("is_active", true)
        .eq("connection_status", "connected");

      if (error) {
        console.error("[gmail-sync-inbox] Error fetching integrations:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to fetch integrations",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      integrations = (data || []) as GmailIntegration[];
    }

    console.log(
      `[gmail-sync-inbox] Syncing ${integrations.length} integrations`,
    );

    const results: Array<{
      integrationId: string;
      gmail: string;
      messagesSynced: number;
      status: string;
      error?: string;
    }> = [];

    // Process each integration
    for (const integration of integrations) {
      const syncResult = await syncIntegration(
        supabase,
        integration,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
      );
      results.push({
        integrationId: integration.id,
        gmail: integration.gmail_address,
        ...syncResult,
      });
    }

    const duration = Date.now() - startTime;
    const totalSynced = results.reduce((sum, r) => sum + r.messagesSynced, 0);

    console.log(
      `[gmail-sync-inbox] Sync complete: ${totalSynced} messages in ${duration}ms`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        integrations: results.length,
        totalMessagesSynced: totalSynced,
        durationMs: duration,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[gmail-sync-inbox] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// =========================================================================
// Sync a single integration
// =========================================================================
async function syncIntegration(
  supabase: ReturnType<typeof createClient>,
  integration: GmailIntegration,
  clientId: string,
  clientSecret: string,
): Promise<{ messagesSynced: number; status: string; error?: string }> {
  const startTime = Date.now();
  let messagesSynced = 0;
  const historyIdBefore = integration.history_id;
  let historyIdAfter = integration.history_id;

  try {
    console.log(`[gmail-sync-inbox] Syncing ${integration.gmail_address}`);

    // Get access token (refresh if needed)
    const tokenResult = await getValidAccessToken(
      supabase,
      integration,
      clientId,
      clientSecret,
    );

    if (!tokenResult.success) {
      return { messagesSynced: 0, status: "failed", error: tokenResult.error };
    }

    const accessToken = tokenResult.accessToken;

    // Decide sync strategy
    if (!integration.history_id) {
      // No history ID - do initial sync (get recent messages)
      console.log(
        `[gmail-sync-inbox] Initial sync for ${integration.gmail_address}`,
      );
      const result = await initialSync(supabase, integration, accessToken);
      messagesSynced = result.messagesSynced;
      historyIdAfter = result.historyId;
    } else {
      // Have history ID - do incremental sync
      console.log(
        `[gmail-sync-inbox] Incremental sync from historyId: ${integration.history_id}`,
      );
      const result = await incrementalSync(supabase, integration, accessToken);
      messagesSynced = result.messagesSynced;
      historyIdAfter = result.historyId;

      // If incremental sync fails due to expired history, fall back to initial
      if (result.historyExpired) {
        console.log(
          `[gmail-sync-inbox] History expired, falling back to initial sync`,
        );
        const initialResult = await initialSync(
          supabase,
          integration,
          accessToken,
        );
        messagesSynced = initialResult.messagesSynced;
        historyIdAfter = initialResult.historyId;
      }
    }

    // Update integration with new history ID
    await supabase
      .from("gmail_integrations")
      .update({
        history_id: historyIdAfter,
        last_synced_at: new Date().toISOString(),
        api_calls_today: integration.api_calls_today + 1,
      })
      .eq("id", integration.id);

    // Log sync operation
    const duration = Date.now() - startTime;
    await supabase.from("gmail_sync_log").insert({
      integration_id: integration.id,
      sync_type: historyIdBefore ? "incremental" : "full",
      messages_synced: messagesSynced,
      status: "success",
      history_id_before: historyIdBefore,
      history_id_after: historyIdAfter,
      duration_ms: duration,
    });

    return { messagesSynced, status: "success" };
  } catch (err) {
    console.error(
      `[gmail-sync-inbox] Error syncing ${integration.gmail_address}:`,
      err,
    );

    // Log failed sync
    await supabase.from("gmail_sync_log").insert({
      integration_id: integration.id,
      sync_type: historyIdBefore ? "incremental" : "full",
      messages_synced: messagesSynced,
      status: "failed",
      error_message: err instanceof Error ? err.message : "Unknown error",
      history_id_before: historyIdBefore,
      history_id_after: historyIdAfter,
      duration_ms: Date.now() - startTime,
    });

    return {
      messagesSynced,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// =========================================================================
// Initial sync: Get recent INBOX messages
// =========================================================================
async function initialSync(
  supabase: ReturnType<typeof createClient>,
  integration: GmailIntegration,
  accessToken: string,
): Promise<{ messagesSynced: number; historyId: string | null }> {
  // Get list of recent inbox messages
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=${BATCH_SIZE}`;

  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(
      `Failed to list messages: ${listResponse.status} - ${errorText}`,
    );
  }

  const listData = await listResponse.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    console.log(`[gmail-sync-inbox] No messages in inbox`);
    // Still need to get a history ID for future syncs
    const profileResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const profile = await profileResponse.json();
    return { messagesSynced: 0, historyId: profile.historyId };
  }

  // Fetch and process each message
  let synced = 0;
  let latestHistoryId: string | null = null;

  for (const msg of messages) {
    const result = await fetchAndStoreMessage(
      supabase,
      integration,
      accessToken,
      msg.id,
    );

    if (result.success) {
      synced++;
      if (result.historyId) {
        latestHistoryId = result.historyId;
      }
    }
  }

  return { messagesSynced: synced, historyId: latestHistoryId };
}

// =========================================================================
// Incremental sync: Use Gmail History API
// =========================================================================
async function incrementalSync(
  supabase: ReturnType<typeof createClient>,
  integration: GmailIntegration,
  accessToken: string,
): Promise<{
  messagesSynced: number;
  historyId: string | null;
  historyExpired: boolean;
}> {
  // Get history since last sync
  const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${integration.history_id}&labelId=INBOX&maxResults=${MAX_RESULTS}`;

  const historyResponse = await fetch(historyUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (historyResponse.status === 404) {
    // History ID expired (Google only keeps ~7 days)
    console.log(`[gmail-sync-inbox] History ID expired`);
    return { messagesSynced: 0, historyId: null, historyExpired: true };
  }

  if (!historyResponse.ok) {
    const errorText = await historyResponse.text();
    throw new Error(
      `Failed to get history: ${historyResponse.status} - ${errorText}`,
    );
  }

  const historyData = await historyResponse.json();
  const historyRecords = (historyData.history || []) as GmailHistoryRecord[];
  const newHistoryId = historyData.historyId;

  if (historyRecords.length === 0) {
    console.log(`[gmail-sync-inbox] No new history since last sync`);
    return {
      messagesSynced: 0,
      historyId: newHistoryId,
      historyExpired: false,
    };
  }

  // Collect unique message IDs from history (only new messages)
  const messageIds = new Set<string>();

  for (const record of historyRecords) {
    // messagesAdded contains new messages
    if (record.messagesAdded) {
      for (const added of record.messagesAdded) {
        messageIds.add(added.message.id);
      }
    }
  }

  console.log(
    `[gmail-sync-inbox] Found ${messageIds.size} new messages in history`,
  );

  // Fetch and store each new message
  let synced = 0;

  for (const msgId of messageIds) {
    // Check if already exists
    const { data: existing } = await supabase
      .from("user_emails")
      .select("id")
      .eq("gmail_message_id", msgId)
      .maybeSingle();

    if (existing) {
      continue; // Already have this message
    }

    const result = await fetchAndStoreMessage(
      supabase,
      integration,
      accessToken,
      msgId,
    );

    if (result.success) {
      synced++;
    }
  }

  return {
    messagesSynced: synced,
    historyId: newHistoryId,
    historyExpired: false,
  };
}

// =========================================================================
// Fetch a single message and store it
// =========================================================================
async function fetchAndStoreMessage(
  supabase: ReturnType<typeof createClient>,
  integration: GmailIntegration,
  accessToken: string,
  messageId: string,
): Promise<{ success: boolean; historyId?: string }> {
  try {
    // Fetch full message
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

    const msgResponse = await fetch(msgUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!msgResponse.ok) {
      console.error(
        `[gmail-sync-inbox] Failed to fetch message ${messageId}: ${msgResponse.status}`,
      );
      return { success: false };
    }

    const message: GmailMessage = await msgResponse.json();

    // Skip if this is a sent message (we only sync incoming)
    if (
      message.labelIds?.includes("SENT") &&
      !message.labelIds?.includes("INBOX")
    ) {
      return { success: true, historyId: message.historyId };
    }

    // Parse message
    const parsed = parseGmailMessage(message);

    // Find or create internal thread
    let threadId: string | null = null;

    // Check if we have other messages in this Gmail thread
    const { data: existingInThread } = await supabase
      .from("user_emails")
      .select("thread_id")
      .eq("gmail_thread_id", message.threadId)
      .not("thread_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (existingInThread?.thread_id) {
      threadId = existingInThread.thread_id;

      const { data: existingThreadCounts } = await supabase
        .from("email_threads")
        .select("unread_count, message_count")
        .eq("id", threadId)
        .maybeSingle();

      const currentUnread =
        typeof existingThreadCounts?.unread_count === "number"
          ? existingThreadCounts.unread_count
          : 0;
      const currentMessages =
        typeof existingThreadCounts?.message_count === "number"
          ? existingThreadCounts.message_count
          : 0;

      // Update thread
      await supabase
        .from("email_threads")
        .update({
          snippet: parsed.snippet,
          last_message_at: parsed.date,
          unread_count: currentUnread + 1,
          message_count: currentMessages + 1,
        })
        .eq("id", threadId);
    } else {
      // Create new thread
      const subjectHash = (parsed.subject || "")
        .toLowerCase()
        .replace(/^(re:|fwd:|fw:)\s*/gi, "")
        .trim()
        .slice(0, 255);

      const { data: newThread } = await supabase
        .from("email_threads")
        .insert({
          user_id: integration.user_id,
          subject: parsed.subject || "(No subject)",
          subject_hash: subjectHash,
          snippet: parsed.snippet,
          message_count: 1,
          unread_count: 1,
          last_message_at: parsed.date,
          participant_emails: [parsed.from, ...parsed.to],
          is_starred: message.labelIds?.includes("STARRED") || false,
          is_archived: !message.labelIds?.includes("INBOX"),
          labels: message.labelIds || [],
        })
        .select()
        .single();

      threadId = newThread?.id || null;
    }

    // Insert email record
    const { error: insertError } = await supabase.from("user_emails").insert({
      user_id: integration.user_id,
      sender_id: null, // Incoming emails don't have internal sender
      thread_id: threadId,
      from_address: parsed.from,
      to_addresses: parsed.to,
      cc_addresses: parsed.cc,
      subject: parsed.subject || "(No subject)",
      body_html: parsed.bodyHtml,
      body_text: parsed.bodyText,
      is_incoming: true,
      is_read: !message.labelIds?.includes("UNREAD"),
      status: "received",
      email_provider: "gmail",
      gmail_message_id: message.id,
      gmail_thread_id: message.threadId,
      gmail_label_ids: message.labelIds,
      gmail_history_id: message.historyId,
      message_id_header: parsed.messageId,
      in_reply_to_header: parsed.inReplyTo,
      references_header: parsed.references,
      created_at: parsed.date,
    });

    if (insertError) {
      // Check if duplicate (gmail_message_id unique constraint)
      if (insertError.code === "23505") {
        console.log(
          `[gmail-sync-inbox] Message ${messageId} already exists, skipping`,
        );
        return { success: true, historyId: message.historyId };
      }
      console.error(
        `[gmail-sync-inbox] Failed to insert message ${messageId}:`,
        insertError,
      );
      return { success: false };
    }

    return { success: true, historyId: message.historyId };
  } catch (err) {
    console.error(
      `[gmail-sync-inbox] Error processing message ${messageId}:`,
      err,
    );
    return { success: false };
  }
}

// =========================================================================
// Parse Gmail message into our format
// =========================================================================
interface ParsedMessage {
  from: string;
  to: string[];
  cc: string[];
  subject: string | null;
  bodyHtml: string;
  bodyText: string;
  snippet: string;
  date: string;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
}

function parseGmailMessage(message: GmailMessage): ParsedMessage {
  const headers = message.payload?.headers || [];

  // Extract headers
  const getHeader = (name: string): string | null => {
    const header = headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    );
    return header?.value || null;
  };

  const from = getHeader("From") || "";
  const toHeader = getHeader("To") || "";
  const ccHeader = getHeader("Cc") || "";
  const subject = getHeader("Subject");
  const messageId = getHeader("Message-ID");
  const inReplyTo = getHeader("In-Reply-To");
  const referencesHeader = getHeader("References");
  const dateHeader = getHeader("Date");

  // Parse recipients
  const parseAddresses = (header: string): string[] => {
    if (!header) return [];
    return header
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);
  };

  const to = parseAddresses(toHeader);
  const cc = parseAddresses(ccHeader);
  const references = referencesHeader
    ? referencesHeader.split(/\s+/).filter((r) => r)
    : [];

  // Parse date
  let date: string;
  if (message.internalDate) {
    date = new Date(parseInt(message.internalDate)).toISOString();
  } else if (dateHeader) {
    try {
      date = new Date(dateHeader).toISOString();
    } catch {
      date = new Date().toISOString();
    }
  } else {
    date = new Date().toISOString();
  }

  // Extract body
  const { html, text } = extractBody(message.payload);

  return {
    from,
    to,
    cc,
    subject,
    bodyHtml: html,
    bodyText: text,
    snippet: message.snippet || text.slice(0, 200),
    date,
    messageId,
    inReplyTo,
    references,
  };
}

// =========================================================================
// Extract body content from Gmail payload
// =========================================================================
function extractBody(payload?: GmailPayload): { html: string; text: string } {
  if (!payload) {
    return { html: "", text: "" };
  }

  let html = "";
  let text = "";

  // Check if this part has body data
  if (payload.body?.data) {
    const decoded = base64UrlDecode(payload.body.data);
    if (payload.mimeType === "text/html") {
      html = decoded;
    } else if (payload.mimeType === "text/plain") {
      text = decoded;
    }
  }

  // Recursively check parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const partBody = extractBody(part);
      if (partBody.html && !html) html = partBody.html;
      if (partBody.text && !text) text = partBody.text;
    }
  }

  // If no text but have HTML, strip tags
  if (!text && html) {
    text = stripHtml(html);
  }

  return { html, text };
}

// =========================================================================
// Base64URL decode
// =========================================================================
function base64UrlDecode(encoded: string): string {
  // Convert base64url to regular base64
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");

  // Pad if necessary
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    const decoded = atob(padded);
    // Convert to UTF-8
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

// =========================================================================
// Strip HTML
// =========================================================================
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// =========================================================================
// Get valid access token (refresh if needed)
// =========================================================================
async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  integration: GmailIntegration,
  clientId: string,
  clientSecret: string,
): Promise<{ success: boolean; accessToken: string; error?: string }> {
  try {
    // Decrypt current access token
    let accessToken = await decrypt(integration.access_token_encrypted);

    // Check if token is expired (with 5 minute buffer)
    const tokenExpiry = new Date(integration.token_expires_at);
    if (tokenExpiry.getTime() < Date.now() + 5 * 60 * 1000) {
      console.log(`[gmail-sync-inbox] Token expired, refreshing...`);

      // Decrypt refresh token
      const refreshToken = await decrypt(integration.refresh_token_encrypted);

      // Exchange refresh token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error || !tokenData.access_token) {
        console.error(
          `[gmail-sync-inbox] Token refresh failed:`,
          tokenData.error,
        );

        // Mark integration as expired
        await supabase
          .from("gmail_integrations")
          .update({
            connection_status: "expired",
            last_error: `Token refresh failed: ${tokenData.error}`,
            last_error_at: new Date().toISOString(),
          })
          .eq("id", integration.id);

        return {
          success: false,
          accessToken: "",
          error: "Token refresh failed",
        };
      }

      // Store new access token
      accessToken = tokenData.access_token;
      const encryptedToken = await encrypt(accessToken);
      const expiresAt = new Date(
        Date.now() + (tokenData.expires_in || 3600) * 1000,
      );

      await supabase
        .from("gmail_integrations")
        .update({
          access_token_encrypted: encryptedToken,
          token_expires_at: expiresAt.toISOString(),
          last_refresh_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      console.log(`[gmail-sync-inbox] Token refreshed successfully`);
    }

    return { success: true, accessToken };
  } catch (err) {
    console.error(`[gmail-sync-inbox] Error getting access token:`, err);
    return {
      success: false,
      accessToken: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
