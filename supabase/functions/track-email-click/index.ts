import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("id");
  const targetUrl = url.searchParams.get("url");

  // Always redirect even if tracking fails — the user experience comes first
  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Decode the target URL (it was encodeURIComponent'd)
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(targetUrl);
  } catch {
    decodedUrl = targetUrl;
  }

  // Fire-and-forget: log the click asynchronously, don't block the redirect
  if (trackingId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Record click — best-effort, don't let failures block the redirect
        await supabase
          .from("email_tracking_events")
          .insert({
            tracking_id: trackingId,
            event_type: "click",
            url: decodedUrl,
            user_agent: req.headers.get("user-agent") || null,
            ip_address:
              req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
            created_at: new Date().toISOString(),
          })
          .then(() => {})
          .catch(() => {});
      }
    } catch {
      // Silently ignore — redirect is more important than tracking
    }
  }

  // 302 redirect to the actual destination
  return new Response(null, {
    status: 302,
    headers: {
      Location: decodedUrl,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
