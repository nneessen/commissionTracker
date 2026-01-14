// Edge Function: custom-domain-verify
// Performs DNS TXT verification for domain ownership

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import {
  verifyDnsTxtRecord,
  getDnsInstructions,
} from "../_shared/dns-lookup.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Extract and validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const { domain_id } = await req.json();

    if (!domain_id) {
      return new Response(JSON.stringify({ error: "domain_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch domain record
    const { data: domain, error: fetchError } = await supabaseAdmin
      .from("custom_domains")
      .select("*")
      .eq("id", domain_id)
      .single();

    if (fetchError || !domain) {
      return new Response(JSON.stringify({ error: "Domain not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (domain.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check status allows verification (pending_dns or error for retry)
    if (domain.status !== "pending_dns" && domain.status !== "error") {
      return new Response(
        JSON.stringify({
          error: `Cannot verify domain in ${domain.status} status`,
          current_status: domain.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Perform DNS TXT verification
    console.log("[custom-domain-verify] Verifying DNS for:", domain.hostname);
    const verification = await verifyDnsTxtRecord(
      domain.hostname,
      domain.verification_token,
    );

    if (verification.verified) {
      // Transition to verified status
      const { data: updatedDomain, error: transitionError } =
        await supabaseAdmin.rpc("admin_update_domain_status", {
          p_domain_id: domain.id,
          p_user_id: user.id,
          p_new_status: "verified",
          p_verified_at: new Date().toISOString(),
        });

      if (transitionError) {
        console.error(
          "[custom-domain-verify] Transition error:",
          transitionError,
        );
        return new Response(
          JSON.stringify({ error: "Failed to update domain status" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("[custom-domain-verify] Domain verified:", domain.hostname);

      return new Response(
        JSON.stringify({
          verified: true,
          domain: updatedDomain,
          message:
            "DNS verification successful! You can now provision the domain.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      // Verification failed - provide helpful error
      const dnsInstructions = getDnsInstructions(
        domain.hostname,
        domain.verification_token,
      );

      console.log("[custom-domain-verify] Verification failed:", {
        hostname: domain.hostname,
        error: verification.error,
        foundRecords: verification.foundRecords,
      });

      return new Response(
        JSON.stringify({
          verified: false,
          error: verification.error,
          found_records: verification.foundRecords || [],
          expected_record: {
            name: dnsInstructions.txt.name,
            name_relative: dnsInstructions.txt.nameRelative,
            value: domain.verification_token,
          },
          message:
            "DNS verification failed. Please check your DNS records and try again.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (err) {
    console.error("[custom-domain-verify] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
