// supabase/functions/docuseal/index.ts
// Edge Function to proxy DocuSeal API calls, keeping API key server-side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

const DOCUSEAL_API_BASE = "https://api.docuseal.com";

interface DocuSealSubmitterRequest {
  email: string;
  name?: string;
  role?: string;
  phone?: string;
  values?: Record<string, string>;
  send_email?: boolean;
}

interface CreateSubmissionRequest {
  template_id: number;
  submitters: DocuSealSubmitterRequest[];
  send_email?: boolean;
  message?: {
    subject?: string;
    body?: string;
  };
  expire_at?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get DocuSeal API key from secrets
    const DOCUSEAL_API_KEY = Deno.env.get("DOCUSEAL_API_KEY");
    if (!DOCUSEAL_API_KEY) {
      console.error("[docuseal] DOCUSEAL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "DocuSeal API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse the URL to determine the action
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path format: /docuseal/action or /docuseal/action/id
    // After the function name, we get: ["action"] or ["action", "id"]

    // Get action from request body or URL
    const body = req.method !== "GET" ? await req.json() : null;
    const action = body?.action || pathParts[pathParts.length - 1] || "unknown";

    console.log(`[docuseal] Received request: ${req.method} action=${action}`);

    // Route to appropriate handler
    switch (action) {
      case "create-submission": {
        if (req.method !== "POST") {
          return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const submissionData: CreateSubmissionRequest = body.data;

        if (
          !submissionData?.template_id ||
          !submissionData?.submitters?.length
        ) {
          return new Response(
            JSON.stringify({
              error: "template_id and submitters are required",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        console.log(
          `[docuseal] Creating submission for template ${submissionData.template_id} with ${submissionData.submitters.length} submitters`,
        );

        const response = await fetch(`${DOCUSEAL_API_BASE}/submissions`, {
          method: "POST",
          headers: {
            "X-Auth-Token": DOCUSEAL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionData),
        });

        const responseData = await response.json();

        if (!response.ok) {
          console.error(
            `[docuseal] API error: ${response.status}`,
            responseData,
          );
          return new Response(
            JSON.stringify({
              error: "DocuSeal API error",
              details: responseData,
              status: response.status,
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // DocuSeal returns an array of submitters, not a submission object
        // Transform to our expected format: { id: submission_id, submitters: [...] }
        const submitters = Array.isArray(responseData)
          ? responseData
          : [responseData];
        const submissionId = submitters[0]?.submission_id;

        const transformedResponse = {
          id: submissionId,
          submitters: submitters.map((s: any) => ({
            id: s.id,
            submission_id: s.submission_id,
            email: s.email,
            name: s.name,
            status: s.status,
            role: s.role,
            embed_src: s.embed_src,
            sent_at: s.sent_at,
            opened_at: s.opened_at,
            completed_at: s.completed_at,
            declined_at: s.declined_at,
          })),
        };

        console.log(
          `[docuseal] Submission created: ${submissionId}, submitters: ${submitters.length}`,
        );

        return new Response(JSON.stringify(transformedResponse), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-submission": {
        const submissionId = body?.submission_id;

        if (!submissionId) {
          return new Response(
            JSON.stringify({ error: "submission_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        console.log(`[docuseal] Getting submission ${submissionId}`);

        const response = await fetch(
          `${DOCUSEAL_API_BASE}/submissions/${submissionId}`,
          {
            method: "GET",
            headers: {
              "X-Auth-Token": DOCUSEAL_API_KEY,
            },
          },
        );

        const responseData = await response.json();

        if (!response.ok) {
          console.error(
            `[docuseal] API error: ${response.status}`,
            responseData,
          );
          return new Response(
            JSON.stringify({
              error: "DocuSeal API error",
              details: responseData,
              status: response.status,
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list-templates": {
        console.log("[docuseal] Listing templates");

        const response = await fetch(`${DOCUSEAL_API_BASE}/templates`, {
          method: "GET",
          headers: {
            "X-Auth-Token": DOCUSEAL_API_KEY,
          },
        });

        const responseData = await response.json();

        if (!response.ok) {
          console.error(
            `[docuseal] API error: ${response.status}`,
            responseData,
          );
          return new Response(
            JSON.stringify({
              error: "DocuSeal API error",
              details: responseData,
              status: response.status,
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-template": {
        const templateId = body?.template_id;

        if (!templateId) {
          return new Response(
            JSON.stringify({ error: "template_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        console.log(`[docuseal] Getting template ${templateId}`);

        const response = await fetch(
          `${DOCUSEAL_API_BASE}/templates/${templateId}`,
          {
            method: "GET",
            headers: {
              "X-Auth-Token": DOCUSEAL_API_KEY,
            },
          },
        );

        const responseData = await response.json();

        if (!response.ok) {
          console.error(
            `[docuseal] API error: ${response.status}`,
            responseData,
          );
          return new Response(
            JSON.stringify({
              error: "DocuSeal API error",
              details: responseData,
              status: response.status,
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "archive-submission": {
        const submissionId = body?.submission_id;

        if (!submissionId) {
          return new Response(
            JSON.stringify({ error: "submission_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        console.log(`[docuseal] Archiving submission ${submissionId}`);

        const response = await fetch(
          `${DOCUSEAL_API_BASE}/submissions/${submissionId}`,
          {
            method: "DELETE",
            headers: {
              "X-Auth-Token": DOCUSEAL_API_KEY,
            },
          },
        );

        if (!response.ok) {
          const responseData = await response.json();
          console.error(
            `[docuseal] API error: ${response.status}`,
            responseData,
          );
          return new Response(
            JSON.stringify({
              error: "DocuSeal API error",
              details: responseData,
              status: response.status,
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify({ success: true, archived: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        console.warn(`[docuseal] Unknown action: ${action}`);
        return new Response(
          JSON.stringify({
            error: "Unknown action",
            received: action,
            validActions: [
              "create-submission",
              "get-submission",
              "list-templates",
              "get-template",
              "archive-submission",
            ],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }
  } catch (err) {
    console.error("[docuseal] Error:", err);
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
