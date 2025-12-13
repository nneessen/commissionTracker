// src/services/recruiting/recruitingService.ts
import {supabase} from '../base/supabase';
import {workflowEventEmitter, WORKFLOW_EVENTS} from '../events/workflowEventEmitter';
import {createAuthUserWithProfile} from './authUserService';
import type {UserProfile} from '@/types/hierarchy.types';
import type {OnboardingPhase, UserDocument, UserEmail, UserActivityLog, RecruitFilters, UpdateRecruitInput, UpdatePhaseInput} from '@/types/recruiting.types';
import type {CreateRecruitInput} from '@/types/recruiting.types';
import type {SendEmailRequest} from '@/types/email.types';

export const recruitingService = {
  // ========================================
  // RECRUIT CRUD (now using user_profiles table)
  // ========================================

  async getRecruits(filters?: RecruitFilters, page = 1, limit = 50) {
    // FIXED: Only show users who are ACTUALLY recruits in the pipeline
    // Exclude active agents and admins even if they have onboarding_status
    let query = supabase
      .from('user_profiles')
      .select(
        `
        *,
        recruiter:recruiter_id(id, email, first_name, last_name),
        upline:upline_id(id, email, first_name, last_name),
        pipeline_template:pipeline_template_id(id, name, description)
      `,
        { count: 'exact' }
      )
      .neq('is_deleted', true);

    // Build the filter to get ONLY recruits
    // Include users with 'recruit' role OR onboarding_status
    // BUT exclude if they have 'active_agent', 'agent' (with high contract), or 'admin' roles
    const { data: initialData, error: initialError } = await supabase
      .from('user_profiles')
      .select('*')
      .or('roles.cs.{recruit},onboarding_status.not.is.null')
      .neq('is_deleted', true);

    if (initialError) throw initialError;

    // Filter out active agents and admins client-side for proper exclusion
    const recruitIds = (initialData || [])
      .filter(u => {
        const hasActiveAgentRole = u.roles?.includes('active_agent');
        const hasAdminRole = u.roles?.includes('admin');
        const isAdmin = u.is_admin === true;

        // Exclude if they're an active agent or admin
        if (hasActiveAgentRole || hasAdminRole || isAdmin) {
          return false;
        }

        // Include if they have recruit role OR onboarding_status
        return u.roles?.includes('recruit') || u.onboarding_status !== null;
      })
      .map(u => u.id);

    // Now build the main query with just the recruit IDs
    if (recruitIds.length === 0) {
      // No recruits found, return empty result
      return {
        data: [],
        count: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    query = supabase
      .from('user_profiles')
      .select(
        `
        *,
        recruiter:recruiter_id(id, email, first_name, last_name),
        upline:upline_id(id, email, first_name, last_name),
        pipeline_template:pipeline_template_id(id, name, description)
      `,
        { count: 'exact' }
      )
      .in('id', recruitIds);

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
    // Extract skip_pipeline and other non-database fields
    const { skip_pipeline, ...dbFields } = recruit;

    // Determine role based on agent status and skip_pipeline flag
    let roles: string[] = ['recruit']; // Default
    let pipelineTemplateId: string | null = null;

    if (skip_pipeline || recruit.agent_status === 'not_applicable') {
      // Admin or non-agent roles - no pipeline
      roles = recruit.roles || ['view_only'];
      pipelineTemplateId = null;
    } else if (recruit.agent_status === 'licensed') {
      // Licensed agent - gets agent role and fast-track pipeline
      roles = ['agent'];

      // Get the fast-track template
      const { data: template } = await supabase
        .from('pipeline_templates')
        .select('id')
        .eq('name', 'Licensed Agent Fast-Track')
        .eq('is_active', true)
        .single();

      pipelineTemplateId = template?.id || null;
    } else {
      // Unlicensed recruit - gets standard pipeline
      roles = ['recruit'];

      // Get the standard template
      const { data: template } = await supabase
        .from('pipeline_templates')
        .select('id')
        .eq('name', 'Standard Recruiting Pipeline')
        .eq('is_active', true)
        .single();

      pipelineTemplateId = template?.id || null;
    }

    // CRITICAL FIX: Create auth user FIRST, which triggers profile creation
    const fullName = `${recruit.first_name} ${recruit.last_name}`;
    let authUserId: string | null = null;
    let newRecruit: UserProfile;

    try {
      // Create auth user - this will trigger automatic user_profile creation
      const authUser = await createAuthUserWithProfile({
        email: recruit.email,
        fullName,
        roles,
        isAdmin: recruit.is_admin || false,
        skipPipeline: skip_pipeline || false
      });

      authUserId = authUser.id;

      // Update the auto-created profile with recruit-specific data
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...dbFields,
          roles,
          agent_status: recruit.agent_status || 'unlicensed',
          pipeline_template_id: pipelineTemplateId,
          licensing_info: recruit.licensing_info || {},
          onboarding_status: skip_pipeline ? null : 'interview_1',
          current_onboarding_phase: skip_pipeline ? null : 'initial_contact',
          onboarding_started_at: skip_pipeline ? null : new Date().toISOString(),
          user_id: authUserId,
          // Required hierarchy fields (set defaults)
          hierarchy_path: '', // Will be updated by trigger
          hierarchy_depth: 0, // Will be updated by trigger
          approval_status: 'pending',
          is_admin: recruit.is_admin || false,
        })
        .eq('id', authUserId)
        .select()
        .single();

      if (error) throw error;
      newRecruit = data as UserProfile;

    } catch (authError) {
      // Fallback: Create profile without auth user (for leads/prospects)
      console.warn('Auth user creation failed, creating profile-only recruit:', authError);

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          ...dbFields,
          roles,
          agent_status: recruit.agent_status || 'unlicensed',
          pipeline_template_id: pipelineTemplateId,
          licensing_info: recruit.licensing_info || {},
          onboarding_status: skip_pipeline ? null : 'interview_1',
          current_onboarding_phase: skip_pipeline ? null : 'initial_contact',
          onboarding_started_at: skip_pipeline ? null : new Date().toISOString(),
          user_id: null, // No auth user
          // Required hierarchy fields (set defaults)
          hierarchy_path: '',
          hierarchy_depth: 0,
          approval_status: 'pending',
          is_admin: recruit.is_admin || false,
        })
        .select()
        .single();

      if (error) throw error;
      newRecruit = data as UserProfile;
    }

    // Emit recruit created event
    await workflowEventEmitter.emit(WORKFLOW_EVENTS.RECRUIT_CREATED, {
      recruitId: newRecruit.id,
      userId: newRecruit.user_id || undefined,
      userEmail: newRecruit.email,
      recruitName: `${newRecruit.first_name} ${newRecruit.last_name}`,
      recruiterId: newRecruit.recruiter_id || undefined,
      uplineId: newRecruit.upline_id || undefined,
      agentStatus: newRecruit.agent_status,
      onboardingStatus: newRecruit.onboarding_status,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });

    return newRecruit;
  },

  async updateRecruit(id: string, updates: UpdateRecruitInput) {
    // Get current recruit data to check for status changes
    const { data: currentRecruit } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    // Update the recruit
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updatedRecruit = data as UserProfile;

    // Check for status changes and emit events
    if (currentRecruit && updates.onboarding_status) {
      const oldStatus = currentRecruit.onboarding_status;
      const newStatus = updates.onboarding_status;

      // Emit phase changed event for any status change
      if (oldStatus !== newStatus) {
        await workflowEventEmitter.emit(WORKFLOW_EVENTS.RECRUIT_PHASE_CHANGED, {
          recruitId: id,
          userId: updatedRecruit.user_id || undefined,
          userEmail: updatedRecruit.email,
          recruitName: `${updatedRecruit.first_name} ${updatedRecruit.last_name}`,
          oldPhase: oldStatus,
          newPhase: newStatus,
          recruiterId: updatedRecruit.recruiter_id || undefined,
          uplineId: updatedRecruit.upline_id || undefined,
          timestamp: new Date().toISOString()
        });

        // Check for graduation (completed status)
        if (newStatus === 'completed') {
          await workflowEventEmitter.emit(WORKFLOW_EVENTS.RECRUIT_GRADUATED_TO_AGENT, {
            recruitId: id,
            userId: updatedRecruit.user_id || undefined,
            userEmail: updatedRecruit.email,
            recruitName: `${updatedRecruit.first_name} ${updatedRecruit.last_name}`,
            graduatedAt: new Date().toISOString(),
            recruiterId: updatedRecruit.recruiter_id || undefined,
            uplineId: updatedRecruit.upline_id || undefined,
            agentStatus: updatedRecruit.agent_status,
            licensingInfo: updatedRecruit.licensing_info,
            timestamp: new Date().toISOString()
          });
        }

        // Check for dropout
        if (newStatus === 'dropped') {
          await workflowEventEmitter.emit(WORKFLOW_EVENTS.RECRUIT_DROPPED_OUT, {
            recruitId: id,
            userId: updatedRecruit.user_id || undefined,
            userEmail: updatedRecruit.email,
            recruitName: `${updatedRecruit.first_name} ${updatedRecruit.last_name}`,
            droppedAt: new Date().toISOString(),
            lastPhase: oldStatus,
            recruiterId: updatedRecruit.recruiter_id || undefined,
            uplineId: updatedRecruit.upline_id || undefined,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return updatedRecruit;
  },

  // Hard delete recruit - permanently removes user and all related data
  async deleteRecruit(id: string) {
    const { data, error } = await supabase.rpc('admin_deleteuser', {
      target_user_id: id
    });

    if (error) {
      throw new Error(`Failed to delete recruit: ${error.message}`);
    }

    // Check if the RPC returned an error
    if (data && typeof data === 'object' && data.success === false) {
      throw new Error(data.error || 'Failed to delete recruit');
    }
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

    const { error: uploadError } = await supabase.storage
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
    // FIXED: Only count users who are ACTUALLY recruits
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: false })
      .or('roles.cs.{recruit},onboarding_status.not.is.null')
      .neq('is_deleted', true);

    if (recruiterId) {
      query = query.eq('recruiter_id', recruiterId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter out active agents and admins
    const recruits = (data as UserProfile[] || []).filter(u => {
      const hasActiveAgentRole = u.roles?.includes('active_agent');
      const hasAdminRole = u.roles?.includes('admin');
      const isAdmin = u.is_admin === true;

      // Exclude if they're an active agent or admin
      if (hasActiveAgentRole || hasAdminRole || isAdmin) {
        return false;
      }

      // Include if they have recruit role OR onboarding_status
      return u.roles?.includes('recruit') || u.onboarding_status !== null;
    });

    // Count active recruits (all phases except completed/dropped)
    const activePhases = ['interview_1', 'zoom_interview', 'pre_licensing', 'exam', 'npn_received', 'contracting', 'bootcamp'];
    const activeCount = recruits.filter((r) => r.onboarding_status && activePhases.includes(r.onboarding_status)).length;

    return {
      total: recruits.length,
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
    // FIXED: Only search users who are ACTUALLY recruits
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, profile_photo_url, onboarding_status, agent_status, roles, is_admin')
      .or('roles.cs.{recruit},onboarding_status.not.is.null')
      .neq('is_deleted', true)
      .or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .limit(limit * 2); // Get more results to filter

    if (error) throw error;

    // Filter out active agents and admins
    const recruits = (data || []).filter(u => {
      const hasActiveAgentRole = u.roles?.includes('active_agent');
      const hasAdminRole = u.roles?.includes('admin');
      const isAdmin = u.is_admin === true;

      // Exclude if they're an active agent or admin
      if (hasActiveAgentRole || hasAdminRole || isAdmin) {
        return false;
      }

      // Include if they have recruit role OR onboarding_status
      return u.roles?.includes('recruit') || u.onboarding_status !== null;
    }).slice(0, limit); // Limit after filtering

    return recruits as Partial<UserProfile>[];
  },
};
