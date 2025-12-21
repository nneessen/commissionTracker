// src/types/join-request.types.ts
// Type definitions for join request system

import type { Database } from './database.types';

/**
 * Join request status values
 */
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Raw join_requests table row
 */
export type JoinRequestRow = Database['public']['Tables']['join_requests']['Row'];

/**
 * Insert type for join_requests
 * Note: approver_id is set by database trigger, so we make it optional here
 */
export type JoinRequestInsert = Omit<
  Database['public']['Tables']['join_requests']['Insert'],
  'approver_id'
> & {
  approver_id?: string;
};

/**
 * Update type for join_requests
 */
export type JoinRequestUpdate = Database['public']['Tables']['join_requests']['Update'];

/**
 * Simplified user info for display
 */
export interface JoinRequestUserInfo {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Simplified organization info for display
 */
export interface JoinRequestOrgInfo {
  id: string;
  name: string;
  code: string;
}

/**
 * Join request with related data for display
 */
export interface JoinRequest extends JoinRequestRow {
  requester?: JoinRequestUserInfo;
  approver?: JoinRequestUserInfo;
  imo?: JoinRequestOrgInfo;
  agency?: JoinRequestOrgInfo | null;
  requested_upline?: JoinRequestUserInfo | null;
}

/**
 * Request to create a join request
 */
export interface CreateJoinRequestInput {
  imo_id: string;
  agency_id?: string | null;
  requested_upline_id?: string | null;
  message?: string | null;
}

/**
 * Request to reject a join request
 */
export interface RejectJoinRequestInput {
  request_id: string;
  reason?: string | null;
}

/**
 * Request to approve a join request
 */
export interface ApproveJoinRequestInput {
  request_id: string;
  agency_id?: string | null;     // Override agency
  upline_id?: string | null;     // Override upline
}

/**
 * IMO option for join request form
 */
export interface ImoOption {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

/**
 * Agency option for join request form
 */
export interface AgencyOption {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

/**
 * Join request eligibility check result
 */
export interface JoinRequestEligibility {
  canSubmit: boolean;
  reason?: string;
}
