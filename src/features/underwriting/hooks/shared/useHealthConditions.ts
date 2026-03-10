// src/features/underwriting/hooks/useHealthConditions.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type {
  HealthCondition,
  FollowUpSchema,
  ConditionCategory,
} from "../../types/underwriting.types";
export { underwritingQueryKeys } from "./query-keys";
import { underwritingQueryKeys } from "./query-keys";

async function fetchHealthConditions(): Promise<HealthCondition[]> {
  const { data, error } = await supabase
    .from("underwriting_health_conditions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch health conditions: ${error.message}`);
  }

  return data || [];
}

export function useHealthConditions() {
  return useQuery({
    queryKey: underwritingQueryKeys.conditions(),
    queryFn: fetchHealthConditions,
    staleTime: 1000 * 60 * 60, // 1 hour - reference data doesn't change often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Helper to parse the follow_up_schema JSON from a condition
 */
export function parseFollowUpSchema(
  condition: HealthCondition,
): FollowUpSchema {
  const schema = condition.follow_up_schema as unknown;
  if (
    typeof schema === "object" &&
    schema !== null &&
    "questions" in schema &&
    Array.isArray((schema as { questions: unknown[] }).questions)
  ) {
    return schema as FollowUpSchema;
  }
  return { questions: [] };
}

/**
 * Group conditions by category
 */
export function groupConditionsByCategory(
  conditions: HealthCondition[],
): Record<ConditionCategory, HealthCondition[]> {
  const grouped = conditions.reduce(
    (acc, condition) => {
      const category = condition.category as ConditionCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(condition);
      return acc;
    },
    {} as Record<ConditionCategory, HealthCondition[]>,
  );

  return grouped;
}
