// src/features/training-hub/hooks/useAgencyPipelineStats.ts
// Hook for fetching recruiting stats grouped by agency/pipeline owner
// Used in TrainerDashboard for agency pipeline comparison

import { useQuery } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";
import { subDays, startOfMonth } from "date-fns";
import { hasStaffRole } from "@/constants/roles";

/**
 * Metrics for a single agency's pipeline
 */
export interface AgencyMetrics {
  total: number;
  active: number;
  completed: number;
  completedThisMonth: number;
  dropped: number;
  prospects: number;
  needsAttention: number;
  conversionRate: number;
  avgDaysToComplete: number;
}

/**
 * Stats for a single agency/pipeline
 */
export interface AgencyPipelineStats {
  templateId: string;
  templateName: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  isActive: boolean;
  metrics: AgencyMetrics;
}

/**
 * Raw recruit data from query
 */
interface RecruitRow {
  id: string;
  pipeline_template_id: string | null;
  onboarding_status: string | null;
  current_onboarding_phase: string | null;
  onboarding_started_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  roles: string[] | null;
  is_admin: boolean | null;
}

/**
 * Raw pipeline template data from query
 * Note: Supabase returns joined relations as single object (not array) when using !fkey syntax
 */
interface PipelineTemplateRow {
  id: string;
  name: string;
  is_active: boolean | null;
  created_by: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creator: any; // Supabase may return object or array depending on relation
}

/**
 * Calculate metrics for a set of recruits
 */
function calculateMetrics(recruits: RecruitRow[]): AgencyMetrics {
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const monthStart = startOfMonth(now);

  // Separate enrolled vs prospects
  const enrolled = recruits.filter((r) => {
    if (r.onboarding_status === "prospect") return false;
    if (!r.onboarding_started_at && !r.onboarding_status) return false;
    return true;
  });

  const prospects = recruits.filter((r) => {
    return (
      r.onboarding_status === "prospect" ||
      (!r.onboarding_started_at && !r.onboarding_status)
    );
  });

  const active = enrolled.filter(
    (r) =>
      r.onboarding_status &&
      !["completed", "dropped"].includes(r.onboarding_status),
  );

  const completed = enrolled.filter((r) => r.onboarding_status === "completed");

  const completedThisMonth = completed.filter(
    (r) => r.updated_at && new Date(r.updated_at) >= monthStart,
  );

  const dropped = enrolled.filter((r) => r.onboarding_status === "dropped");

  const needsAttention = enrolled.filter((r) => {
    if (r.updated_at && new Date(r.updated_at) < sevenDaysAgo) {
      if (
        r.onboarding_status &&
        !["completed", "dropped"].includes(r.onboarding_status)
      ) {
        return true;
      }
    }
    return false;
  });

  // Calculate avg days to complete
  let totalDays = 0;
  completed.forEach((r) => {
    if (r.created_at && r.updated_at) {
      const created = new Date(r.created_at);
      const completedAt = new Date(r.updated_at);
      totalDays += Math.ceil(
        (completedAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
      );
    }
  });

  const conversionRate =
    enrolled.length > 0
      ? Math.round((completed.length / enrolled.length) * 100)
      : 0;

  const avgDaysToComplete =
    completed.length > 0 ? Math.round(totalDays / completed.length) : 0;

  return {
    total: enrolled.length,
    active: active.length,
    completed: completed.length,
    completedThisMonth: completedThisMonth.length,
    dropped: dropped.length,
    prospects: prospects.length,
    needsAttention: needsAttention.length,
    conversionRate,
    avgDaysToComplete,
  };
}

/**
 * Hook to fetch recruiting stats grouped by agency/pipeline owner
 * Returns stats for each pipeline template with their creator info
 */
export function useAgencyPipelineStats() {
  return useQuery({
    queryKey: ["agency-pipeline-stats"],
    queryFn: async (): Promise<AgencyPipelineStats[]> => {
      // Fetch all pipeline templates with creator info
      const { data: templates, error: templatesError } = await supabase
        .from("pipeline_templates")
        .select(
          `
          id,
          name,
          is_active,
          created_by,
          creator:created_by(id, first_name, last_name, email)
        `,
        )
        .order("name");

      if (templatesError) throw templatesError;

      // Fetch all recruits with recruit role
      const { data: recruits, error: recruitsError } = await supabase
        .from("user_profiles")
        .select(
          `
          id,
          pipeline_template_id,
          onboarding_status,
          current_onboarding_phase,
          onboarding_started_at,
          updated_at,
          created_at,
          roles,
          is_admin
        `,
        )
        .contains("roles", ["recruit"]);

      if (recruitsError) throw recruitsError;

      // Filter to actual recruits - exclude users who also have agent/admin/staff roles
      // This matches RecruitRepository.filterRecruitIds logic
      const actualRecruits = ((recruits || []) as RecruitRow[]).filter((r) => {
        const hasAgentRole =
          r.roles?.includes("agent") || r.roles?.includes("active_agent");
        const hasAdminRole = r.roles?.includes("admin");
        const isAdmin = r.is_admin === true;
        if (hasAgentRole || hasAdminRole || isAdmin || hasStaffRole(r.roles)) {
          return false;
        }
        return true;
      });

      // Group recruits by pipeline_template_id
      const recruitsByTemplate = new Map<string, RecruitRow[]>();

      // Initialize map with empty arrays for all templates
      (templates || []).forEach((t) => {
        recruitsByTemplate.set(t.id, []);
      });

      // Group recruits (including null pipeline_template_id as "unassigned")
      actualRecruits.forEach((r) => {
        const templateId = r.pipeline_template_id || "unassigned";
        const existing = recruitsByTemplate.get(templateId) || [];
        existing.push(r);
        recruitsByTemplate.set(templateId, existing);
      });

      // Build stats for each template
      const stats: AgencyPipelineStats[] = [];

      (templates as PipelineTemplateRow[] | null)?.forEach((template) => {
        const templateRecruits = recruitsByTemplate.get(template.id) || [];

        // Skip templates with no recruits and no creator (system templates)
        if (templateRecruits.length === 0 && !template.created_by) {
          return;
        }

        // Handle creator - Supabase may return object or array
        const rawCreator = template.creator;
        const creator = Array.isArray(rawCreator) ? rawCreator[0] : rawCreator;
        const creatorName = creator
          ? creator.first_name && creator.last_name
            ? `${creator.first_name} ${creator.last_name}`
            : creator.email
          : "System";

        stats.push({
          templateId: template.id,
          templateName: template.name,
          creatorId: template.created_by || "",
          creatorName,
          creatorEmail: creator?.email || "",
          isActive: template.is_active ?? true,
          metrics: calculateMetrics(templateRecruits),
        });
      });

      // Add "Unassigned" group if there are recruits without a pipeline
      const unassignedRecruits = recruitsByTemplate.get("unassigned") || [];
      if (unassignedRecruits.length > 0) {
        stats.push({
          templateId: "unassigned",
          templateName: "Unassigned",
          creatorId: "",
          creatorName: "No Pipeline",
          creatorEmail: "",
          isActive: true,
          metrics: calculateMetrics(unassignedRecruits),
        });
      }

      // Sort by total recruits (descending), then by name
      stats.sort((a, b) => {
        const totalDiff =
          b.metrics.total +
          b.metrics.prospects -
          (a.metrics.total + a.metrics.prospects);
        if (totalDiff !== 0) return totalDiff;
        return a.templateName.localeCompare(b.templateName);
      });

      return stats;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get aggregated metrics across all agencies
 */
export function aggregateMetrics(stats: AgencyPipelineStats[]): AgencyMetrics {
  const totals: AgencyMetrics = {
    total: 0,
    active: 0,
    completed: 0,
    completedThisMonth: 0,
    dropped: 0,
    prospects: 0,
    needsAttention: 0,
    conversionRate: 0,
    avgDaysToComplete: 0,
  };

  let totalDaysSum = 0;
  let completedCountForAvg = 0;

  stats.forEach((s) => {
    totals.total += s.metrics.total;
    totals.active += s.metrics.active;
    totals.completed += s.metrics.completed;
    totals.completedThisMonth += s.metrics.completedThisMonth;
    totals.dropped += s.metrics.dropped;
    totals.prospects += s.metrics.prospects;
    totals.needsAttention += s.metrics.needsAttention;

    // Weighted average for days to complete
    if (s.metrics.completed > 0) {
      totalDaysSum += s.metrics.avgDaysToComplete * s.metrics.completed;
      completedCountForAvg += s.metrics.completed;
    }
  });

  totals.conversionRate =
    totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;

  totals.avgDaysToComplete =
    completedCountForAvg > 0
      ? Math.round(totalDaysSum / completedCountForAvg)
      : 0;

  return totals;
}
