// src/types/imo.types.ts
// Types for Multi-IMO / Multi-Agency architecture

import type { Database, Json } from './database.types';

// =============================================================================
// IMO ROLE CONSTANTS - MEDIUM-1 fix: Centralize role names to avoid magic strings
// =============================================================================

/**
 * IMO-related role names - use these constants instead of hardcoded strings
 */
export const IMO_ROLES = {
  IMO_OWNER: 'imo_owner',
  IMO_ADMIN: 'imo_admin',
} as const;

export type ImoRoleName = (typeof IMO_ROLES)[keyof typeof IMO_ROLES];

/**
 * Check if a roles array includes IMO admin privileges
 */
export function hasImoAdminRole(roles: string[] | null | undefined): boolean {
  if (!roles) return false;
  return roles.includes(IMO_ROLES.IMO_OWNER) || roles.includes(IMO_ROLES.IMO_ADMIN);
}

/**
 * Check if a roles array includes IMO owner role
 */
export function hasImoOwnerRole(roles: string[] | null | undefined): boolean {
  if (!roles) return false;
  return roles.includes(IMO_ROLES.IMO_OWNER);
}

// =============================================================================
// DATABASE ROW TYPES - Imported from generated database.types.ts
// =============================================================================

export type ImoRow = Database['public']['Tables']['imos']['Row'];
export type ImoInsert = Database['public']['Tables']['imos']['Insert'];
export type ImoUpdate = Database['public']['Tables']['imos']['Update'];

// Alias for backward compatibility
export type UpdateImoData = ImoUpdate;

export type AgencyRow = Database['public']['Tables']['agencies']['Row'];
export type AgencyInsert = Database['public']['Tables']['agencies']['Insert'];
export type AgencyUpdate = Database['public']['Tables']['agencies']['Update'];

// Alias for backward compatibility
export type UpdateAgencyData = AgencyUpdate;

// =============================================================================
// EXTENDED INTERFACES
// =============================================================================

/**
 * IMO with related data
 */
export interface Imo extends ImoRow {
  agencies?: Agency[];
  agent_count?: number;
}

/**
 * Agency with related data
 */
export interface Agency extends AgencyRow {
  imo?: Imo;
  owner?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  agent_count?: number;
}

// =============================================================================
// IMO ROLES
// =============================================================================

/**
 * Roles specific to IMO/Agency hierarchy
 */
export type ImoRole =
  | 'imo_owner' // Full control over IMO
  | 'imo_admin' // Manage agencies/agents within IMO
  | 'agency_owner' // Manage their agency and downlines
  | 'trainer' // Training access
  | 'agent'; // Regular agent

/**
 * Check if user has a specific IMO role
 */
export function hasImoRole(roles: string[] | null, role: ImoRole): boolean {
  return roles?.includes(role) ?? false;
}

/**
 * Check if user is an IMO admin (owner or admin)
 */
export function isImoAdmin(roles: string[] | null): boolean {
  return hasImoRole(roles, 'imo_owner') || hasImoRole(roles, 'imo_admin');
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(isSuperAdmin: boolean | null): boolean {
  return isSuperAdmin === true;
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

/**
 * IMO context type for React context
 */
export interface ImoContextType {
  // Current IMO and Agency
  imo: Imo | null;
  agency: Agency | null;

  // Role flags (derived from user profile)
  isImoOwner: boolean;
  isImoAdmin: boolean;
  isAgencyOwner: boolean;
  isSuperAdmin: boolean;

  // Loading/error state
  loading: boolean;
  error: Error | null;

  // Actions
  refetch: () => Promise<void>;
}

// =============================================================================
// FORM TYPES
// =============================================================================

/**
 * Data for creating a new IMO
 */
export interface CreateImoData {
  name: string;
  code: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  settings?: Json;
}

/**
 * Data for creating a new Agency
 */
export interface CreateAgencyData {
  imo_id: string;
  name: string;
  code: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  logo_url?: string;
  owner_id?: string;
  settings?: Json;
}

// =============================================================================
// QUERY/FILTER TYPES
// =============================================================================

/**
 * Filters for querying IMOs
 */
export interface ImoFilters {
  is_active?: boolean;
  code?: string;
}

/**
 * Filters for querying Agencies
 */
export interface AgencyFilters {
  imo_id?: string;
  is_active?: boolean;
  code?: string;
  owner_id?: string;
}

// =============================================================================
// METRICS TYPES
// =============================================================================

/**
 * IMO-level metrics
 */
export interface ImoMetrics {
  total_agencies: number;
  total_agents: number;
  active_agents: number;
  total_policies: number;
  total_premium: number;
  total_commissions: number;
}

/**
 * Agency-level metrics
 */
export interface AgencyMetrics {
  total_agents: number;
  active_agents: number;
  total_policies: number;
  total_premium: number;
  total_commissions: number;
  total_override_commissions: number;
}
