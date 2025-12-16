// File: /home/nneessen/projects/commissionTracker/supabase/functions/send-email/index.ts
// Send Email Edge Function - Sends user-composed emails via Resend API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: SendEmailRequest = await req.json();
    const { to, cc, bcc, subject, html, text, from, replyTo } = body;

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

    // Get Resend API key
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
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

    // Build Resend API payload
    const emailPayload: Record<string, unknown> = {
      from,
      to,
      subject,
      html,
    };

    if (text) emailPayload.text = text;
    if (cc && cc.length > 0) emailPayload.cc = cc;
    if (bcc && bcc.length > 0) emailPayload.bcc = bcc;
    if (replyTo) emailPayload.reply_to = replyTo;

    console.log("Sending email via Resend:", {
      from,
      to,
      subject: subject.substring(0, 50),
    });

    // Send via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", response.status, data);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            data.message ||
            data.error ||
            `Resend API error: ${response.status}`,
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
        messageId: data.id,
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
