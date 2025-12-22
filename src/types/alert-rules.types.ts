/**
 * Alert Rules Types
 *
 * Types for the configurable alert rules system that monitors business metrics
 * and triggers notifications when thresholds are exceeded.
 */

import { z } from "zod";
import type { Database } from "./database.types";

// Database types
export type AlertMetric = Database["public"]["Enums"]["alert_metric"];
export type AlertComparison = Database["public"]["Enums"]["alert_comparison"];

export type AlertRuleRow = Database["public"]["Tables"]["alert_rules"]["Row"];
export type AlertRuleInsert =
  Database["public"]["Tables"]["alert_rules"]["Insert"];
export type AlertRuleUpdate =
  Database["public"]["Tables"]["alert_rules"]["Update"];

export type AlertRuleEvaluationRow =
  Database["public"]["Tables"]["alert_rule_evaluations"]["Row"];

// Extended alert rule with owner name from RPC
export interface AlertRule {
  id: string;
  owner_id: string;
  owner_name: string | null;
  imo_id: string | null;
  agency_id: string | null;
  name: string;
  description: string | null;
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
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

// Alertable metric definition from RPC
export interface AlertableMetric {
  metric: string;
  label: string;
  description: string;
  default_unit: string;
  default_threshold: number;
  default_comparison: AlertComparison;
  available_for_self: boolean;
  available_for_downlines: boolean;
  available_for_team: boolean;
}

// Alert rule evaluation history item
export interface AlertRuleEvaluation {
  id: string;
  triggered: boolean;
  current_value: number | null;
  threshold_value: number;
  comparison: AlertComparison;
  affected_user_id: string | null;
  affected_user_name: string | null;
  affected_entity_type: string | null;
  affected_entity_id: string | null;
  notification_id: string | null;
  evaluated_at: string;
}

// Form data for creating/editing alert rules
export interface AlertRuleFormData {
  name: string;
  description?: string;
  metric: AlertMetric;
  comparison: AlertComparison;
  threshold_value: number;
  threshold_unit?: string;
  applies_to_self: boolean;
  applies_to_downlines: boolean;
  applies_to_team: boolean;
  notify_in_app: boolean;
  notify_email: boolean;
  cooldown_hours: number;
}

// Zod schemas for validation
export const alertRuleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  metric: z.enum([
    "policy_lapse_warning",
    "target_miss_risk",
    "commission_threshold",
    "new_policy_count",
    "recruit_stall",
    "override_change",
    "team_production_drop",
    "persistency_warning",
    "license_expiration",
  ] as const),
  comparison: z.enum(["lt", "lte", "gt", "gte", "eq"] as const),
  threshold_value: z.number().min(0, "Threshold must be positive"),
  threshold_unit: z.string().optional(),
  applies_to_self: z.boolean(),
  applies_to_downlines: z.boolean(),
  applies_to_team: z.boolean(),
  notify_in_app: z.boolean(),
  notify_email: z.boolean(),
  cooldown_hours: z.number().min(1).max(168), // 1 hour to 7 days
});

export type AlertRuleFormSchema = z.infer<typeof alertRuleFormSchema>;

// Comparison operator display config
export const COMPARISON_LABELS: Record<AlertComparison, string> = {
  lt: "Less than",
  lte: "Less than or equal",
  gt: "Greater than",
  gte: "Greater than or equal",
  eq: "Equal to",
};

export const COMPARISON_SYMBOLS: Record<AlertComparison, string> = {
  lt: "<",
  lte: "<=",
  gt: ">",
  gte: ">=",
  eq: "=",
};

// Metric display config
export const METRIC_LABELS: Record<AlertMetric, string> = {
  policy_lapse_warning: "Policy Lapse Warning",
  target_miss_risk: "Target Miss Risk",
  commission_threshold: "Commission Threshold",
  new_policy_count: "New Policy Count",
  recruit_stall: "Recruit Stall",
  override_change: "Override Change",
  team_production_drop: "Team Production Drop",
  persistency_warning: "Persistency Warning",
  license_expiration: "License Expiration",
};

// Unit display config
export const UNIT_LABELS: Record<string, string> = {
  days: "days",
  percent: "%",
  count: "",
  currency: "$",
};

// Notification preferences types
export type NotificationPreferencesRow =
  Database["public"]["Tables"]["notification_preferences"]["Row"];

export interface NotificationPreferences {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  browser_push_enabled: boolean;
  browser_push_subscription: unknown | null;
  email_digest_enabled: boolean;
  email_digest_frequency: string;
  email_digest_time: string;
  email_digest_timezone: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  notify_on_reply: boolean;
  notify_on_open: boolean;
  notify_on_click: boolean;
  last_digest_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesFormData {
  in_app_enabled: boolean;
  browser_push_enabled: boolean;
  email_digest_enabled: boolean;
  email_digest_frequency: string;
  email_digest_time: string;
  email_digest_timezone: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

// Timezone options for digest delivery
export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

// Frequency options for digest
export const DIGEST_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];
