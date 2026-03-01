// supabase/functions/slack-ip-leaderboard/index.ts
// Posts weekly IP (Issued Premium) report to configured Slack channel
//
// **IP (Issued Premium) Definition:**
// Policies that are APPROVED and PLACED/ISSUED count towards IP.
// Based on effective_date, not submit_date.
// Does NOT include pending policies that have not been issued yet.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { decrypt } from "../_shared/encryption.ts";
import { getCorsHeaders, corsResponse } from "../_shared/cors.ts";

interface IPLeaderboardEntry {
  agent_id: string;
  agent_name: string;
  wtd_ip: number;
  wtd_policies: number;
  mtd_ip: number;
  mtd_policies: number;
}

interface AgencyIPEntry {
  agency_id: string;
  agency_name: string;
  wtd_ip: number;
  wtd_policies: number;
  mtd_ip: number;
  mtd_policies: number;
}

interface ActiveAgency {
  id: string;
  name: string;
  parent_agency_id: string | null;
  owner_id: string | null;
}

interface UserProfileForAgency {
  id: string;
  imo_id: string | null;
  agency_id: string | null;
  hierarchy_path: string | null;
  roles: string[] | null;
  is_admin: boolean | null;
  approval_status: string | null;
  archived_at: string | null;
}

interface PolicyForIP {
  id: string;
  user_id: string | null;
  agency_id: string | null;
  annual_premium: number | string | null;
  effective_date: string | null;
}

interface ReportingWindow {
  weekStart: string;
  weekEnd: string;
  monthStart: string;
  monthEnd: string;
  weekRange: string;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get rank emoji
 */
function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return ":first_place_medal:";
    case 2:
      return ":second_place_medal:";
    case 3:
      return ":third_place_medal:";
    default:
      return `${rank}.`;
  }
}

/**
 * Format date as YYYY-MM-DD (using local date parts from ET-derived Date object)
 */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get reporting window for weekly IP report.
 * - Mon-Sat runs: previous completed Mon-Sun week
 * - Sunday runs: current Mon-Sun week ending today
 */
function getReportingWindow(): ReportingWindow {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  // Get Monday of current week
  const day = et.getDay();
  const diff = et.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const currentMonday = new Date(et);
  currentMonday.setDate(diff);

  let monday: Date;
  let sunday: Date;

  // Sunday should report the week that just ended today (Mon-Sun).
  if (day === 0) {
    monday = new Date(currentMonday);
    sunday = new Date(et);
  } else {
    // Mon-Sat report the most recent completed Mon-Sun week.
    monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - 7);
    sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() - 1);
  }

  // Anchor MTD to the month the reported week starts in.
  // This prevents cross-month weeks (e.g. Feb 23 - Mar 1) from collapsing MTD
  // to only the first day of the new month.
  const monthStart = new Date(monday);
  monthStart.setDate(1);
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  );

  // MTD should not spill into the next month when a week crosses month boundary.
  const mtdEnd = sunday.getTime() < monthEnd.getTime() ? sunday : monthEnd;

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const mondayStr = monday.toLocaleDateString("en-US", options);
  const sundayStr = sunday.toLocaleDateString("en-US", options);

  return {
    weekStart: toIsoDate(monday),
    weekEnd: toIsoDate(sunday),
    monthStart: toIsoDate(monthStart),
    monthEnd: toIsoDate(mtdEnd),
    weekRange: `${mondayStr} - ${sundayStr}`,
  };
}

function inDateRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/**
 * Fetch all approved policies in the given effective-date window.
 * Uses pagination to avoid row limits.
 */
async function fetchPoliciesForRange(
  supabase: ReturnType<typeof createClient>,
  imoId: string,
  startDate: string,
  endDate: string,
): Promise<PolicyForIP[]> {
  const pageSize = 1000;
  let from = 0;
  const allPolicies: PolicyForIP[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("policies")
      .select("id, user_id, agency_id, annual_premium, effective_date")
      .eq("imo_id", imoId)
      .eq("status", "approved")
      .not("effective_date", "is", null)
      .gte("effective_date", startDate)
      .lte("effective_date", endDate)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch policies: ${error.message}`);
    }

    const rows = (data || []) as PolicyForIP[];
    allPolicies.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allPolicies;
}

async function fetchUserNames(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const chunkSize = 500;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, email")
      .in("id", chunk);

    if (error) {
      throw new Error(`Failed to fetch user names: ${error.message}`);
    }

    for (const user of data || []) {
      const name =
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.email ||
        "Unknown";
      map.set(user.id, name);
    }
  }

  return map;
}

async function fetchActiveAgencies(
  supabase: ReturnType<typeof createClient>,
  imoId: string,
): Promise<ActiveAgency[]> {
  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, parent_agency_id, owner_id")
    .eq("imo_id", imoId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to fetch active agencies: ${error.message}`);
  }

  return (data || []).map((agency) => ({
    id: agency.id,
    name: agency.name || "Unknown Agency",
    parent_agency_id: agency.parent_agency_id,
    owner_id: agency.owner_id,
  }));
}

async function fetchAgencyUsers(
  supabase: ReturnType<typeof createClient>,
  imoId: string,
): Promise<UserProfileForAgency[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      "id, imo_id, agency_id, hierarchy_path, roles, is_admin, approval_status, archived_at",
    )
    .eq("imo_id", imoId);

  if (error) {
    throw new Error(`Failed to fetch agency users: ${error.message}`);
  }

  return (data || []) as UserProfileForAgency[];
}

function buildAgentEntries(
  policies: PolicyForIP[],
  monthStart: string,
  monthEnd: string,
  weekStart: string,
  weekEnd: string,
  userNameById: Map<string, string>,
): IPLeaderboardEntry[] {
  const byUser = new Map<string, IPLeaderboardEntry>();

  for (const policy of policies) {
    if (!policy.user_id || !policy.effective_date) continue;
    const premium = Number(policy.annual_premium || 0);
    if (!Number.isFinite(premium)) continue;

    const existing =
      byUser.get(policy.user_id) ||
      ({
        agent_id: policy.user_id,
        agent_name: userNameById.get(policy.user_id) || "Unknown",
        wtd_ip: 0,
        wtd_policies: 0,
        mtd_ip: 0,
        mtd_policies: 0,
      } as IPLeaderboardEntry);

    if (inDateRange(policy.effective_date, monthStart, monthEnd)) {
      existing.mtd_ip += premium;
      existing.mtd_policies += 1;
    }

    if (inDateRange(policy.effective_date, weekStart, weekEnd)) {
      existing.wtd_ip += premium;
      existing.wtd_policies += 1;
    }

    byUser.set(policy.user_id, existing);
  }

  return [...byUser.values()]
    .filter((entry) => entry.wtd_ip > 0 || entry.mtd_ip > 0)
    .sort((a, b) => b.mtd_ip - a.mtd_ip);
}

function buildAgencyEntries(
  policies: PolicyForIP[],
  monthStart: string,
  monthEnd: string,
  weekStart: string,
  weekEnd: string,
  activeAgencies: ActiveAgency[],
  users: UserProfileForAgency[],
): AgencyIPEntry[] {
  const activeAgencyById = new Map(
    activeAgencies.map((agency) => [agency.id, agency]),
  );
  const userById = new Map(users.map((user) => [user.id, user]));

  const childIdsByParentId = new Map<string, string[]>();
  for (const agency of activeAgencies) {
    if (!agency.parent_agency_id) continue;
    const siblings = childIdsByParentId.get(agency.parent_agency_id) || [];
    siblings.push(agency.id);
    childIdsByParentId.set(agency.parent_agency_id, siblings);
  }

  const descendantsByAgencyId = new Map<string, Set<string>>();
  const inProgressDescendants = new Set<string>();

  const getAgencyDescendants = (agencyId: string): Set<string> => {
    const cached = descendantsByAgencyId.get(agencyId);
    if (cached) return cached;

    if (inProgressDescendants.has(agencyId)) {
      return new Set([agencyId]);
    }

    inProgressDescendants.add(agencyId);

    const descendants = new Set<string>([agencyId]);
    for (const childId of childIdsByParentId.get(agencyId) || []) {
      for (const descendantId of getAgencyDescendants(childId)) {
        descendants.add(descendantId);
      }
    }

    inProgressDescendants.delete(agencyId);
    descendantsByAgencyId.set(agencyId, descendants);
    return descendants;
  };

  const policyTotalsByUserId = new Map<
    string,
    {
      wtd_ip: number;
      wtd_policies: number;
      mtd_ip: number;
      mtd_policies: number;
    }
  >();

  for (const policy of policies) {
    if (!policy.user_id || !policy.effective_date) continue;
    const premium = Number(policy.annual_premium || 0);
    if (!Number.isFinite(premium)) continue;

    const totals = policyTotalsByUserId.get(policy.user_id) || {
      wtd_ip: 0,
      wtd_policies: 0,
      mtd_ip: 0,
      mtd_policies: 0,
    };

    if (inDateRange(policy.effective_date, monthStart, monthEnd)) {
      totals.mtd_ip += premium;
      totals.mtd_policies += 1;
    }

    if (inDateRange(policy.effective_date, weekStart, weekEnd)) {
      totals.wtd_ip += premium;
      totals.wtd_policies += 1;
    }

    policyTotalsByUserId.set(policy.user_id, totals);
  }

  const isEligibleAgencyUser = (user: UserProfileForAgency): boolean => {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const hasAgentRole = roles.includes("agent");
    const hasActiveAgentRole = roles.includes("active_agent");
    const hasRecruitRole = roles.includes("recruit");
    const isRecruitOnly =
      hasRecruitRole && !hasAgentRole && !hasActiveAgentRole;

    return (
      user.approval_status === "approved" &&
      !user.archived_at &&
      (hasAgentRole || hasActiveAgentRole || user.is_admin === true) &&
      !isRecruitOnly
    );
  };

  const eligibleUsers = users.filter(isEligibleAgencyUser);
  const results: AgencyIPEntry[] = [];

  for (const agency of activeAgencies) {
    const ownerHierarchyPath = agency.owner_id
      ? userById.get(agency.owner_id)?.hierarchy_path || null
      : null;
    const descendantAgencyIds = getAgencyDescendants(agency.id);

    const memberUserIds = new Set<string>();
    for (const user of eligibleUsers) {
      const hierarchyPath = user.hierarchy_path;
      const matchesOwnerPath = ownerHierarchyPath
        ? hierarchyPath === ownerHierarchyPath ||
          (hierarchyPath !== null &&
            hierarchyPath.startsWith(`${ownerHierarchyPath}.`))
        : false;
      const matchesAgencyTree = user.agency_id
        ? descendantAgencyIds.has(user.agency_id)
        : false;

      if (matchesOwnerPath || matchesAgencyTree) {
        memberUserIds.add(user.id);
      }
    }

    let wtdIP = 0;
    let wtdPolicies = 0;
    let mtdIP = 0;
    let mtdPolicies = 0;

    for (const userId of memberUserIds) {
      const totals = policyTotalsByUserId.get(userId);
      if (!totals) continue;
      wtdIP += totals.wtd_ip;
      wtdPolicies += totals.wtd_policies;
      mtdIP += totals.mtd_ip;
      mtdPolicies += totals.mtd_policies;
    }

    results.push({
      agency_id: agency.id,
      agency_name: activeAgencyById.get(agency.id)?.name ?? "Unknown Agency",
      wtd_ip: wtdIP,
      wtd_policies: wtdPolicies,
      mtd_ip: mtdIP,
      mtd_policies: mtdPolicies,
    });
  }

  return results
    .filter((entry) => entry.wtd_ip > 0 || entry.mtd_ip > 0)
    .sort((a, b) => b.mtd_ip - a.mtd_ip);
}

/**
 * Apply reporting business rule:
 * Self Made (top/root agency) should reflect rolled-up IMO totals.
 */
function buildDisplayAgencies(
  agencies: AgencyIPEntry[],
  totalWTD: number,
  totalMTD: number,
): AgencyIPEntry[] {
  const display = [...agencies]
    .filter((a) => a.wtd_ip > 0 || a.mtd_ip > 0)
    .sort((a, b) => b.mtd_ip - a.mtd_ip);

  const selfMadeIndex = display.findIndex((agency) =>
    agency.agency_name.toLowerCase().includes("self made"),
  );

  if (selfMadeIndex >= 0) {
    display[selfMadeIndex] = {
      ...display[selfMadeIndex],
      wtd_ip: totalWTD,
      mtd_ip: totalMTD,
    };
  } else {
    display.unshift({
      agency_id: "self-made-rollup",
      agency_name: "Self Made Financial",
      wtd_ip: totalWTD,
      wtd_policies: 0,
      mtd_ip: totalMTD,
      mtd_policies: 0,
    });
  }

  return display.sort((a, b) => b.mtd_ip - a.mtd_ip);
}

/**
 * Build IP leaderboard message
 */
function buildIPLeaderboardMessage(
  agents: IPLeaderboardEntry[],
  agencies: AgencyIPEntry[],
  totalAgentCount: number,
  weekRange: string,
): string {
  let message = `:chart_with_upwards_trend: *Weekly IP Report*\n`;
  message += `:date: Week of ${weekRange}\n\n`;
  message += `*IP (Issued Premium):* Approved & placed policies count towards IP only. Pending policies not yet issued are excluded.\n\n`;
  message += `:warning: *Accuracy depends on YOU:* Update your policies from pending to approved when policies go into effect.\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Top Producers WTD - agents with WTD IP > 0
  const agentsWithWTD = agents
    .filter((a) => a.wtd_ip > 0)
    .sort((a, b) => b.wtd_ip - a.wtd_ip);
  const agentsWithZeroWTD = totalAgentCount - agentsWithWTD.length;

  if (agentsWithWTD.length > 0) {
    message += `*Top Producers (WTD):*\n`;
    agentsWithWTD.forEach((agent, index) => {
      const rank = index + 1;
      const emoji = getRankEmoji(rank);
      const ip = formatCurrency(agent.wtd_ip);
      const policies = agent.wtd_policies;
      const paddedIP = ip.padStart(10, " ");
      message += `${emoji} ${paddedIP}  ·  ${agent.agent_name}  (${policies} ${policies === 1 ? "policy" : "policies"})\n`;
    });
    message += `\n`;
  }

  // Show agents with zero WTD
  if (agentsWithZeroWTD > 0) {
    message += `_${agentsWithZeroWTD} agent${agentsWithZeroWTD === 1 ? "" : "s"} with $0 IP this week_\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Top Producers MTD
  const agentsWithMTD = agents
    .filter((a) => a.mtd_ip > 0)
    .sort((a, b) => b.mtd_ip - a.mtd_ip);
  const agentsWithZeroMTD = totalAgentCount - agentsWithMTD.length;

  if (agentsWithMTD.length > 0) {
    message += `*Top Producers (MTD):*\n`;
    agentsWithMTD.forEach((agent, index) => {
      const rank = index + 1;
      const emoji = getRankEmoji(rank);
      const ip = formatCurrency(agent.mtd_ip);
      const policies = agent.mtd_policies;
      const paddedIP = ip.padStart(10, " ");
      message += `${emoji} ${paddedIP}  ·  ${agent.agent_name}  (${policies} ${policies === 1 ? "policy" : "policies"})\n`;
    });
    message += `\n`;
  }

  // Show agents with zero MTD
  if (agentsWithZeroMTD > 0) {
    message += `_${agentsWithZeroMTD} agent${agentsWithZeroMTD === 1 ? "" : "s"} with $0 IP this month_\n\n`;
  }

  const totalWTD = agents.reduce((sum, agent) => sum + agent.wtd_ip, 0);
  const totalMTD = agents.reduce((sum, agent) => sum + agent.mtd_ip, 0);
  const displayAgencies = buildDisplayAgencies(agencies, totalWTD, totalMTD);

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `:moneybag: *Total WTD:* ${formatCurrency(totalWTD)}\n`;
  message += `:calendar: *Total MTD:* ${formatCurrency(totalMTD)}\n\n`;

  // Agency rankings (sorted by MTD IP descending)
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `:office: *Agency Rankings*\n\n`;

  displayAgencies.forEach((agency) => {
    message += `${agency.agency_name}:  WTD ${formatCurrency(agency.wtd_ip)} · MTD ${formatCurrency(agency.mtd_ip)}\n`;
  });

  return message;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    console.log("[slack-ip-leaderboard] Function invoked");

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

    const body = await req.json();
    const { imoId } = body;

    if (!imoId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing imoId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Self Made Slack integration specifically
    const { data: integrations, error: integrationError } = await supabase
      .from("slack_integrations")
      .select("*, workspace_logo_url")
      .eq("imo_id", imoId)
      .eq("is_active", true)
      .eq("connection_status", "connected")
      .ilike("team_name", "%self made%")
      .limit(1);

    const integration = integrations?.[0];

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No active Slack integration found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if leaderboard channel is configured
    if (!integration.leaderboard_channel_id) {
      console.log("[slack-ip-leaderboard] No leaderboard channel configured");
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No leaderboard channel configured",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const reportingWindow = getReportingWindow();
    const fetchStartDate =
      reportingWindow.weekStart < reportingWindow.monthStart
        ? reportingWindow.weekStart
        : reportingWindow.monthStart;

    // Pull approved policies for month-through-report-end and aggregate in code.
    // This guarantees date-window correctness even if RPC definitions lag deployment.
    const policies = await fetchPoliciesForRange(
      supabase,
      imoId,
      fetchStartDate,
      reportingWindow.weekEnd,
    );

    if (!policies || policies.length === 0) {
      console.log("[slack-ip-leaderboard] No IP data available");
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No IP data",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userIds = [
      ...new Set(policies.map((p) => p.user_id).filter(Boolean)),
    ].map((id) => id as string);

    const [userNameById, activeAgencies, agencyUsers] = await Promise.all([
      fetchUserNames(supabase, userIds),
      fetchActiveAgencies(supabase, imoId),
      fetchAgencyUsers(supabase, imoId),
    ]);

    const agents = buildAgentEntries(
      policies,
      reportingWindow.monthStart,
      reportingWindow.monthEnd,
      reportingWindow.weekStart,
      reportingWindow.weekEnd,
      userNameById,
    );

    const agencies = buildAgencyEntries(
      policies,
      reportingWindow.monthStart,
      reportingWindow.monthEnd,
      reportingWindow.weekStart,
      reportingWindow.weekEnd,
      activeAgencies,
      agencyUsers,
    );

    // Get total active agent count for "agents with $0" calculation
    const { count: totalAgentCount } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "approved")
      .is("archived_at", null)
      .or("roles.cs.{agent},roles.cs.{active_agent}");

    // Build message
    const weekRange = reportingWindow.weekRange;
    const message = buildIPLeaderboardMessage(
      agents,
      agencies,
      totalAgentCount ?? 0,
      weekRange,
    );

    // Decrypt bot token
    const botToken = await decrypt(integration.bot_token_encrypted);

    // Build message payload
    const messagePayload: Record<string, unknown> = {
      channel: integration.leaderboard_channel_id,
      text: message,
    };

    // Use workspace logo as bot icon if configured
    if (integration.workspace_logo_url) {
      messagePayload.icon_url = integration.workspace_logo_url;
    }

    // Send to Slack
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    const data = await response.json();

    // Record message
    await supabase.from("slack_messages").insert({
      imo_id: imoId,
      slack_integration_id: integration.id,
      channel_id: integration.leaderboard_channel_id,
      notification_type: "ip_leaderboard",
      message_text: message,
      related_entity_type: "leaderboard",
      related_entity_id: null,
      status: data.ok ? "sent" : "failed",
      message_ts: data.ts || null,
      error_message: data.error || null,
      sent_at: data.ok ? new Date().toISOString() : null,
    });

    // Update integration status if token is invalid
    if (data.error === "token_revoked" || data.error === "invalid_auth") {
      await supabase
        .from("slack_integrations")
        .update({
          connection_status: "error",
          last_error: data.error,
        })
        .eq("id", integration.id);
    }

    const totalWTD = agents.reduce((sum, agent) => sum + agent.wtd_ip, 0);
    const totalMTD = agents.reduce((sum, agent) => sum + agent.mtd_ip, 0);
    const displayAgencies = buildDisplayAgencies(agencies, totalWTD, totalMTD);

    const result = {
      channel: integration.leaderboard_channel_name,
      weekRange,
      topWTD: [...agents]
        .filter((agent) => agent.wtd_ip > 0)
        .sort((a, b) => b.wtd_ip - a.wtd_ip)
        .slice(0, 5)
        .map((agent) => ({
          name: agent.agent_name,
          ip: Math.round(agent.wtd_ip),
          policies: agent.wtd_policies,
        })),
      topMTD: [...agents]
        .filter((agent) => agent.mtd_ip > 0)
        .sort((a, b) => b.mtd_ip - a.mtd_ip)
        .slice(0, 5)
        .map((agent) => ({
          name: agent.agent_name,
          ip: Math.round(agent.mtd_ip),
          policies: agent.mtd_policies,
        })),
      topAgencies: displayAgencies.slice(0, 5).map((agency) => ({
        name: agency.agency_name,
        wtd: Math.round(agency.wtd_ip),
        mtd: Math.round(agency.mtd_ip),
      })),
      ok: data.ok,
      error: data.error,
    };

    console.log(
      `[slack-ip-leaderboard] Posted IP report to #${integration.leaderboard_channel_name} (${weekRange})`,
    );

    return new Response(JSON.stringify({ ok: true, results: [result] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[slack-ip-leaderboard] Unexpected error:", err);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
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
