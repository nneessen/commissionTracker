// supabase/functions/slack-auto-complete-first-sale/index.ts
// Automatically completes pending first sales that haven't been named after 5 minutes
// This ensures notifications don't get stuck if the user misses the naming dialog

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

const AUTO_COMPLETE_AFTER_MINUTES = 5;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-auto-complete-first-sale] Function invoked");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find pending first sales older than AUTO_COMPLETE_AFTER_MINUTES
    // CRITICAL: Only process TODAY's logs to prevent posting old policy notifications
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - AUTO_COMPLETE_AFTER_MINUTES);

    // Get today's date in Eastern Time (same as the main notification system)
    const todayET = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });

    const { data: pendingLogs, error: queryError } = await supabase
      .from("daily_sales_logs")
      .select("id, first_sale_group_id, created_at, log_date")
      .not("pending_policy_data", "is", null)
      .eq("log_date", todayET) // ONLY process today's logs
      .lt("created_at", cutoffTime.toISOString())
      .order("created_at", { ascending: true });

    if (queryError) {
      console.error("[slack-auto-complete-first-sale] Query error:", queryError);
      return new Response(
        JSON.stringify({ ok: false, error: queryError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      console.log("[slack-auto-complete-first-sale] No pending first sales to auto-complete");
      return new Response(
        JSON.stringify({ ok: true, processed: 0, message: "No pending first sales" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[slack-auto-complete-first-sale] Found ${pendingLogs.length} pending first sale(s) to auto-complete`);

    // Group by first_sale_group_id to avoid duplicate processing
    const processedGroups = new Set<string>();
    const results: Array<{
      logId: string;
      groupId: string | null;
      success: boolean;
      error?: string;
    }> = [];

    for (const log of pendingLogs) {
      const groupId = log.first_sale_group_id || log.id;

      // Skip if we've already processed this group
      if (processedGroups.has(groupId)) {
        console.log(`[slack-auto-complete-first-sale] Skipping log ${log.id} - group ${groupId} already processed`);
        continue;
      }

      processedGroups.add(groupId);

      try {
        // Call the slack-policy-notification function to complete the first sale
        // If there's a group, use batch completion; otherwise complete single log
        const action = log.first_sale_group_id
          ? "complete-first-sale-batch"
          : "complete-first-sale";

        const payload = log.first_sale_group_id
          ? { action, firstSaleGroupId: log.first_sale_group_id }
          : { action, logId: log.id };

        console.log(`[slack-auto-complete-first-sale] Auto-completing ${action} for ${groupId}`);

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/slack-policy-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify(payload),
          },
        );

        const result = await response.json();

        if (result.ok) {
          console.log(`[slack-auto-complete-first-sale] Successfully auto-completed ${groupId}`);
          results.push({ logId: log.id, groupId, success: true });
        } else {
          console.error(`[slack-auto-complete-first-sale] Failed to auto-complete ${groupId}:`, result.error);
          results.push({ logId: log.id, groupId, success: false, error: result.error });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[slack-auto-complete-first-sale] Error processing ${groupId}:`, err);
        results.push({ logId: log.id, groupId, success: false, error: errorMsg });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[slack-auto-complete-first-sale] Completed: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: results.length,
        successful: successCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[slack-auto-complete-first-sale] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
