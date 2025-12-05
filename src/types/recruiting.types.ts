// src/types/recruiting.types.ts

import type { Database } from './database.types';

export type AgentStatus = Database['public']['Enums']['agent_status'];

export interface LicensingInfo {
  licenseNumber?: string;
  npn?: string; // National Producer Number
  licenseExpirationDate?: string;
  licenseState?: string;
  licenseType?: string;
  yearsLicensed?: number;
  previousCarriers?: string[];
  specializations?: string[];
}

export interface CreateRecruitInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  upline_id?: string;
  recruiter_id?: string;
  referral_source?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  // New fields for licensing status
  agent_status?: AgentStatus;
  licensing_info?: LicensingInfo;
  pipeline_template_id?: string;
  // Skip pipeline for certain roles
  skip_pipeline?: boolean;
  // Optional role override for admin/non-agent users
  roles?: string[];
  is_admin?: boolean;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PipelinePhase {
  id: string;
  template_id: string;
  phase_name: string;
  phase_description: string | null;
  phase_order: number;
  estimated_days: number | null;
  auto_advance: boolean;
  required_approver_role: string | null;
  is_active: boolean;
}

export interface PhaseChecklistItem {
  id: string;
  phase_id: string;
  item_name: string;
  item_description: string | null;
  item_type: string;
  item_order: number;
  is_required: boolean;
  can_be_completed_by: string;
  requires_verification: boolean;
  verification_by: string | null;
  document_type?: string | null;
  external_link?: string | null;
  metadata?: Record<string, any> | null;
  is_active: boolean;
}

export interface RecruitPhaseProgress {
  id: string;
  user_id: string;
  phase_id: string;
  template_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecruitChecklistProgress {
  id: string;
  user_id: string;
  checklist_item_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';
  completed_at: string | null;
  completed_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  document_id?: string | null;
  metadata?: Record<string, any> | null;
}

// Type guards
export function isLicensedAgent(status: AgentStatus | null | undefined): boolean {
  return status === 'licensed';
}

export function requiresPipeline(status: AgentStatus | null | undefined): boolean {
  return status === 'unlicensed' || status === 'licensed';
}

export function shouldSkipPipeline(status: AgentStatus | null | undefined): boolean {
  return status === 'not_applicable';
}