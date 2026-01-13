// src/services/underwriting/generateRulesService.ts
// Service for deterministic rule generation (knockout rules, age rules)

import { supabase } from "@/services/base/supabase";

// =============================================================================
// Types
// =============================================================================

export type GenerationStrategy =
  | "skip_if_exists"
  | "create_new_draft"
  | "upsert_draft";

export interface KnockoutCondition {
  code: string;
  name: string;
  severity: "absolute" | "conditional";
}

export interface GenerateKnockoutRulesInput {
  carrierId: string;
  imoId: string;
  userId: string;
  knockoutCodes?: string[];
  strategy?: GenerationStrategy;
}

export interface GenerateAgeRulesInput {
  carrierId: string;
  imoId: string;
  userId: string;
  productIds?: string[];
  strategy?: GenerationStrategy;
}

export interface GenerationResult {
  success: boolean;
  error?: string;
  created: number;
  skipped: number;
  ruleSetIds: string[];
  productsProcessed?: number;
}

// =============================================================================
// Get Available Knockout Codes
// =============================================================================

/**
 * Fetch the list of available knockout condition codes
 */
export async function getAvailableKnockoutCodes(): Promise<
  KnockoutCondition[]
> {
  const { data, error } = await supabase.rpc("get_available_knockout_codes");

  if (error) {
    console.error("Error fetching knockout codes:", error);
    throw error;
  }

  return (data ?? []).map(
    (row: { code: string; name: string; severity: string }) => ({
      code: row.code,
      name: row.name,
      severity: row.severity as "absolute" | "conditional",
    }),
  );
}

// =============================================================================
// Generate Knockout Rules
// =============================================================================

/**
 * Generate global knockout rule sets for a carrier
 *
 * @param input - Generation parameters
 * @returns Result with created/skipped counts and rule set IDs
 */
export async function generateKnockoutRules(
  input: GenerateKnockoutRulesInput,
): Promise<GenerationResult> {
  const { data, error } = await supabase.rpc("generate_global_knockout_rules", {
    p_carrier_id: input.carrierId,
    p_imo_id: input.imoId,
    p_user_id: input.userId,
    p_knockout_codes: input.knockoutCodes ?? null,
    p_strategy: input.strategy ?? "skip_if_exists",
  });

  if (error) {
    console.error("Error generating knockout rules:", error);
    throw error;
  }

  const result = data as {
    success: boolean;
    error?: string;
    created?: number;
    skipped?: number;
    rule_set_ids?: string[];
  };

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      created: 0,
      skipped: 0,
      ruleSetIds: [],
    };
  }

  return {
    success: true,
    created: result.created ?? 0,
    skipped: result.skipped ?? 0,
    ruleSetIds: result.rule_set_ids ?? [],
  };
}

// =============================================================================
// Generate Age Rules from Products
// =============================================================================

/**
 * Generate age eligibility rule sets from product metadata
 *
 * @param input - Generation parameters
 * @returns Result with created/skipped counts and rule set IDs
 */
export async function generateAgeRulesFromProducts(
  input: GenerateAgeRulesInput,
): Promise<GenerationResult> {
  const { data, error } = await supabase.rpc(
    "generate_age_rules_from_products",
    {
      p_carrier_id: input.carrierId,
      p_imo_id: input.imoId,
      p_user_id: input.userId,
      p_product_ids: input.productIds ?? null,
      p_strategy: input.strategy ?? "skip_if_exists",
    },
  );

  if (error) {
    console.error("Error generating age rules:", error);
    throw error;
  }

  const result = data as {
    success: boolean;
    error?: string;
    created?: number;
    skipped?: number;
    products_processed?: number;
    rule_set_ids?: string[];
  };

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      created: 0,
      skipped: 0,
      ruleSetIds: [],
    };
  }

  return {
    success: true,
    created: result.created ?? 0,
    skipped: result.skipped ?? 0,
    productsProcessed: result.products_processed ?? 0,
    ruleSetIds: result.rule_set_ids ?? [],
  };
}
