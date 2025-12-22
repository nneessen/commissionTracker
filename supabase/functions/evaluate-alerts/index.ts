// Edge Function: Evaluate Alert Rules
// Phase 10: Notifications & Alerts System
// Triggered by external cron to evaluate alert rules and create notifications
//
// SECURITY: Phase 10 hardening applied:
// - Org scoping via RPC batch queries
// - Sanitized notification metadata
// - Race condition prevention via FOR UPDATE SKIP LOCKED
// - N+1 patterns replaced with batch queries

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase-client.ts";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "https://esm.sh/date-fns@3.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
type AlertMetric =
  | "policy_lapse_warning"
  | "target_miss_risk"
  | "commission_threshold"
  | "new_policy_count"
  | "recruit_stall"
  | "override_change"
  | "team_production_drop"
  | "persistency_warning"
  | "license_expiration";

type AlertComparison = "lt" | "lte" | "gt" | "gte" | "eq";

interface AlertRule {
  id: string;
  owner_id: string;
  imo_id: string | null;
  agency_id: string | null;
  metric: AlertMetric;
  comparison: AlertComparison;
  threshold_value: number;
  threshold_unit: string | null;
  applies_to_self: boolean;
  applies_to_downlines: boolean;
  applies_to_team: boolean;
  notify_in_app: boolean;
  notify_email: boolean;
  cooldown_hours: number;
  last_triggered_at: string | null;
}

interface EvaluationResult {
  ruleId: string;
  triggered: boolean;
  evaluations: number;
  notifications: number;
  error?: string;
}

interface AlertMatch {
  userId: string;
  currentValue: number;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
}

// Compare values based on comparison operator
function compareValues(
  current: number,
  threshold: number,
  comparison: AlertComparison,
): boolean {
  switch (comparison) {
    case "lt":
      return current < threshold;
    case "lte":
      return current <= threshold;
    case "gt":
      return current > threshold;
    case "gte":
      return current >= threshold;
    case "eq":
      return current === threshold;
    default:
      return false;
  }
}

// Generate unique worker ID for this invocation
function generateWorkerId(): string {
  return `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get users to evaluate based on rule scope (with org validation)
async function getUsersToEvaluate(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
): Promise<string[]> {
  const userIds: Set<string> = new Set();

  // Build base query with org scoping
  const orgFilter = rule.imo_id
    ? { column: "imo_id", value: rule.imo_id }
    : rule.agency_id
      ? { column: "agency_id", value: rule.agency_id }
      : null;

  if (!orgFilter) {
    console.log(`[EvaluateAlerts] Rule ${rule.id} has no org scope - skipping`);
    return [];
  }

  if (rule.applies_to_self) {
    // Verify owner belongs to the org
    const { data: owner } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", rule.owner_id)
      .eq(orgFilter.column, orgFilter.value)
      .single();

    if (owner) {
      userIds.add(rule.owner_id);
    }
  }

  if (rule.applies_to_downlines) {
    // Get owner's downlines within the same org
    const { data: downlines } = await supabase
      .from("user_profiles")
      .select("id")
      .like("hierarchy_path", `%${rule.owner_id}%`)
      .eq(orgFilter.column, orgFilter.value)
      .neq("id", rule.owner_id);

    downlines?.forEach((d) => userIds.add(d.id));
  }

  if (rule.applies_to_team) {
    // Get all users in the org
    const { data: teamMembers } = await supabase
      .from("user_profiles")
      .select("id")
      .eq(orgFilter.column, orgFilter.value);

    teamMembers?.forEach((m) => userIds.add(m.id));
  }

  return Array.from(userIds);
}

// Evaluate policy_lapse_warning metric using batch RPC
async function evaluatePolicyLapseWarning(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[],
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];

  // Use batched RPC with org scoping
  const { data: policies, error } = await supabase.rpc(
    "get_policies_for_lapse_check",
    {
      p_rule_id: rule.id,
      p_user_ids: userIds,
      p_warning_days: Math.ceil(rule.threshold_value),
    },
  );

  if (error) {
    console.error(
      "[EvaluateAlerts] get_policies_for_lapse_check error:",
      error,
    );
    return matches;
  }

  if (policies) {
    for (const policy of policies) {
      if (
        compareValues(
          policy.days_until_lapse,
          rule.threshold_value,
          rule.comparison,
        )
      ) {
        matches.push({
          userId: policy.agent_id,
          currentValue: policy.days_until_lapse,
          entityType: "policy",
          entityId: policy.policy_id,
          title: "Policy Lapse Warning",
          message: `Policy ${policy.policy_number} will lapse in ${policy.days_until_lapse} days`,
        });
      }
    }
  }

  return matches;
}

// Evaluate license_expiration metric using batch RPC
async function evaluateLicenseExpiration(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[],
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];

  // Use batched RPC with org scoping
  const { data: licenses, error } = await supabase.rpc(
    "get_license_expirations_for_check",
    {
      p_rule_id: rule.id,
      p_user_ids: userIds,
      p_warning_days: Math.ceil(rule.threshold_value),
    },
  );

  if (error) {
    console.error(
      "[EvaluateAlerts] get_license_expirations_for_check error:",
      error,
    );
    return matches;
  }

  if (licenses) {
    for (const license of licenses) {
      if (
        compareValues(
          license.days_until_expiration,
          rule.threshold_value,
          rule.comparison,
        )
      ) {
        matches.push({
          userId: license.user_id,
          currentValue: license.days_until_expiration,
          entityType: "license",
          entityId: license.user_id,
          title: "License Expiration Warning",
          message: `License expires in ${license.days_until_expiration} days`,
        });
      }
    }
  }

  return matches;
}

// Evaluate recruit_stall metric (unchanged - already org-scoped through user lookup)
async function evaluateRecruitStall(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[],
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];

  // First validate userIds through org scoping RPC
  const { data: validUserIds } = await supabase.rpc(
    "get_valid_users_for_rule",
    {
      p_rule_id: rule.id,
      p_user_ids: userIds,
    },
  );

  if (!validUserIds || validUserIds.length === 0) {
    return matches;
  }

  const today = new Date();

  // Find recruits whose recruiter is in validUserIds
  const { data: recruits } = await supabase
    .from("user_profiles")
    .select(
      `
      id, first_name, last_name, recruiter_id, imo_id, agency_id,
      current_onboarding_phase, onboarding_status,
      recruit_phase_progress!inner(phase_id, started_at)
    `,
    )
    .in("recruiter_id", validUserIds)
    .in("onboarding_status", ["lead", "active"])
    .not("current_onboarding_phase", "is", null);

  if (recruits) {
    for (const recruit of recruits) {
      // Verify recruit is in same org as rule
      if (rule.imo_id && recruit.imo_id !== rule.imo_id) continue;
      if (rule.agency_id && recruit.agency_id !== rule.agency_id) continue;

      const currentPhaseProgress = (
        recruit.recruit_phase_progress as unknown[]
      )?.find(
        (p: { phase_id: string }) =>
          p.phase_id === recruit.current_onboarding_phase,
      ) as { started_at: string } | undefined;

      if (currentPhaseProgress?.started_at) {
        const daysInPhase = Math.floor(
          (today.getTime() -
            new Date(currentPhaseProgress.started_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (compareValues(daysInPhase, rule.threshold_value, rule.comparison)) {
          const recruitName =
            `${recruit.first_name || ""} ${recruit.last_name || ""}`.trim() ||
            "Recruit";
          matches.push({
            userId: recruit.recruiter_id!,
            currentValue: daysInPhase,
            entityType: "recruit",
            entityId: recruit.id,
            title: "Recruit Stalled",
            message: `${recruitName} has been in phase for ${daysInPhase} days`,
          });
        }
      }
    }
  }

  return matches;
}

// Evaluate new_policy_count metric using batch RPC
async function evaluateNewPolicyCount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[],
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];
  const endDate = new Date();
  const startDate = startOfMonth(subMonths(endDate, 1));
  const endOfPeriod = endOfMonth(subMonths(endDate, 1));

  // Use batched RPC with org scoping
  const { data: policyCounts, error } = await supabase.rpc(
    "get_policy_counts_for_check",
    {
      p_rule_id: rule.id,
      p_user_ids: userIds,
      p_start_date: format(startDate, "yyyy-MM-dd"),
      p_end_date: format(endOfPeriod, "yyyy-MM-dd"),
    },
  );

  if (error) {
    console.error("[EvaluateAlerts] get_policy_counts_for_check error:", error);
    return matches;
  }

  // Build a map for quick lookup
  const countMap = new Map<string, number>();
  policyCounts?.forEach((pc: { agent_id: string; policy_count: number }) => {
    countMap.set(pc.agent_id, Number(pc.policy_count));
  });

  // Check each user (including those with 0 policies)
  const { data: validUserIds } = await supabase.rpc(
    "get_valid_users_for_rule",
    {
      p_rule_id: rule.id,
      p_user_ids: userIds,
    },
  );

  if (validUserIds) {
    for (const userId of validUserIds) {
      const policyCount = countMap.get(userId) ?? 0;

      if (compareValues(policyCount, rule.threshold_value, rule.comparison)) {
        matches.push({
          userId,
          currentValue: policyCount,
          entityType: "production",
          title: "Low Policy Production",
          message: `Only ${policyCount} new policies last month (threshold: ${rule.threshold_value})`,
        });
      }
    }
  }

  return matches;
}

// Evaluate commission_threshold metric using batch RPC
async function evaluateCommissionThreshold(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[],
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];
  const endDate = new Date();
  const startDate = startOfMonth(subMonths(endDate, 1));
  const endOfPeriod = endOfMonth(subMonths(endDate, 1));

  // Use batched RPC with org scoping
  const { data: commissions, error } = await supabase.rpc(
    "get_commissions_for_threshold_check",
    {
      p_rule_id: rule.id,
      p_user_ids: userIds,
      p_start_date: format(startDate, "yyyy-MM-dd"),
      p_end_date: format(endOfPeriod, "yyyy-MM-dd"),
    },
  );

  if (error) {
    console.error(
      "[EvaluateAlerts] get_commissions_for_threshold_check error:",
      error,
    );
    return matches;
  }

  // Build a map for quick lookup
  const commissionMap = new Map<string, number>();
  commissions?.forEach((c: { agent_id: string; total_commission: number }) => {
    commissionMap.set(c.agent_id, Number(c.total_commission));
  });

  // Check each user (including those with 0 commission)
  const { data: validUserIds } = await supabase.rpc(
    "get_valid_users_for_rule",
    {
      p_rule_id: rule.id,
      p_user_ids: userIds,
    },
  );

  if (validUserIds) {
    for (const userId of validUserIds) {
      const totalCommission = commissionMap.get(userId) ?? 0;

      if (
        compareValues(totalCommission, rule.threshold_value, rule.comparison)
      ) {
        matches.push({
          userId,
          currentValue: totalCommission,
          entityType: "commission",
          title: "Commission Below Threshold",
          message: `Commission of $${totalCommission.toLocaleString()} is below threshold of $${rule.threshold_value.toLocaleString()}`,
        });
      }
    }
  }

  return matches;
}

// Main evaluation dispatcher
async function evaluateMetric(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[],
): Promise<AlertMatch[]> {
  switch (rule.metric) {
    case "policy_lapse_warning":
      return evaluatePolicyLapseWarning(supabase, rule, userIds);

    case "license_expiration":
      return evaluateLicenseExpiration(supabase, rule, userIds);

    case "recruit_stall":
      return evaluateRecruitStall(supabase, rule, userIds);

    case "new_policy_count":
      return evaluateNewPolicyCount(supabase, rule, userIds);

    case "commission_threshold":
      return evaluateCommissionThreshold(supabase, rule, userIds);

    // TODO: Implement remaining metrics
    case "target_miss_risk":
    case "override_change":
    case "team_production_drop":
    case "persistency_warning":
      console.log(`[EvaluateAlerts] Metric ${rule.metric} not yet implemented`);
      return [];

    default:
      console.log(`[EvaluateAlerts] Unknown metric: ${rule.metric}`);
      return [];
  }
}

// Create notification using sanitized RPC
async function createAlertNotification(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  match: AlertMatch,
): Promise<string | null> {
  try {
    // Use sanitized RPC that validates org scope
    const { data: notificationId, error } = await supabase.rpc(
      "create_alert_notification_safe",
      {
        p_user_id: match.userId,
        p_type: `alert_${rule.metric}`,
        p_title: match.title,
        p_message: match.message,
        p_rule_id: rule.id,
        p_metric: rule.metric,
        p_current_value: match.currentValue,
        p_threshold_value: rule.threshold_value,
        p_comparison: rule.comparison,
        p_entity_type: match.entityType || null,
        p_entity_id: match.entityId || null,
      },
    );

    if (error) {
      console.error("[EvaluateAlerts] Failed to create notification:", error);
      return null;
    }

    return notificationId;
  } catch (err) {
    console.error("[EvaluateAlerts] Error creating notification:", err);
    return null;
  }
}

// Process a single alert rule
async function processRule(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
): Promise<EvaluationResult> {
  const result: EvaluationResult = {
    ruleId: rule.id,
    triggered: false,
    evaluations: 0,
    notifications: 0,
  };

  try {
    console.log(
      `[EvaluateAlerts] Processing rule: ${rule.id} (${rule.metric})`,
    );

    // Validate rule has org scope
    if (!rule.imo_id && !rule.agency_id) {
      console.log(
        `[EvaluateAlerts] Rule ${rule.id} has no org scope - skipping`,
      );
      return result;
    }

    // Get users to evaluate (with org scoping)
    const userIds = await getUsersToEvaluate(supabase, rule);
    result.evaluations = userIds.length;

    if (userIds.length === 0) {
      console.log(`[EvaluateAlerts] No users to evaluate for rule ${rule.id}`);
      return result;
    }

    // Evaluate the metric
    const matches = await evaluateMetric(supabase, rule, userIds);

    if (matches.length === 0) {
      // Record non-trigger evaluation
      await supabase.rpc("record_alert_evaluation", {
        p_rule_id: rule.id,
        p_triggered: false,
        p_current_value: 0,
        p_evaluation_context: { evaluatedUsers: userIds.length },
      });
      return result;
    }

    result.triggered = true;

    // Create notifications for each match
    for (const match of matches) {
      if (rule.notify_in_app) {
        const notificationId = await createAlertNotification(
          supabase,
          rule,
          match,
        );

        if (notificationId) {
          result.notifications++;

          // Record the evaluation
          await supabase.rpc("record_alert_evaluation", {
            p_rule_id: rule.id,
            p_triggered: true,
            p_current_value: match.currentValue,
            p_affected_user_id: match.userId,
            p_affected_entity_type: match.entityType,
            p_affected_entity_id: match.entityId,
            p_notification_id: notificationId,
            p_evaluation_context: {},
          });
        }
      }
    }

    console.log(
      `[EvaluateAlerts] Rule ${rule.id}: ${matches.length} matches, ${result.notifications} notifications`,
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    result.error = error;
    console.error(`[EvaluateAlerts] Error processing rule ${rule.id}:`, error);
  }

  return result;
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const workerId = generateWorkerId();
  const claimedRuleIds: string[] = [];

  try {
    // Validate request - check for service role key or cron secret
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const token = authHeader?.replace("Bearer ", "");

    const isServiceRole = token === serviceRoleKey;
    const isCronSecret = cronSecret && token === cronSecret;

    if (!isServiceRole && !isCronSecret) {
      console.log("[EvaluateAlerts] Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseAdminClient();

    // Get due alert rules with locking
    const { data: dueRules, error: fetchError } = await supabase.rpc(
      "get_due_alert_rules",
      {
        p_worker_id: workerId,
        p_batch_size: 50,
      },
    );

    if (fetchError) {
      console.error("[EvaluateAlerts] Failed to fetch due rules:", fetchError);
      throw fetchError;
    }

    if (!dueRules || dueRules.length === 0) {
      console.log("[EvaluateAlerts] No rules due for evaluation");
      return new Response(
        JSON.stringify({ message: "No rules due", processed: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Track claimed rule IDs for cleanup
    dueRules.forEach((r: AlertRule) => claimedRuleIds.push(r.id));

    console.log(
      `[EvaluateAlerts] Processing ${dueRules.length} due rule(s) [worker: ${workerId}]`,
    );

    // Process each rule
    const results: EvaluationResult[] = [];
    for (const rule of dueRules) {
      const result = await processRule(supabase, rule as AlertRule);
      results.push(result);
    }

    // Release the claimed rules
    if (claimedRuleIds.length > 0) {
      await supabase.rpc("release_alert_rules", { p_rule_ids: claimedRuleIds });
    }

    const triggered = results.filter((r) => r.triggered).length;
    const totalNotifications = results.reduce(
      (sum, r) => sum + r.notifications,
      0,
    );
    const failed = results.filter((r) => r.error).length;

    console.log(
      `[EvaluateAlerts] Completed: ${triggered} triggered, ${totalNotifications} notifications, ${failed} errors`,
    );

    return new Response(
      JSON.stringify({
        message: "Evaluation complete",
        processed: results.length,
        triggered,
        totalNotifications,
        failed,
        workerId,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[EvaluateAlerts] Error:", error);

    // Attempt to release claimed rules on error
    if (claimedRuleIds.length > 0) {
      try {
        const supabase = createSupabaseAdminClient();
        await supabase.rpc("release_alert_rules", {
          p_rule_ids: claimedRuleIds,
        });
      } catch {
        // Ignore cleanup errors
      }
    }

    return new Response(JSON.stringify({ error, workerId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
