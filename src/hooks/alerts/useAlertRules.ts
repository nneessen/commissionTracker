/**
 * Alert Rules Hooks
 *
 * TanStack Query hooks for managing alert rules.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type {
  AlertRule,
  AlertableMetric,
  AlertRuleEvaluation,
  AlertRuleFormData,
} from "@/types/alert-rules.types";

// Query keys
export const alertRuleKeys = {
  all: ["alert-rules"] as const,
  list: () => [...alertRuleKeys.all, "list"] as const,
  detail: (id: string) => [...alertRuleKeys.all, "detail", id] as const,
  history: (id: string) => [...alertRuleKeys.all, "history", id] as const,
  metrics: () => [...alertRuleKeys.all, "metrics"] as const,
};

/**
 * Get all alert rules for the current user
 */
export function useAlertRules() {
  return useQuery({
    queryKey: alertRuleKeys.list(),
    queryFn: async (): Promise<AlertRule[]> => {
      const { data, error } = await supabase.rpc("get_my_alert_rules");

      if (error) {
        throw new Error(`Failed to fetch alert rules: ${error.message}`);
      }

      return (data ?? []) as AlertRule[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get available metrics for creating alert rules
 */
export function useAlertableMetrics() {
  return useQuery({
    queryKey: alertRuleKeys.metrics(),
    queryFn: async (): Promise<AlertableMetric[]> => {
      const { data, error } = await supabase.rpc("get_alertable_metrics");

      if (error) {
        throw new Error(`Failed to fetch alertable metrics: ${error.message}`);
      }

      return (data ?? []) as AlertableMetric[];
    },
    staleTime: Infinity, // Metrics are static
  });
}

/**
 * Get evaluation history for an alert rule
 */
export function useAlertRuleHistory(ruleId: string | null, limit = 50) {
  return useQuery({
    queryKey: alertRuleKeys.history(ruleId ?? ""),
    queryFn: async (): Promise<AlertRuleEvaluation[]> => {
      if (!ruleId) return [];

      const { data, error } = await supabase.rpc("get_alert_rule_history", {
        p_rule_id: ruleId,
        p_limit: limit,
      });

      if (error) {
        throw new Error(`Failed to fetch rule history: ${error.message}`);
      }

      return (data ?? []) as AlertRuleEvaluation[];
    },
    enabled: !!ruleId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Create a new alert rule
 */
export function useCreateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: AlertRuleFormData): Promise<AlertRule> => {
      const { data, error } = await supabase.rpc("create_alert_rule", {
        p_name: formData.name,
        p_description: formData.description || null,
        p_metric: formData.metric,
        p_comparison: formData.comparison,
        p_threshold_value: formData.threshold_value,
        p_threshold_unit: formData.threshold_unit || null,
        p_applies_to_self: formData.applies_to_self,
        p_applies_to_downlines: formData.applies_to_downlines,
        p_applies_to_team: formData.applies_to_team,
        p_notify_in_app: formData.notify_in_app,
        p_notify_email: formData.notify_email,
        p_cooldown_hours: formData.cooldown_hours,
      });

      if (error) {
        throw new Error(`Failed to create alert rule: ${error.message}`);
      }

      return data as unknown as AlertRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertRuleKeys.list() });
    },
  });
}

/**
 * Update an existing alert rule
 */
export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      formData,
    }: {
      ruleId: string;
      formData: Partial<AlertRuleFormData>;
    }): Promise<AlertRule> => {
      const { data, error } = await supabase.rpc("update_alert_rule", {
        p_rule_id: ruleId,
        p_name: formData.name,
        p_description: formData.description,
        p_threshold_value: formData.threshold_value,
        p_threshold_unit: formData.threshold_unit,
        p_applies_to_self: formData.applies_to_self,
        p_applies_to_downlines: formData.applies_to_downlines,
        p_applies_to_team: formData.applies_to_team,
        p_notify_in_app: formData.notify_in_app,
        p_notify_email: formData.notify_email,
        p_cooldown_hours: formData.cooldown_hours,
      });

      if (error) {
        throw new Error(`Failed to update alert rule: ${error.message}`);
      }

      return data as unknown as AlertRule;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: alertRuleKeys.list() });
      queryClient.invalidateQueries({
        queryKey: alertRuleKeys.detail(variables.ruleId),
      });
    },
  });
}

/**
 * Toggle an alert rule's active state
 */
export function useToggleAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      isActive,
    }: {
      ruleId: string;
      isActive: boolean;
    }): Promise<AlertRule> => {
      const { data, error } = await supabase.rpc("toggle_alert_rule_active", {
        p_rule_id: ruleId,
        p_is_active: isActive,
      });

      if (error) {
        throw new Error(`Failed to toggle alert rule: ${error.message}`);
      }

      return data as unknown as AlertRule;
    },
    onMutate: async ({ ruleId, isActive }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: alertRuleKeys.list() });

      const previousRules = queryClient.getQueryData<AlertRule[]>(
        alertRuleKeys.list()
      );

      if (previousRules) {
        queryClient.setQueryData<AlertRule[]>(
          alertRuleKeys.list(),
          previousRules.map((rule) =>
            rule.id === ruleId ? { ...rule, is_active: isActive } : rule
          )
        );
      }

      return { previousRules };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData(alertRuleKeys.list(), context.previousRules);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: alertRuleKeys.list() });
    },
  });
}

/**
 * Delete an alert rule
 */
export function useDeleteAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("delete_alert_rule", {
        p_rule_id: ruleId,
      });

      if (error) {
        throw new Error(`Failed to delete alert rule: ${error.message}`);
      }

      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertRuleKeys.list() });
    },
  });
}
