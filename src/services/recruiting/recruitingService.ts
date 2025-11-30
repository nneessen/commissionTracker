// src/services/recruiting/recruitingService.ts
import { supabase } from '../base/supabase';
import type { UserProfile } from '@/types/hierarchy.types';
import type {
  OnboardingPhase,
  UserDocument,
  UserEmail,
  UserActivityLog,
  RecruitFilters,
  CreateRecruitInput,
  UpdateRecruitInput,
  UpdatePhaseInput,
} from '@/types/recruiting';
import type { SendEmailRequest } from '@/types/email.types';

export const recruitingService = {
  // ========================================
  // RECRUIT CRUD (now using user_profiles table)
  // ========================================

  async getRecruits(filters?: RecruitFilters, page = 1, limit = 50) {
    let query = supabase
      .from('user_profiles')
      .select(
        `
        *,
        recruiter:recruiter_id(id, email, first_name, last_name),
        upline:upline_id(id, email, first_name, last_name)
      `,
        { count: 'exact' }
      )
      // No filtering here - let the component filter by roles

    // Apply filters
    if (filters?.onboarding_status && filters.onboarding_status.length > 0) {
      query = query.in('onboarding_status', filters.onboarding_status);
    }
    if (filters?.current_phase && filters.current_phase.length > 0) {
      query = query.in('current_onboarding_phase', filters.current_phase);
    }
    if (filters?.recruiter_id) {
      query = query.eq('recruiter_id', filters.recruiter_id);
    }
    if (filters?.assigned_upline_id) {
      query = query.eq('upline_id', filters.assigned_upline_id);
    }
    if (filters?.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }
    if (filters?.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Sort by updated_at desc
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data as UserProfile[],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getRecruitById(id: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        `
        *,
        recruiter:recruiter_id(id, email, first_name, last_name),
        upline:upline_id(id, email, first_name, last_name)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  async createRecruit(recruit: CreateRecruitInput) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        ...recruit,
        roles: ['recruit'], // CRITICAL: Set recruit role
        onboarding_status: 'interview_1', // Default starting phase (not 'lead')
        current_onboarding_phase: 'initial_contact',
        onboarding_started_at: new Date().toISOString(),
        // Note: user_id can be NULL for leads without login
        user_id: null,
        // Required hierarchy fields (set defaults)
        hierarchy_path: '', // Will be updated by trigger
        hierarchy_depth: 0, // Will be updated by trigger
        approval_status: 'pending',
        is_admin: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  async updateRecruit(id: string, updates: UpdateRecruitInput) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  async deleteRecruit(id: string) {
    const { error } = await supabase.from('user_profiles').delete().eq('id', id);

    if (error) throw error;
  },

  // ========================================
  // ONBOARDING PHASES
  // ========================================

  async getRecruitPhases(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_phases')
      .select('*')
      .eq('user_id', userId)
      .order('phase_order', { ascending: true });

    if (error) throw error;
    return data as OnboardingPhase[];
  },

  async updatePhase(phaseId: string, updates: UpdatePhaseInput) {
    const { data, error } = await supabase
      .from('onboarding_phases')
      .update(updates)
      .eq('id', phaseId)
      .select()
      .single();

    if (error) throw error;
    return data as OnboardingPhase;
  },

  // ========================================
  // DOCUMENTS
  // ========================================

  async getRecruitDocuments(userId: string) {
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as UserDocument[];
  },

  async uploadDocument(
    userId: string,
    file: File,
    documentType: string,
    documentName: string,
    uploadedBy: string,
    required = false,
    expiresAt?: string
  ) {
    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${userId}/${documentType}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    // Create document record
    const { data, error } = await supabase
      .from('user_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        document_name: documentName,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        uploaded_by: uploadedBy,
        required,
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserDocument;
  },

  async downloadDocument(storagePath: string) {
    const { data, error } = await supabase.storage
      .from('user-documents')
      .download(storagePath);

    if (error) throw error;
    return data;
  },

  async getDocumentUrl(storagePath: string) {
    const { data } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    return data?.signedUrl || null;
  },

  async deleteDocument(id: string, storagePath: string) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('user-documents')
      .remove([storagePath]);

    if (storageError) throw storageError;

    // Delete record
    const { error } = await supabase.from('user_documents').delete().eq('id', id);

    if (error) throw error;
  },

  async updateDocumentStatus(
    id: string,
    status: 'pending' | 'received' | 'approved' | 'rejected' | 'expired',
    notes?: string
  ) {
    const { data, error } = await supabase
      .from('user_documents')
      .update({
        status,
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as UserDocument;
  },

  // ========================================
  // EMAILS
  // ========================================

  async getRecruitEmails(userId: string) {
    const { data, error } = await supabase
      .from('user_emails')
      .select(
        `
        *,
        attachments:user_email_attachments(*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserEmail[];
  },

  async sendEmail(emailRequest: SendEmailRequest) {
    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailRequest,
    });

    if (error) throw error;
    return data;
  },

  // ========================================
  // ACTIVITY LOG
  // ========================================

  async getRecruitActivityLog(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as UserActivityLog[];
  },

  // ========================================
  // OAUTH
  // ========================================

  getLinkedInOAuthUrl(userId: string) {
    const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-oauth`;
    const state = userId; // Pass userId as state
    const scope = 'r_liteprofile r_emailaddress';

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&state=${state}&scope=${scope}`;

    return authUrl;
  },

  getInstagramOAuthUrl(userId: string) {
    const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;
    const REDIRECT_URI = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-oauth`;
    const state = userId;
    const scope = 'user_profile,user_media';

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${scope}&response_type=code&state=${state}`;

    return authUrl;
  },

  // ========================================
  // STATS & ANALYTICS
  // ========================================

  async getRecruitingStats(recruiterId?: string) {
    // Query all user_profiles with recruit role
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: false })
      .contains('roles', ['recruit']); // Filter for users with recruit role

    if (recruiterId) {
      query = query.eq('recruiter_id', recruiterId);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    const recruits = data as UserProfile[];

    // Count active recruits (all phases except completed/dropped)
    const activePhases = ['interview_1', 'zoom_interview', 'pre_licensing', 'exam', 'npn_received', 'contracting', 'bootcamp'];
    const activeCount = recruits.filter((r) => r.onboarding_status && activePhases.includes(r.onboarding_status)).length;

    return {
      total: count || 0,
      active: activeCount,
      completed: recruits.filter((r) => r.onboarding_status === 'completed').length,
      dropped: recruits.filter((r) => r.onboarding_status === 'dropped').length,
      byPhase: recruits.reduce((acc, recruit) => {
        const status = recruit.onboarding_status || 'interview_1';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  // ========================================
  // SEARCH & FILTERS
  // ========================================

  async searchRecruits(searchTerm: string, limit = 10) {
    // Search recruits in any active phase (not completed/dropped)
    const activePhases = ['interview_1', 'zoom_interview', 'pre_licensing', 'exam', 'npn_received', 'contracting', 'bootcamp'];
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, profile_photo_url, onboarding_status')
      .in('onboarding_status', activePhases)
      .or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .limit(limit);

    if (error) throw error;
    return data as UserProfile[];
  },
};
