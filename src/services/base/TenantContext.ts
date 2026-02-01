// src/services/base/TenantContext.ts
// Utility for getting the current user's tenant context (imo_id, agency_id)

import { supabase } from "./supabase";

export interface TenantContext {
  userId: string;
  imoId: string | null;
  agencyId: string | null;
}

/**
 * Get the current user's tenant context from their profile.
 * Returns the user's imo_id and agency_id for multi-tenant data isolation.
 *
 * @throws Error if user is not authenticated or profile not found
 */
export async function getCurrentTenantContext(): Promise<TenantContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("imo_id, agency_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  return {
    userId: user.id,
    imoId: profile?.imo_id ?? null,
    agencyId: profile?.agency_id ?? null,
  };
}

/**
 * Get tenant context, returning null values instead of throwing on error.
 * Useful for optional tenant context injection where missing data is acceptable.
 */
export async function getTenantContextSafe(): Promise<TenantContext | null> {
  try {
    return await getCurrentTenantContext();
  } catch {
    return null;
  }
}

/**
 * Extract tenant fields from user profile for DB insertion.
 * Returns an object with imo_id and agency_id ready to spread into DB data.
 */
export async function getTenantFields(): Promise<{
  imo_id: string | null;
  agency_id: string | null;
}> {
  const context = await getCurrentTenantContext();
  return {
    imo_id: context.imoId,
    agency_id: context.agencyId,
  };
}
