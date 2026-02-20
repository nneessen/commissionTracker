// File: /home/nneessen/projects/commissionTracker/supabase/functions/send-email/index.ts
// Send Email Edge Function - Sends user-composed emails via Mailgun API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[send-email] Function invoked");

    // Get Mailgun credentials FIRST to fail fast
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

    console.log("[send-email] Env check:", {
      hasApiKey: !!MAILGUN_API_KEY,
      apiKeyLength: MAILGUN_API_KEY?.length || 0,
      hasDomain: !!MAILGUN_DOMAIN,
      domain: MAILGUN_DOMAIN || "NOT SET",
    });

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("[send-email] Missing Mailgun credentials");
      return new Response(
        JSON.stringify({
          success: false,
          error: `Email service not configured. API Key: ${!!MAILGUN_API_KEY}, Domain: ${!!MAILGUN_DOMAIN}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: SendEmailRequest = await req.json();
    console.log("[send-email] Request body parsed:", {
      to: body.to,
      subject: body.subject?.substring(0, 30),
      hasHtml: !!body.html,
      from: body.from,
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
          // Continue with other attachments
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
            error: `Total attachment size (${sizeMB}MB) exceeds the 25MB limit. Please reduce the number or size of attachments.`,
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

            // Download the file from storage
            const { data: fileData, error: downloadError } =
              await supabase.storage
                .from("training-documents")
                .download(doc.storagePath);

            if (downloadError) {
              console.error(
                "[send-email] Failed to download attachment:",
                doc.fileName,
                downloadError,
              );
              continue; // Skip this attachment but continue with others
            }

            if (fileData) {
              // Mailgun expects attachments as File or Blob with filename
              const file = new File([fileData], doc.fileName, {
                type: doc.fileType || "application/octet-stream",
              });
              form.append("attachment", file, doc.fileName);
              console.log("[send-email] Attached:", doc.fileName);
            }
          } catch (attachError) {
            console.error(
              "[send-email] Error attaching document:",
              doc.fileName,
              attachError,
            );
            // Continue with other attachments
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
      url: mailgunUrl,
      from,
      to,
      subject: subject.substring(0, 50),
      messageId: finalMessageId,
    });

    // Send via Mailgun API
    let response: Response;
    let data: MailgunResponse;

    try {
      // Use TextEncoder for base64 encoding (more reliable in Deno)
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
        body: responseText.substring(0, 500),
      });

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("[send-email] Failed to parse Mailgun response as JSON");
        return new Response(
          JSON.stringify({
            success: false,
            error: `Mailgun returned non-JSON response: ${responseText.substring(0, 200)}`,
          }),
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
          error: `Failed to connect to Mailgun: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
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
        JSON.stringify({
          success: false,
          error: data.message || `Mailgun API error: ${response.status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Email sent successfully:", data.id);

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
    console.error("Send email error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
