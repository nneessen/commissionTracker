// File: supabase/functions/send-email/index.ts
// Send Email Edge Function - Sends user-composed emails via Mailgun API
// AUTH: Requires valid authenticated session or service_role key match.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// File attachment (base64 encoded)
interface FileAttachment {
  filename: string;
  content: string; // base64 encoded
  mimeType: string;
}

// Training document attachment info
interface TrainingDocumentAttachment {
  id: string;
  name: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
}

interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  from: string;
  replyTo?: string;
  trackingId?: string;
  userId?: string;
  threadId?: string;
  // Threading headers for proper email threading
  messageId?: string; // Our generated Message-ID
  inReplyTo?: string; // Message-ID of email we're replying to
  references?: string[]; // Chain of Message-IDs in thread
  // Attachments
  attachments?: FileAttachment[]; // Regular file attachments (base64)
  trainingDocuments?: TrainingDocumentAttachment[]; // Training library documents
}

interface MailgunResponse {
  id: string;
  message: string;
}

const ALLOWED_KEYS = new Set([
  "to",
  "cc",
  "bcc",
  "subject",
  "html",
  "text",
  "from",
  "replyTo",
  "trackingId",
  "userId",
  "threadId",
  "messageId",
  "inReplyTo",
  "references",
  "attachments",
  "trainingDocuments",
  // Passed by client callers (pipelineAutomationService, UserEmailService)
  "recruitId",
  "senderId",
  "metadata",
  // Passed by ActionConfigPanel (legacy — maps to html/text server-side)
  "bodyHtml",
  "bodyText",
]);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[send-email] Function invoked");

    // ========== AUTH CHECK ==========
    // Two valid callers:
    // 1. service_role: edge-to-edge calls — verify by comparing raw token to env var
    // 2. authenticated user: any logged-in user — verify via supabaseAdmin.auth.getUser()
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const bearerToken = authHeader.slice(7);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (bearerToken === SUPABASE_SERVICE_ROLE_KEY) {
      // Exact match against the known service_role key — trusted server-to-server call
      console.log("[send-email] Auth: service_role verified");
    } else {
      // Must be a valid authenticated user session
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Server configuration error",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const supabaseAdmin = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        },
      );
      // getUser() verifies the JWT signature server-side against Supabase's signing key
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(bearerToken);
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      console.log("[send-email] Auth: user verified, id:", userData.user.id);
    }
    // ========== END AUTH CHECK ==========

    // Get Mailgun credentials FIRST to fail fast
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

    console.log("[send-email] Env check:", {
      hasApiKey: !!MAILGUN_API_KEY,
      hasDomain: !!MAILGUN_DOMAIN,
    });

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("[send-email] Missing Mailgun credentials");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: SendEmailRequest = await req.json();

    // Reject unknown keys
    const unknownKeys = Object.keys(body).filter((k) => !ALLOWED_KEYS.has(k));
    if (unknownKeys.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Unknown fields in request" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[send-email] Request:", {
      recipientCount: body.to?.length,
      subject: body.subject?.substring(0, 30),
      hasHtml: !!body.html,
      hasSender: !!body.from,
    });

    const {
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      from,
      replyTo,
      messageId,
      inReplyTo,
      references,
      attachments,
      trainingDocuments,
    } = body;

    // Validate required fields
    if (!to || to.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'to' recipients" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!subject) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'subject'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!html) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'html' body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!from) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'from' address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate Message-ID if not provided (for threading)
    const finalMessageId =
      messageId || `<${crypto.randomUUID()}@${MAILGUN_DOMAIN}>`;

    // Build form data for Mailgun API
    const form = new FormData();
    form.append("from", from);
    form.append("to", to.join(", "));
    form.append("subject", subject);
    form.append("html", html);

    if (text) {
      form.append("text", text);
    }

    if (cc && cc.length > 0) {
      form.append("cc", cc.join(", "));
    }

    if (bcc && bcc.length > 0) {
      form.append("bcc", bcc.join(", "));
    }

    if (replyTo) {
      form.append("h:Reply-To", replyTo);
    }

    // Add threading headers
    form.append("h:Message-Id", finalMessageId);

    if (inReplyTo) {
      form.append("h:In-Reply-To", inReplyTo);
    }

    if (references && references.length > 0) {
      form.append("h:References", references.join(" "));
    }

    // Enable tracking
    form.append("o:tracking", "yes");
    form.append("o:tracking-clicks", "yes");
    form.append("o:tracking-opens", "yes");

    // Handle regular file attachments (base64 encoded)
    if (attachments && attachments.length > 0) {
      console.log(
        "[send-email] Processing file attachments:",
        attachments.length,
      );

      for (const attachment of attachments) {
        try {
          // Decode base64 to binary
          const binaryString = atob(attachment.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Create a File object
          const file = new File([bytes], attachment.filename, {
            type: attachment.mimeType || "application/octet-stream",
          });

          form.append("attachment", file, attachment.filename);
          console.log("[send-email] Attached file:", attachment.filename);
        } catch (attachError) {
          console.error(
            "[send-email] Error processing attachment:",
            attachment.filename,
            attachError,
          );
        }
      }
    }

    // Handle training document attachments
    if (trainingDocuments && trainingDocuments.length > 0) {
      console.log(
        "[send-email] Processing training document attachments:",
        trainingDocuments.length,
      );

      // Validate total attachment size (Mailgun limit is 25MB)
      const MAX_TOTAL_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB
      const totalAttachmentSize = trainingDocuments.reduce(
        (sum, doc) => sum + (doc.fileSize || 0),
        0,
      );

      if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE) {
        const sizeMB = (totalAttachmentSize / 1024 / 1024).toFixed(1);
        console.error(
          `[send-email] Total attachment size ${sizeMB}MB exceeds 25MB limit`,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: `Total attachment size (${sizeMB}MB) exceeds the 25MB limit.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Initialize Supabase client for storage access
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const doc of trainingDocuments) {
          try {
            console.log("[send-email] Downloading attachment:", doc.fileName);

            const { data: fileData, error: downloadError } =
              await supabase.storage
                .from("training-documents")
                .download(doc.storagePath);

            if (downloadError) {
              console.error(
                "[send-email] Failed to download:",
                doc.fileName,
                downloadError,
              );
              continue;
            }

            if (fileData) {
              const file = new File([fileData], doc.fileName, {
                type: doc.fileType || "application/octet-stream",
              });
              form.append("attachment", file, doc.fileName);
              console.log("[send-email] Attached:", doc.fileName);
            }
          } catch (attachError) {
            console.error(
              "[send-email] Error attaching:",
              doc.fileName,
              attachError,
            );
          }
        }
      } else {
        console.warn(
          "[send-email] Missing Supabase credentials for attachment download",
        );
      }
    }

    const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
    console.log("[send-email] Sending to Mailgun:", {
      recipientCount: to.length,
      subject: subject.substring(0, 50),
      messageId: finalMessageId,
    });

    // Send via Mailgun API
    let response: Response;
    let data: MailgunResponse;

    try {
      const credentials = `api:${MAILGUN_API_KEY}`;
      const encoder = new TextEncoder();
      const credentialsBytes = encoder.encode(credentials);
      const base64Credentials = btoa(String.fromCharCode(...credentialsBytes));

      response = await fetch(mailgunUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Credentials}`,
        },
        body: form,
      });

      const responseText = await response.text();
      console.log("[send-email] Mailgun response:", {
        status: response.status,
        statusText: response.statusText,
      });

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("[send-email] Failed to parse Mailgun response as JSON");
        return new Response(
          JSON.stringify({ success: false, error: "Email service error" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } catch (fetchError) {
      console.error("[send-email] Fetch to Mailgun failed:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to connect to email service",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!response.ok) {
      console.error("[send-email] Mailgun API error:", response.status, data);
      return new Response(
        JSON.stringify({ success: false, error: "Email service error" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[send-email] Email sent successfully:", data.id);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: finalMessageId,
        mailgunId: data.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[send-email] Error:", err);

    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
