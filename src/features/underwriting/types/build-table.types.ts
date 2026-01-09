// src/features/underwriting/types/build-table.types.ts

import type { Database } from "@/types/database.types";

// ============================================================================
// Database Row Types (derived from database.types.ts)
// ============================================================================

export type CarrierBuildChart =
  Database["public"]["Tables"]["carrier_build_charts"]["Row"];
export type CarrierBuildChartInsert =
  Database["public"]["Tables"]["carrier_build_charts"]["Insert"];
export type CarrierBuildChartUpdate =
  Database["public"]["Tables"]["carrier_build_charts"]["Update"];

// ============================================================================
// Build Table Type (height_weight vs BMI)
// ============================================================================

/**
 * Type of build table
 * - height_weight: Traditional height/weight chart with weight ranges per height
 * - bmi: BMI-based table with BMI ranges per rating class
 */
export type BuildTableType = "height_weight" | "bmi";

// ============================================================================
// Build Data Structure Types
// ============================================================================

/**
 * Weight range (min/max) for a rating class
 */
export interface WeightRange {
  min?: number;
  max?: number;
}

/**
 * Weight ranges for each rating class at a specific height
 * All weights are in pounds (lbs)
 */
export interface BuildTableWeightRanges {
  preferredPlus?: WeightRange;
  preferred?: WeightRange;
  standardPlus?: WeightRange;
  standard?: WeightRange;
}

/**
 * BMI range (min/max) for a rating class
 */
export interface BmiRange {
  min?: number;
  max?: number;
}

/**
 * BMI-based table data structure
 */
export interface BmiTableData {
  preferredPlus?: BmiRange;
  preferred?: BmiRange;
  standardPlus?: BmiRange;
  standard?: BmiRange;
}

/**
 * A single row in a build table representing weight ranges at a specific height
 */
export interface BuildTableRow {
  heightInches: number;
  weightRanges: BuildTableWeightRanges;
}

/**
 * The build_data JSON structure stored in carrier_build_charts
 */
export type BuildTableData = BuildTableRow[];

// ============================================================================
// Rating Class Types
// ============================================================================

export type BuildRatingClass =
  | "preferred_plus"
  | "preferred"
  | "standard_plus"
  | "standard"
  | "table_rated"
  | "unknown";

// ============================================================================
// Lookup Result Types
// ============================================================================

export interface BuildRatingLookupResult {
  ratingClass: BuildRatingClass;
  hasTable: boolean;
  thresholdExceeded?: number;
  thresholdClass?: BuildRatingClass;
}

// ============================================================================
// UI/Display Types
// ============================================================================

export interface HeightDisplay {
  inches: number;
  feet: number;
  inchesRemainder: number;
  formatted: string;
}

/**
 * Build chart with carrier info for display
 */
export interface BuildChartDisplay {
  id: string;
  carrierId: string;
  carrierName: string;
  name: string;
  tableType: BuildTableType;
  buildData: BuildTableData;
  bmiData: BmiTableData | null;
  notes: string | null;
  isDefault: boolean;
  updatedAt: string;
}

/**
 * Select option for build chart dropdown
 */
export interface BuildChartOption {
  id: string;
  name: string;
  tableType: BuildTableType;
  isDefault: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Standard height range for build tables (in inches)
 * Extended range from 4'6" to 7'2" to cover edge cases
 */
export const BUILD_TABLE_HEIGHT_RANGE = {
  min: 54, // 4'6"
  max: 86, // 7'2"
} as const;

export const BUILD_RATING_CLASS_LABELS: Record<BuildRatingClass, string> = {
  preferred_plus: "Preferred Plus",
  preferred: "Preferred",
  standard_plus: "Standard Plus",
  standard: "Standard",
  table_rated: "Table Rated",
  unknown: "Unknown",
};

export const BUILD_RATING_CLASS_ORDER: BuildRatingClass[] = [
  "preferred_plus",
  "preferred",
  "standard_plus",
  "standard",
  "table_rated",
];

export const BUILD_TABLE_TYPE_LABELS: Record<BuildTableType, string> = {
  height_weight: "Height/Weight",
  bmi: "BMI",
};

/**
 * All available rating classes with metadata for UI rendering
 * Used for dynamic checkbox-based selection in build chart editor
 */
export const ALL_RATING_CLASSES = [
  { key: "preferredPlus", label: "Preferred Plus", shortLabel: "Pref+" },
  { key: "preferred", label: "Preferred", shortLabel: "Preferred" },
  { key: "standardPlus", label: "Standard Plus", shortLabel: "Std+" },
  { key: "standard", label: "Standard", shortLabel: "Standard" },
] as const;

/**
 * Type for rating class keys used in build table weight ranges
 */
export type RatingClassKey = (typeof ALL_RATING_CLASSES)[number]["key"];

// ============================================================================
// Utility Functions
// ============================================================================

export function inchesToHeightDisplay(totalInches: number): HeightDisplay {
  const feet = Math.floor(totalInches / 12);
  const inchesRemainder = totalInches % 12;
  return {
    inches: totalInches,
    feet,
    inchesRemainder,
    formatted: `${feet}'${inchesRemainder}"`,
  };
}

export function generateHeightOptions(): HeightDisplay[] {
  const options: HeightDisplay[] = [];
  for (
    let inches = BUILD_TABLE_HEIGHT_RANGE.min;
    inches <= BUILD_TABLE_HEIGHT_RANGE.max;
    inches++
  ) {
    options.push(inchesToHeightDisplay(inches));
  }
  return options;
}

export function createEmptyBuildTable(): BuildTableData {
  return generateHeightOptions().map((height) => ({
    heightInches: height.inches,
    weightRanges: {},
  }));
}

export function parseBuildData(json: unknown): BuildTableData {
  if (!Array.isArray(json)) {
    return [];
  }
  return json as BuildTableData;
}

export function parseBmiData(json: unknown): BmiTableData | null {
  if (!json || typeof json !== "object") {
    return null;
  }
  return json as BmiTableData;
}

export function createEmptyBmiTable(): BmiTableData {
  return {
    preferredPlus: undefined,
    preferred: undefined,
    standardPlus: undefined,
    standard: undefined,
  };
}

/**
 * Derives which rating classes have data in a build table.
 * Used to pre-select checkboxes when editing an existing chart.
 */
export function getActiveRatingClasses(
  buildData: BuildTableData,
): RatingClassKey[] {
  const activeSet = new Set<RatingClassKey>();

  for (const row of buildData) {
    for (const rc of ALL_RATING_CLASSES) {
      const key = rc.key as keyof BuildTableWeightRanges;
      if (row.weightRanges[key] !== undefined) {
        activeSet.add(rc.key);
      }
    }
  }

  // Return in standard order (Pref+ -> Pref -> Std+ -> Std)
  return ALL_RATING_CLASSES.map((rc) => rc.key).filter((key) =>
    activeSet.has(key),
  );
}

/**
 * Derives which rating classes have data in BMI table.
 * Used to pre-select checkboxes when editing an existing BMI chart.
 */
export function getActiveBmiClasses(
  bmiData: BmiTableData | null,
): RatingClassKey[] {
  if (!bmiData) return [];

  return ALL_RATING_CLASSES.map((rc) => rc.key).filter(
    (key) => bmiData[key as keyof BmiTableData] !== undefined,
  );
}
