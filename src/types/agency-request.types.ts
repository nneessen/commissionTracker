import type { Database } from './database.types';

// Database row types
export type AgencyRequestRow = Database['public']['Tables']['agency_requests']['Row'];
export type AgencyRequestInsert = Database['public']['Tables']['agency_requests']['Insert'];
export type AgencyRequestUpdate = Database['public']['Tables']['agency_requests']['Update'];

// Request status enum
export type AgencyRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// Extended type with related data
export interface AgencyRequest extends AgencyRequestRow {
  requester?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  approver?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  current_agency?: {
    id: string;
    name: string;
    code: string;
  };
  created_agency?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

// Create request input
export interface CreateAgencyRequestData {
  proposed_name: string;
  proposed_code: string;
  proposed_description?: string;
}

// Request with computed display name
export interface AgencyRequestWithDisplayName extends AgencyRequest {
  requester_display_name: string;
  approver_display_name: string;
}

// Helper to format display name
export function formatAgencyRequestDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  return email;
}
