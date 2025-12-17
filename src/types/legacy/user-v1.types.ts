/**
 * Legacy User Types (v1)
 *
 * This file provides migration helpers for deprecated user-related types.
 * The deprecated types themselves remain in user.types.ts for import compatibility.
 *
 * Migration Guide:
 * - User → UserProfile
 * - Agent → UserProfile
 * - CreateUserData → CreateUserProfileData
 * - UpdateUserData → UpdateUserProfileData
 * - CreateAgentData → CreateUserProfileData
 * - UpdateAgentData → UpdateUserProfileData
 */

import type {
  UserProfile,
  CreateUserProfileData,
  User,
  Agent,
  CreateUserData,
  UpdateUserData,
} from "../user.types";

// Re-export deprecated types for discoverability
// These are already exported from user.types.ts
export type {
  User as LegacyUser,
  Agent as LegacyAgent,
  CreateUserData as LegacyCreateUserData,
  UpdateUserData as LegacyUpdateUserData,
};

/**
 * Maps legacy User/Agent to UserProfile
 * Use this when migrating old data structures
 *
 * Note: Legacy 'isActive' maps to 'approval_status' in current schema
 */
export function migrateLegacyUser(legacy: User | Agent): Partial<UserProfile> {
  const result: Partial<UserProfile> = {
    id: legacy.id,
    email: legacy.email,
    first_name: legacy.name?.split(" ")[0] ?? null,
    last_name: legacy.name?.split(" ").slice(1).join(" ") ?? null,
    phone: legacy.phone ?? null,
    contract_level: legacy.contractCompLevel ?? null,
    license_number: legacy.licenseNumber ?? null,
    // Note: is_active maps to approval_status (hard deletes only, no soft delete)
    approval_status: legacy.isActive === false ? "denied" : "approved",
  };

  // Only set optional fields if they have values
  if (legacy.agentCode) result.agent_code = legacy.agentCode;
  if (legacy.licenseState) result.license_state = legacy.licenseState;
  if (legacy.notes) result.notes = legacy.notes;
  if (legacy.hireDate)
    result.hire_date = legacy.hireDate.toISOString().split("T")[0];

  return result;
}

/**
 * Maps legacy CreateUserData to CreateUserProfileData
 */
export function migrateLegacyCreateUserData(
  legacy: CreateUserData,
): CreateUserProfileData {
  return {
    email: legacy.email,
    first_name: legacy.name?.split(" ")[0],
    last_name: legacy.name?.split(" ").slice(1).join(" "),
    phone: legacy.phone,
    contract_level: legacy.contractCompLevel,
    license_number: legacy.licenseNumber,
    roles: legacy.roles,
  };
}

/**
 * Type guard to detect legacy User/Agent objects
 */
export function isLegacyUser(obj: unknown): obj is User {
  if (typeof obj !== "object" || obj === null) return false;
  const record = obj as Record<string, unknown>;
  // Legacy users have 'name' instead of 'first_name'/'last_name'
  return (
    "id" in record &&
    "email" in record &&
    "name" in record &&
    !("first_name" in record)
  );
}
