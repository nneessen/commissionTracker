// Edge Function: custom-domain-create
// Creates a new custom domain record and initiates DNS verification flow

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { validateHostname, getDnsInstructions } from "../_shared/dns-lookup.ts";

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

    // Create admin client for service_role operations
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
      console.error("[custom-domain-create] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const { hostname } = await req.json();

    // Validate hostname format
    const validation = validateHostname(hostname);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedHostname = hostname.toLowerCase().trim();

    // Get user's profile to retrieve imo_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("imo_id, recruiter_slug")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[custom-domain-create] Profile error:", profileError);
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.imo_id) {
      return new Response(
        JSON.stringify({
          error: "User must belong to an IMO to create custom domains",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if user already has an active domain (v1 limit)
    const { data: existingActive } = await supabaseAdmin
      .from("custom_domains")
      .select("id, hostname")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingActive) {
      return new Response(
        JSON.stringify({
          error:
            "You already have an active custom domain. Delete it first to add a new one.",
          existing_hostname: existingActive.hostname,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if hostname is already in use (globally unique)
    const { data: existingHostname } = await supabaseAdmin
      .from("custom_domains")
      .select("id, status")
      .eq("hostname", normalizedHostname)
      .maybeSingle();

    if (existingHostname) {
      return new Response(
        JSON.stringify({ error: "This hostname is already registered" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate cryptographically random verification token (32 bytes = 64 hex chars)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const verificationToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Insert domain record with draft status
    const { data: domain, error: insertError } = await supabaseAdmin
      .from("custom_domains")
      .insert({
        imo_id: profile.imo_id,
        user_id: user.id,
        hostname: normalizedHostname,
        status: "draft",
        verification_token: verificationToken,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[custom-domain-create] Insert error:", insertError);

      // Handle unique constraint violation
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "This hostname is already registered" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to create domain record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Transition to pending_dns status via admin function
    const { data: updatedDomain, error: transitionError } =
      await supabaseAdmin.rpc("admin_update_domain_status", {
        p_domain_id: domain.id,
        p_user_id: user.id,
        p_new_status: "pending_dns",
      });

    if (transitionError) {
      console.error(
        "[custom-domain-create] Transition error:",
        transitionError,
      );
      // Clean up the draft record
      await supabaseAdmin.from("custom_domains").delete().eq("id", domain.id);
      return new Response(
        JSON.stringify({ error: "Failed to initialize domain verification" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate DNS instructions
    const dnsInstructions = getDnsInstructions(
      normalizedHostname,
      verificationToken,
    );

    console.log("[custom-domain-create] Domain created:", {
      id: domain.id,
      hostname: normalizedHostname,
      user_id: user.id,
    });

    return new Response(
      JSON.stringify({
        domain: updatedDomain,
        dns_instructions: dnsInstructions,
        message: "Domain created. Please add the DNS records and click Verify.",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[custom-domain-create] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
