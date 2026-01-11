// src/services/underwriting/premiumMatrixService.ts
// Service for managing premium matrix entries (age × face amount grid)
// Supports term_years for term life insurance products

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";
import type { ProductUnderwritingConstraints } from "@/features/underwriting/types/product-constraints.types";

type PremiumMatrixRow = Database["public"]["Tables"]["premium_matrix"]["Row"];
type PremiumMatrixInsert =
  Database["public"]["Tables"]["premium_matrix"]["Insert"];

// =============================================================================
// Types
// =============================================================================

export type GenderType = "male" | "female";
export type TobaccoClass = "non_tobacco" | "tobacco" | "preferred_non_tobacco";
export type HealthClass =
  | "preferred_plus"
  | "preferred"
  | "standard"
  | "standard_plus"
  | "table_rated";
export type TermYears = 10 | 15 | 20 | 25 | 30;

export interface PremiumMatrix extends PremiumMatrixRow {
  product?: {
    id: string;
    name: string;
    product_type: string;
    carrier_id: string;
  };
}

// Extended type with full product and carrier info for Quick Quote
export interface PremiumMatrixWithCarrier extends PremiumMatrixRow {
  product: {
    id: string;
    name: string;
    product_type: string;
    carrier_id: string;
    min_age: number | null;
    max_age: number | null;
    min_face_amount: number | null;
    max_face_amount: number | null;
    is_active: boolean;
    metadata: ProductUnderwritingConstraints | null;
    carrier: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface PremiumMatrixEntry {
  age: number;
  faceAmount: number;
  monthlyPremium: number;
}

export interface BulkPremiumEntry {
  productId: string;
  gender: GenderType;
  tobaccoClass: TobaccoClass;
  healthClass: HealthClass;
  termYears?: TermYears | null;
  entries: PremiumMatrixEntry[];
}

// =============================================================================
// Grid Dimensions
// =============================================================================

// Standard ages for the grid (5-year increments from 20 to 85)
export const GRID_AGES = [
  20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85,
] as const;

// Face amounts by product type
// Term Life: larger coverage amounts
export const TERM_FACE_AMOUNTS = [
  25000, 50000, 75000, 100000, 150000, 200000, 250000, 500000, 1000000,
] as const;

// Whole Life / Final Expense: 5k to 50k in 5k increments
export const WHOLE_LIFE_FACE_AMOUNTS = [
  5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
] as const;

// Participating Whole Life: 5k to 50k in 5k increments, then 75k to 300k in 25k increments
export const PARTICIPATING_WHOLE_LIFE_FACE_AMOUNTS = [
  5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 75000,
  100000, 125000, 150000, 175000, 200000, 225000, 250000, 275000, 300000,
] as const;

// Default face amounts (for backward compatibility)
export const GRID_FACE_AMOUNTS = TERM_FACE_AMOUNTS;

// Get face amounts based on product type
export function getFaceAmountsForProductType(
  productType: string,
): readonly number[] {
  switch (productType) {
    case "whole_life":
    case "final_expense":
      return WHOLE_LIFE_FACE_AMOUNTS;
    case "participating_whole_life":
      return PARTICIPATING_WHOLE_LIFE_FACE_AMOUNTS;
    case "term_life":
    default:
      return TERM_FACE_AMOUNTS;
  }
}

// Standard term lengths
export const TERM_OPTIONS: { value: TermYears; label: string }[] = [
  { value: 10, label: "10 Year" },
  { value: 15, label: "15 Year" },
  { value: 20, label: "20 Year" },
  { value: 25, label: "25 Year" },
  { value: 30, label: "30 Year" },
];

// Format face amount for display
export function formatFaceAmount(amount: number): string {
  if (amount >= 1000000) {
    return `$${amount / 1000000}M`;
  }
  return `$${amount / 1000}k`;
}

// UI options
export const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const TOBACCO_OPTIONS: { value: TobaccoClass; label: string }[] = [
  { value: "non_tobacco", label: "Non-Tobacco" },
  { value: "tobacco", label: "Tobacco" },
  { value: "preferred_non_tobacco", label: "Preferred Non-Tobacco" },
];

export const HEALTH_CLASS_OPTIONS: { value: HealthClass; label: string }[] = [
  { value: "preferred_plus", label: "Preferred Plus" },
  { value: "preferred", label: "Preferred" },
  { value: "standard_plus", label: "Standard Plus" },
  { value: "standard", label: "Standard" },
  { value: "table_rated", label: "Table Rated" },
];

// =============================================================================
// Fetch Functions
// =============================================================================

/**
 * Get all premium matrix entries for a product
 */
export async function getPremiumMatrixForProduct(
  productId: string,
  imoId: string,
): Promise<PremiumMatrix[]> {
  const { data, error } = await supabase
    .from("premium_matrix")
    .select(
      `
      *,
      product:products(id, name, product_type, carrier_id)
    `,
    )
    .eq("product_id", productId)
    .eq("imo_id", imoId)
    .order("age", { ascending: true })
    .order("face_amount", { ascending: true });

  if (error) {
    console.error("Error fetching premium matrix:", error);
    throw new Error(`Failed to fetch premium matrix: ${error.message}`);
  }

  return (data || []) as PremiumMatrix[];
}

/**
 * Get premium matrix entries for a specific classification
 * For term products, pass termYears; for non-term products, pass null/undefined
 */
export async function getPremiumMatrixForClassification(
  productId: string,
  gender: GenderType,
  tobaccoClass: TobaccoClass,
  healthClass: HealthClass,
  imoId: string,
  termYears?: TermYears | null,
): Promise<PremiumMatrix[]> {
  let query = supabase
    .from("premium_matrix")
    .select("*")
    .eq("product_id", productId)
    .eq("gender", gender)
    .eq("tobacco_class", tobaccoClass)
    .eq("health_class", healthClass)
    .eq("imo_id", imoId);

  // Filter by term_years (null for non-term products)
  if (termYears) {
    query = query.eq("term_years", termYears);
  } else {
    query = query.is("term_years", null);
  }

  const { data, error } = await query
    .order("age", { ascending: true })
    .order("face_amount", { ascending: true });

  if (error) {
    console.error("Error fetching premium matrix:", error);
    throw new Error(`Failed to fetch premium matrix: ${error.message}`);
  }

  return (data || []) as PremiumMatrix[];
}

/**
 * Get products that have premium matrix entries
 */
export async function getProductsWithPremiumMatrix(
  imoId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("premium_matrix")
    .select("product_id")
    .eq("imo_id", imoId);

  if (error) {
    console.error("Error fetching products with premium matrix:", error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return [...new Set((data || []).map((r) => r.product_id))];
}

/**
 * Get available term years for a product (for term products only)
 */
export async function getTermYearsForProduct(
  productId: string,
  imoId: string,
): Promise<TermYears[]> {
  const { data, error } = await supabase
    .from("premium_matrix")
    .select("term_years")
    .eq("product_id", productId)
    .eq("imo_id", imoId)
    .not("term_years", "is", null);

  if (error) {
    console.error("Error fetching term years:", error);
    return [];
  }

  const termYears = [
    ...new Set((data || []).map((r) => r.term_years as TermYears)),
  ];
  return termYears.sort((a, b) => a - b);
}

/**
 * Get ALL premium matrix entries for an IMO (batch fetch for Quick Quote)
 * Uses RPC function with parallel pagination to bypass PostgREST 1000 row limit.
 * Enables instant recalculation without additional DB queries.
 */
export async function getAllPremiumMatricesForIMO(
  imoId: string,
): Promise<PremiumMatrixWithCarrier[]> {
  const PAGE_SIZE = 1000;

  // Step 1: Get total count
  const { count, error: countError } = await supabase
    .from("premium_matrix")
    .select("*", { count: "exact", head: true })
    .eq("imo_id", imoId);

  if (countError) {
    console.error("Error counting premium matrices:", countError);
    throw new Error(`Failed to count premium matrices: ${countError.message}`);
  }

  const totalRows = count || 0;

  // Step 2: Single fetch for small datasets (optimization)
  if (totalRows <= PAGE_SIZE) {
    const { data, error } = await supabase
      .rpc("get_premium_matrices_for_imo", { p_imo_id: imoId })
      .range(0, PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching premium matrices via RPC:", error);
      throw new Error(`Failed to fetch premium matrices: ${error.message}`);
    }

    return transformRPCResults(data || []);
  }

  // Step 3: Parallel pagination for large datasets
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const pagePromises = Array.from({ length: totalPages }, (_, pageIndex) =>
    supabase
      .rpc("get_premium_matrices_for_imo", { p_imo_id: imoId })
      .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1),
  );

  const results = await Promise.all(pagePromises);

  // Check for errors in any page
  for (let i = 0; i < results.length; i++) {
    if (results[i].error) {
      console.error(`Error fetching page ${i}:`, results[i].error);
      throw new Error(
        `Failed to fetch premium matrices: ${results[i].error!.message}`,
      );
    }
  }

  // Combine all pages
  const allData = results.flatMap((result) => result.data || []);

  return transformRPCResults(allData);
}

// Helper function to transform flat RPC results to nested structure
function transformRPCResults(
  data: PremiumMatrixRPCRow[],
): PremiumMatrixWithCarrier[] {
  return data.map((row) => ({
    id: row.id,
    imo_id: row.imo_id,
    product_id: row.product_id,
    age: row.age,
    face_amount: row.face_amount,
    gender: row.gender as GenderType,
    tobacco_class: row.tobacco_class as TobaccoClass,
    health_class: row.health_class as HealthClass,
    term_years: row.term_years,
    monthly_premium: row.monthly_premium,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    product: {
      id: row.product_id,
      name: row.product_name,
      product_type: row.product_type,
      carrier_id: row.carrier_id,
      min_age: row.min_age,
      max_age: row.max_age,
      min_face_amount: row.min_face_amount,
      max_face_amount: row.max_face_amount,
      is_active: row.is_active,
      metadata: row.product_metadata,
      carrier: row.carrier_name
        ? { id: row.carrier_id, name: row.carrier_name }
        : null,
    },
  }));
}

// Type for RPC response (flat structure from get_premium_matrices_for_imo)
interface PremiumMatrixRPCRow {
  id: string;
  imo_id: string;
  product_id: string;
  age: number;
  face_amount: number;
  gender: string;
  tobacco_class: string;
  health_class: string;
  term_years: number | null;
  monthly_premium: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  product_name: string;
  product_type: string;
  carrier_id: string;
  min_age: number | null;
  max_age: number | null;
  min_face_amount: number | null;
  max_face_amount: number | null;
  is_active: boolean;
  product_metadata: ProductUnderwritingConstraints | null;
  carrier_name: string | null;
}

// =============================================================================
// Mutation Functions
// =============================================================================

/**
 * Bulk upsert premium matrix entries for a classification
 */
export async function bulkUpsertPremiumMatrix(
  input: BulkPremiumEntry,
  imoId: string,
  userId: string,
): Promise<{ saved: number }> {
  // Delete existing entries for this classification first, then insert
  // This avoids issues with the COALESCE-based unique index
  let deleteQuery = supabase
    .from("premium_matrix")
    .delete()
    .eq("product_id", input.productId)
    .eq("gender", input.gender)
    .eq("tobacco_class", input.tobaccoClass)
    .eq("health_class", input.healthClass)
    .eq("imo_id", imoId);

  // Filter by term_years (NULL for non-term, specific value for term)
  if (input.termYears) {
    deleteQuery = deleteQuery.eq("term_years", input.termYears);
  } else {
    deleteQuery = deleteQuery.is("term_years", null);
  }

  // Only delete the specific age/face_amount combinations we're inserting
  const ageValues = [...new Set(input.entries.map((e) => e.age))];
  const faceValues = [...new Set(input.entries.map((e) => e.faceAmount))];
  deleteQuery = deleteQuery.in("age", ageValues).in("face_amount", faceValues);

  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    console.error(
      "Error deleting existing premium matrix entries:",
      deleteError,
    );
    // Don't throw - continue with insert, it will fail if there's a real issue
  }

  // Insert the new entries
  const insertData: PremiumMatrixInsert[] = input.entries.map((entry) => ({
    product_id: input.productId,
    age: entry.age,
    face_amount: entry.faceAmount,
    gender: input.gender,
    tobacco_class: input.tobaccoClass,
    health_class: input.healthClass,
    term_years: input.termYears ?? null,
    monthly_premium: entry.monthlyPremium,
    imo_id: imoId,
    created_by: userId,
  }));

  const { data, error } = await supabase
    .from("premium_matrix")
    .insert(insertData)
    .select();

  if (error) {
    console.error("Error inserting premium matrix:", error);
    throw new Error(`Failed to save premium matrix: ${error.message}`);
  }

  return { saved: data?.length || 0 };
}

/**
 * Delete a single premium matrix entry
 */
export async function deletePremiumMatrixEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from("premium_matrix")
    .delete()
    .eq("id", entryId);

  if (error) {
    console.error("Error deleting premium matrix entry:", error);
    throw new Error(`Failed to delete entry: ${error.message}`);
  }
}

/**
 * Delete all premium matrix entries for a product
 */
export async function deletePremiumMatrixForProduct(
  productId: string,
  imoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("premium_matrix")
    .delete()
    .eq("product_id", productId)
    .eq("imo_id", imoId);

  if (error) {
    console.error("Error deleting premium matrix:", error);
    throw new Error(`Failed to delete premium matrix: ${error.message}`);
  }
}

/**
 * Delete premium matrix entries for a specific term
 */
export async function deletePremiumMatrixForTerm(
  productId: string,
  termYears: TermYears,
  imoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("premium_matrix")
    .delete()
    .eq("product_id", productId)
    .eq("term_years", termYears)
    .eq("imo_id", imoId);

  if (error) {
    console.error("Error deleting premium matrix for term:", error);
    throw new Error(`Failed to delete premium matrix: ${error.message}`);
  }
}

// =============================================================================
// Interpolation Functions
// =============================================================================

/**
 * Linear interpolation between two points
 */
function lerp(
  x: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

/**
 * Find the nearest lower and upper values in a sorted array
 */
function findBounds(
  value: number,
  sortedValues: number[],
): { lower: number | null; upper: number | null } {
  if (sortedValues.length === 0) {
    return { lower: null, upper: null };
  }

  // Exact match
  if (sortedValues.includes(value)) {
    return { lower: value, upper: value };
  }

  // Below minimum
  if (value < sortedValues[0]) {
    return { lower: null, upper: sortedValues[0] };
  }

  // Above maximum
  if (value > sortedValues[sortedValues.length - 1]) {
    return { lower: sortedValues[sortedValues.length - 1], upper: null };
  }

  // Find bracketing values
  let lower = sortedValues[0];
  let upper = sortedValues[sortedValues.length - 1];

  for (const v of sortedValues) {
    if (v <= value && v > lower) {
      lower = v;
    }
    if (v >= value && v < upper) {
      upper = v;
    }
  }

  return { lower, upper };
}

/**
 * Estimate monthly premium using bilinear interpolation
 * Returns null if insufficient data for interpolation
 * For term products, termYears must match exactly (no interpolation across terms)
 */
export function interpolatePremium(
  matrix: PremiumMatrix[],
  targetAge: number,
  targetFaceAmount: number,
  gender: GenderType,
  tobaccoClass: TobaccoClass,
  healthClass: HealthClass,
  termYears?: TermYears | null,
): number | null {
  // Filter to matching classification (including term_years)
  const filtered = matrix.filter(
    (m) =>
      m.gender === gender &&
      m.tobacco_class === tobaccoClass &&
      m.health_class === healthClass &&
      (termYears ? m.term_years === termYears : m.term_years === null),
  );

  if (filtered.length === 0) {
    return null;
  }

  // Build lookup map
  const lookup = new Map<string, number>();
  for (const m of filtered) {
    lookup.set(`${m.age}-${m.face_amount}`, Number(m.monthly_premium));
  }

  // Get unique sorted ages and face amounts
  const ages = [...new Set(filtered.map((m) => m.age))].sort((a, b) => a - b);
  const faceAmounts = [...new Set(filtered.map((m) => m.face_amount))].sort(
    (a, b) => a - b,
  );

  // Exact match
  const exactKey = `${targetAge}-${targetFaceAmount}`;
  if (lookup.has(exactKey)) {
    return lookup.get(exactKey)!;
  }

  // ==========================================================================
  // RATE-PER-THOUSAND (CPT) CALCULATION
  // When we only have ONE face amount in the data, derive rate-per-thousand
  // and calculate premium for any requested face amount.
  // This allows importing rates at a single face amount (e.g., $100k) and
  // calculating premiums for any other face amount.
  // ==========================================================================
  if (faceAmounts.length === 1) {
    const knownFaceAmount = faceAmounts[0];

    // Find rate at target age or interpolate between ages
    const ageBounds = findBounds(targetAge, ages);
    const ageLow = ageBounds.lower ?? ageBounds.upper;
    const ageHigh = ageBounds.upper ?? ageBounds.lower;

    if (ageLow === null || ageHigh === null) {
      return null;
    }

    const premiumLow = lookup.get(`${ageLow}-${knownFaceAmount}`);
    const premiumHigh = lookup.get(`${ageHigh}-${knownFaceAmount}`);

    if (premiumLow === undefined && premiumHigh === undefined) {
      return null;
    }

    // Get the premium at target age (interpolate if needed)
    let premiumAtKnownFace: number;
    if (
      premiumLow !== undefined &&
      premiumHigh !== undefined &&
      ageLow !== ageHigh
    ) {
      // Interpolate between ages
      premiumAtKnownFace = lerp(
        targetAge,
        ageLow,
        ageHigh,
        premiumLow,
        premiumHigh,
      );
    } else {
      // Use the available premium
      premiumAtKnownFace = premiumLow ?? premiumHigh!;
    }

    // Calculate rate per thousand from the known rate
    const ratePerThousand = premiumAtKnownFace / (knownFaceAmount / 1000);

    // Calculate premium for target face amount
    return ratePerThousand * (targetFaceAmount / 1000);
  }

  // Find bounds
  const ageBounds = findBounds(targetAge, ages);
  const faceBounds = findBounds(targetFaceAmount, faceAmounts);

  // Need at least some data points
  const ageLow = ageBounds.lower ?? ageBounds.upper;
  const ageHigh = ageBounds.upper ?? ageBounds.lower;
  const faceLow = faceBounds.lower ?? faceBounds.upper;
  const faceHigh = faceBounds.upper ?? faceBounds.lower;

  if (
    ageLow === null ||
    ageHigh === null ||
    faceLow === null ||
    faceHigh === null
  ) {
    return null;
  }

  // Get the four corner values (some may be the same for boundary cases)
  const q11 = lookup.get(`${ageLow}-${faceLow}`);
  const q12 = lookup.get(`${ageLow}-${faceHigh}`);
  const q21 = lookup.get(`${ageHigh}-${faceLow}`);
  const q22 = lookup.get(`${ageHigh}-${faceHigh}`);

  // Need at least two corners for interpolation
  const corners = [q11, q12, q21, q22].filter((v) => v !== undefined);
  if (corners.length < 2) {
    // Return average of available corners
    return corners.length > 0
      ? corners.reduce((a, b) => a + b!, 0) / corners.length
      : null;
  }

  // If all four corners exist, do bilinear interpolation
  if (
    q11 !== undefined &&
    q12 !== undefined &&
    q21 !== undefined &&
    q22 !== undefined
  ) {
    // Interpolate along face amount for both ages
    const r1 = lerp(targetFaceAmount, faceLow, faceHigh, q11, q12);
    const r2 = lerp(targetFaceAmount, faceLow, faceHigh, q21, q22);
    // Interpolate along age
    return lerp(targetAge, ageLow, ageHigh, r1, r2);
  }

  // Partial interpolation - use available corners
  // If we have same-age corners, interpolate along face amount
  if (q11 !== undefined && q12 !== undefined) {
    return lerp(targetFaceAmount, faceLow, faceHigh, q11, q12);
  }
  if (q21 !== undefined && q22 !== undefined) {
    return lerp(targetFaceAmount, faceLow, faceHigh, q21, q22);
  }

  // If we have same-face corners, interpolate along age
  if (q11 !== undefined && q21 !== undefined) {
    return lerp(targetAge, ageLow, ageHigh, q11, q21);
  }
  if (q12 !== undefined && q22 !== undefined) {
    return lerp(targetAge, ageLow, ageHigh, q12, q22);
  }

  // Fallback: average of available corners
  return corners.reduce((a, b) => a + b!, 0) / corners.length;
}

/**
 * Get exact premium from matrix (no interpolation)
 */
export function getExactPremium(
  matrix: PremiumMatrix[],
  age: number,
  faceAmount: number,
  gender: GenderType,
  tobaccoClass: TobaccoClass,
  healthClass: HealthClass,
  termYears?: TermYears | null,
): number | null {
  const match = matrix.find(
    (m) =>
      m.age === age &&
      m.face_amount === faceAmount &&
      m.gender === gender &&
      m.tobacco_class === tobaccoClass &&
      m.health_class === healthClass &&
      (termYears ? m.term_years === termYears : m.term_years === null),
  );

  return match ? Number(match.monthly_premium) : null;
}
