// Edge Function: custom-domain-delete
// Removes domain from Vercel and deletes database record

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";
import { removeDomainFromVercel } from "../_shared/vercel-api.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate request method
    if (req.method !== "POST" && req.method !== "DELETE") {
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

    // If domain was provisioned (active or provisioning with provider_domain_id),
    // remove from Vercel first
    if (
      (domain.status === "active" || domain.status === "provisioning") &&
      domain.provider_domain_id
    ) {
      console.log(
        "[custom-domain-delete] Removing from Vercel:",
        domain.hostname,
      );

      const vercelResult = await removeDomainFromVercel(domain.hostname);

      if (!vercelResult.success) {
        // Log but don't fail - domain may already be removed from Vercel
        console.error(
          "[custom-domain-delete] Vercel removal warning:",
          vercelResult.error,
        );
      }
    }

    // Delete from database using admin function (bypasses RLS for active domains)
    const { error: deleteError } = await supabaseAdmin.rpc(
      "admin_delete_domain",
      {
        p_domain_id: domain.id,
        p_user_id: user.id,
      },
    );

    if (deleteError) {
      console.error("[custom-domain-delete] Delete error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete domain record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[custom-domain-delete] Domain deleted:", {
      id: domain.id,
      hostname: domain.hostname,
      user_id: user.id,
    });

    return new Response(
      JSON.stringify({
        deleted: true,
        hostname: domain.hostname,
        message: "Domain has been removed successfully.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[custom-domain-delete] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
