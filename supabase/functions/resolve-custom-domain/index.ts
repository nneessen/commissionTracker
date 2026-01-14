// Edge Function: resolve-custom-domain
// PUBLIC endpoint (no auth) - resolves hostname to recruiter_slug
// Returns ONLY recruiter_slug, never exposes user_id, imo_id, or status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  // For custom domains, we need to allow any origin since the request
  // will come from the custom domain itself
  const origin = requestOrigin || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    // Cache the response for 60 seconds
    "Cache-Control": "public, max-age=60, s-maxage=60",
  };
}

// Reserved/blocked patterns
const BLOCKED_PATTERNS = [
  "localhost",
  "127.0.0.1",
  "::1",
  ".local",
  ".localhost",
  ".test",
  ".example",
  ".invalid",
];

const RESERVED_DOMAINS = [
  "thestandardhq.com",
  "www.thestandardhq.com",
  ".vercel.app",
  ".vercel.sh",
];

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(null, { status: 404, headers: corsHeaders });
  }

  try {
    // Get hostname from query params
    const url = new URL(req.url);
    const hostname = url.searchParams.get("hostname");

    // Validate hostname is provided
    if (!hostname || typeof hostname !== "string") {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    const normalized = hostname.toLowerCase().trim();

    // Security: Reject invalid hostnames (return 404, no details)
    // Max length check
    if (normalized.length > 253 || normalized.length < 5) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    // Must have at least 2 dots (subdomain requirement)
    const dotCount = (normalized.match(/\./g) || []).length;
    if (dotCount < 2) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    // Reject IP addresses
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(normalized)) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    // Reject blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (normalized === pattern || normalized.endsWith(pattern)) {
        return new Response(null, { status: 404, headers: corsHeaders });
      }
    }

    // Reject reserved domains (prevents resolver loops)
    for (const reserved of RESERVED_DOMAINS) {
      if (normalized === reserved || normalized.endsWith(reserved)) {
        return new Response(null, { status: 404, headers: corsHeaders });
      }
    }

    // Create admin client (service_role needed to bypass RLS for public lookup)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Query for active domain (uses partial index for performance)
    const { data: domain, error: domainError } = await supabaseAdmin
      .from("custom_domains")
      .select("user_id")
      .eq("hostname", normalized)
      .eq("status", "active")
      .maybeSingle();

    // Domain not found or not active - return 404 (no details)
    if (domainError || !domain) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    // Fetch user's current recruiter_slug (dynamic lookup)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("recruiter_slug")
      .eq("id", domain.user_id)
      .maybeSingle();

    // User not found or no slug - return 404 (no details)
    if (profileError || !profile || !profile.recruiter_slug) {
      return new Response(null, { status: 404, headers: corsHeaders });
    }

    // Success! Return ONLY the recruiter_slug
    return new Response(
      JSON.stringify({ recruiter_slug: profile.recruiter_slug }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("[resolve-custom-domain] Unhandled error:", err);
    // Return 404 for any errors (don't leak info)
    return new Response(null, { status: 404, headers: getCorsHeaders(null) });
  }
});
