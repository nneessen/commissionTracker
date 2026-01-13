// src/services/underwriting/conditionResponseTransformer.ts
// Transforms wizard follow-up responses to rule-engine-compatible fact keys.
//
// CRITICAL SEMANTICS:
// - Missing source field → undefined output (NEVER false, NEVER [])
// - Derived fields only computed when source exists
// - Conditions without transformers pass through raw data with warning

import type { ConditionResponse } from "@/features/underwriting/types/underwriting.types";

// ============================================================================
// Types
// ============================================================================

/**
 * Transformed condition responses with rule-compatible field names.
 * IMPORTANT: Missing inputs produce undefined outputs, never false/[]/0.
 */
export type TransformedConditionResponses = Record<
  string,
  Record<string, unknown>
>;

interface TransformResult {
  code: string;
  transformed: Record<string, unknown>;
  isRaw: boolean; // True if using pass-through (no specific transformer)
}

// ============================================================================
// Runtime-Safe Normalization Helpers
// ============================================================================

/**
 * Safely extract a non-empty string from unknown input.
 * Returns undefined for: undefined, null, empty string, non-string values.
 */
function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Safely extract a finite number from unknown input.
 * Accepts: number, numeric string (e.g., "7.5").
 * Returns undefined for: undefined, null, NaN, Infinity, non-numeric strings.
 */
function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Safely extract a string array from unknown input.
 * Returns undefined for: undefined, null, non-array values, arrays with non-string elements.
 *
 * IMPORTANT: Empty arrays are PRESERVED (not converted to undefined).
 * The caller must decide whether an empty array means "unanswered" vs "explicitly none".
 */
function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  // Validate all elements are strings
  if (!value.every((item) => typeof item === "string")) return undefined;
  return value as string[];
}

// ============================================================================
// Constants (Documented Thresholds)
// ============================================================================

/**
 * A1C threshold for "controlled" / "good control" diabetes.
 * Per ADA (American Diabetes Association) guidelines:
 * - A1C < 7.0% is the general target for most adults
 * - A1C < 7.5% is often used as a more permissive threshold
 *
 * We use 7.5 as the threshold for underwriting purposes.
 */
const DIABETES_CONTROLLED_A1C_THRESHOLD = 7.5;

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Transform wizard follow-up responses to rule-compatible fact keys.
 *
 * Semantics:
 * - Missing source field → undefined (NOT false, NOT [])
 * - Derived fields only computed when source exists
 * - Conditions without transformers emit warning and pass through raw data
 *
 * @param conditions - Array of condition responses from the wizard
 * @param clientAge - Client's current age (needed for years_since_diagnosis)
 * @returns Transformed responses keyed by condition code
 */
export function transformConditionResponses(
  conditions: ConditionResponse[],
  clientAge: number,
): TransformedConditionResponses {
  const result: TransformedConditionResponses = {};

  for (const condition of conditions) {
    const { code, transformed, isRaw } = transformSingleCondition(
      condition.conditionCode,
      condition.responses,
      clientAge,
    );

    if (isRaw) {
      console.warn(
        `[ConditionTransformer] No transformer for "${code}". ` +
          `Raw wizard data passed through - rule predicates may not match.`,
      );
    }

    result[code] = transformed;
  }

  return result;
}

// ============================================================================
// Condition Router
// ============================================================================

function transformSingleCondition(
  code: string,
  responses: Record<string, string | number | string[]>,
  clientAge: number,
): TransformResult {
  switch (code) {
    case "diabetes":
      return {
        code,
        transformed: transformDiabetes(responses, clientAge),
        isRaw: false,
      };
    // Future: case 'heart_disease': ...
    // Future: case 'cancer': ...
    // Future: case 'hypertension': ...
    default:
      // Pass through raw data for conditions without specific transformers
      return {
        code,
        transformed: responses as Record<string, unknown>,
        isRaw: true,
      };
  }
}

// ============================================================================
// Diabetes Transformer
// ============================================================================

/**
 * Explicit mapping of wizard treatment option strings to insulin_use boolean.
 * Using explicit mapping prevents substring matching errors (e.g., "No insulin" containing "Insulin").
 */
const DIABETES_TREATMENT_INSULIN_MAP: Record<string, boolean> = {
  // Insulin-using treatments
  "Insulin only": true,
  "Insulin pump": true,
  "Oral medication + Insulin": true,
  "Oral medication and Insulin": true,
  // Non-insulin treatments
  "Oral medication only": false,
  "Diet and exercise only": false,
  "Diet only": false,
  "No medication": false,
  "No insulin": false,
  "No treatment": false,
};

/**
 * Determine insulin_use from treatment string.
 * Uses explicit mapping first, falls back to substring matching only for unknown values.
 */
function deriveInsulinUse(treatment: string): boolean {
  // 1. Check explicit mapping first (case-sensitive)
  if (treatment in DIABETES_TREATMENT_INSULIN_MAP) {
    return DIABETES_TREATMENT_INSULIN_MAP[treatment];
  }

  // 2. Try case-insensitive exact match
  const lowerTreatment = treatment.toLowerCase();
  for (const [key, value] of Object.entries(DIABETES_TREATMENT_INSULIN_MAP)) {
    if (key.toLowerCase() === lowerTreatment) {
      return value;
    }
  }

  // 3. Fallback: substring matching with safeguards
  // Only use if no explicit mapping found - log warning for tracking
  console.warn(
    `[DiabetesTransformer] Unknown treatment string "${treatment}". Using substring heuristic.`,
  );

  // Check for negation patterns BEFORE checking for "insulin" presence
  const negationPatterns = [
    /\bno\s+insulin\b/i,
    /\bwithout\s+insulin\b/i,
    /\bnon-?insulin\b/i,
  ];
  if (negationPatterns.some((pattern) => pattern.test(treatment))) {
    return false;
  }

  // If "insulin" or "pump" present without negation, assume insulin use
  return /\binsulin\b/i.test(treatment) || /\bpump\b/i.test(treatment);
}

/**
 * Transform diabetes wizard responses to rule-compatible facts.
 *
 * Output Fields:
 * - insulin_use: boolean | undefined - derived from treatment string
 * - is_controlled: boolean | undefined - A1C < threshold (legacy alias)
 * - good_control: boolean | undefined - A1C < threshold (preferred name)
 * - a1c_level: number | undefined - raw A1C value (pass-through)
 * - complications: string[] | undefined - normalized complication list
 * - years_since_diagnosis: number | undefined - clientAge - diagnosisAge
 * - type: string | undefined - diabetes type (pass-through)
 *
 * CRITICAL SEMANTICS:
 * - Missing source → undefined output (NEVER false, NEVER [])
 * - Empty complications array without explicit "None" → undefined (unanswered)
 * - Invalid diagnosis_age → years_since_diagnosis undefined
 */
function transformDiabetes(
  responses: Record<string, unknown>,
  clientAge: number,
): Record<string, unknown> {
  // Safe extraction using normalization helpers
  const treatment = asNonEmptyString(responses.treatment);
  const a1cLevel = asFiniteNumber(responses.a1c_level);
  const rawComplications = asStringArray(responses.complications);
  const diagnosisAge = asFiniteNumber(responses.diagnosis_age);
  const diabetesType = asNonEmptyString(responses.type);

  const result: Record<string, unknown> = {};

  // insulin_use: Only set if treatment is provided (non-empty string)
  if (treatment !== undefined) {
    result.insulin_use = deriveInsulinUse(treatment);
  }
  // If treatment is undefined/empty, insulin_use stays undefined (NOT false)

  // is_controlled & good_control: Only set if A1C is provided and finite
  if (a1cLevel !== undefined) {
    const controlled = a1cLevel < DIABETES_CONTROLLED_A1C_THRESHOLD;
    result.is_controlled = controlled;
    result.good_control = controlled; // Alias for predicates using either name
    result.a1c_level = a1cLevel; // Pass through raw value
  }
  // If a1c_level is undefined/invalid, is_controlled & good_control stay undefined

  // complications: Only set if provided, with special handling for empty arrays
  if (rawComplications !== undefined) {
    const normalized = normalizeDiabetesComplications(rawComplications);
    // Only set if original array was NOT empty, OR if it contained explicit "None"
    // Empty array without "None" means the user didn't answer → undefined
    if (
      rawComplications.length > 0 ||
      rawComplications.some((c) => c === "None")
    ) {
      result.complications = normalized;
    }
    // else: empty array without "None" → leave undefined (unanswered)
  }
  // If rawComplications is undefined, result.complications stays undefined

  // years_since_diagnosis: Only set if diagnosis_age is valid and reasonable
  if (diagnosisAge !== undefined) {
    const clientAgeNum = asFiniteNumber(clientAge);
    if (
      clientAgeNum !== undefined &&
      diagnosisAge >= 0 &&
      clientAgeNum >= diagnosisAge
    ) {
      result.years_since_diagnosis = clientAgeNum - diagnosisAge;
    }
    // Invalid scenarios (negative diagnosis_age, future diagnosis) → undefined
  }
  // NO date synthesis - use numeric years instead

  // Pass through original type if provided (non-empty string)
  if (diabetesType !== undefined) {
    result.type = diabetesType;
  }

  return result;
}

/**
 * Normalize wizard complication labels to canonical rule values.
 *
 * Mapping:
 * - "Retinopathy (eye)" → "retinopathy"
 * - "Neuropathy (nerve)" → "neuropathy"
 * - "Nephropathy (kidney)" → "nephropathy"
 * - "Amputation" → "amputation"
 * - "Heart disease" → "heart_disease"
 * - "None" → filtered out (results in empty array)
 *
 * Unknown values are normalized: lowercased with parentheticals removed.
 */
function normalizeDiabetesComplications(complications: string[]): string[] {
  const mapping: Record<string, string> = {
    "Retinopathy (eye)": "retinopathy",
    "Neuropathy (nerve)": "neuropathy",
    "Nephropathy (kidney)": "nephropathy",
    Amputation: "amputation",
    "Heart disease": "heart_disease",
    None: "", // Filter out "None" selection
  };

  return complications
    .map((c) => mapping[c] ?? c.toLowerCase().replace(/\s*\([^)]*\)\s*/g, ""))
    .filter((c) => c !== "");
}
