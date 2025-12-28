// src/constants/roles.ts
// Centralized role constants - SINGLE SOURCE OF TRUTH
// All files should import from here to avoid inconsistencies

import type { RoleName } from "@/types/permissions.types";

/**
 * Staff roles that should NOT appear in the recruiting pipeline.
 * These are internal staff/support roles, not actual recruits going through onboarding.
 *
 * Used by:
 * - RecruitRepository: Filter out staff from pipeline queries
 * - AddUserDialog: Auto-approve staff, skip onboarding status
 * - RouteGuard: Block staff from agent-only routes
 */
export const STAFF_ROLES: readonly RoleName[] = [
  "trainer",
  "contracting_manager",
  "upline_manager",
  "office_staff",
  "recruiter",
] as const;

/**
 * Staff roles that have LIMITED access (no agent features).
 * Subset of STAFF_ROLES - these users only see Training Hub, Messages, and their dashboard.
 *
 * Used by:
 * - RouteGuard: Redirect to trainer-dashboard instead of main dashboard
 */
export const STAFF_ONLY_ROLES: readonly RoleName[] = [
  "trainer",
  "contracting_manager",
] as const;

/**
 * Check if a user has any staff role (for pipeline exclusion)
 */
export function hasStaffRole(roles: string[] | null | undefined): boolean {
  if (!roles) return false;
  return STAFF_ROLES.some((staffRole) => roles.includes(staffRole));
}

/**
 * Check if a user has ONLY staff roles (no agent/admin - for route blocking)
 */
export function isStaffOnlyUser(roles: string[] | null | undefined): boolean {
  if (!roles) return false;
  const hasStaff = STAFF_ONLY_ROLES.some((r) => roles.includes(r));
  const hasAgent = roles.includes("agent");
  const hasAdmin = roles.includes("admin");
  return hasStaff && !hasAgent && !hasAdmin;
}
