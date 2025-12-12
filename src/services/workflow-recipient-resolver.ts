import {supabase} from '@/services/base/supabase';
import type {RecipientConfig, ResolvedRecipients, RecipientType, PhaseStatus} from '@/types/workflow-recipients.types';

const DEFAULT_MAX_RECIPIENTS = 50;

interface ResolverContext {
  triggeredBy?: string;
  triggeredByEmail?: string;
  recipientId?: string;
  recipientEmail?: string;
  policyId?: string;
  commissionId?: string;
  eventUserId?: string;
  [key: string]: unknown;
}

/**
 * Resolve recipients based on configuration and context
 * Used by workflow system to determine who receives emails/notifications
 */
export async function resolveRecipients(
  config: RecipientConfig,
  context: ResolverContext
): Promise<ResolvedRecipients> {
  const maxRecipients = config.maxRecipients || DEFAULT_MAX_RECIPIENTS;

  let result: ResolvedRecipients = emptyResult();

  try {
    switch (config.type) {
      // Hierarchy-based
      case 'direct_upline':
      case 'manager': // Legacy alias
        result = await resolveDirectUpline(context);
        break;
      case 'direct_downline':
        result = await resolveDirectDownline(context, maxRecipients);
        break;
      case 'entire_downline':
        result = await resolveEntireDownline(context, maxRecipients);
        break;
      case 'upline_chain':
        result = await resolveUplineChain(context, maxRecipients);
        break;

      // Role-based
      case 'role':
        result = await resolveByRoles(config.roles || [], maxRecipients);
        break;
      case 'all_agents':
        result = await resolveAllAgents(maxRecipients);
        break;
      case 'all_managers':
        result = await resolveAllManagers(maxRecipients);
        break;
      case 'all_trainers':
        result = await resolveAllTrainers(maxRecipients);
        break;
      case 'admins':
        result = await resolveAdmins(maxRecipients);
        break;

      // Event context
      case 'policy_agent':
        result = await resolvePolicyAgent(context);
        break;
      case 'policy_client':
        result = await resolvePolicyClient(context);
        break;
      case 'commission_recipient':
        result = await resolveCommissionRecipient(context);
        break;
      case 'eventuser':
        result = await resolveEventUser(context);
        break;

      // Pipeline
      case 'pipeline_phase':
        result = await resolvePipelinePhase(config.phaseIds || [], config.phaseStatuses, maxRecipients);
        break;
      case 'pipeline_recruiter':
        result = await resolvePipelineRecruiter(context);
        break;
      case 'pipeline_upline':
        result = await resolvePipelineUpline(context);
        break;

      // Custom
      case 'specific_email':
        result = resolveSpecificEmail(config.emails?.[0]);
        break;
      case 'email_list':
        result = resolveEmailList(config.emails || [], maxRecipients);
        break;
      case 'dynamic_field':
        result = resolveDynamicField(context, config.fieldPath);
        break;

      // Legacy backward compat
      case 'triggeruser':
      case 'currentuser':
        result = resolveTriggerUser(context);
        break;

      default:
        console.warn(`Unknown recipient type: ${config.type}`);
    }
  } catch (error) {
    console.error(`Error resolving recipients for type ${config.type}:`, error);
  }

  return result;
}

// === HIERARCHY RESOLVERS ===

async function resolveDirectUpline(context: ResolverContext): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('upline_id')
    .eq('id', userId)
    .single();

  if (!data?.upline_id) return emptyResult();

  const { data: upline } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', data.upline_id)
    .eq('is_deleted', false)
    .single();

  if (!upline?.email) return emptyResult();

  return {
    emails: [upline.email],
    userIds: [upline.id],
    count: 1,
    truncated: false
  };
}

async function resolveDirectDownline(context: ResolverContext, max: number): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('upline_id', userId)
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveEntireDownline(context: ResolverContext, max: number): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  // Use the database function for recursive downline
  const { data, error } = await supabase.rpc('get_downline_with_emails', {
    puser_id: userId,
    p_max_count: max + 1
  });

  if (error) {
    console.error('Error fetching downline:', error);
    // Fallback to direct downline only
    return resolveDirectDownline(context, max);
  }

  return formatResult(data || [], max);
}

async function resolveUplineChain(context: ResolverContext, max: number): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  // Use the database function for recursive upline
  const { data, error } = await supabase.rpc('get_upline_chain', {
    puser_id: userId,
    p_max_depth: Math.min(max, 10)
  });

  if (error) {
    console.error('Error fetching upline chain:', error);
    // Fallback to direct upline only
    return resolveDirectUpline(context);
  }

  return formatResult(data || [], max);
}

// === ROLE RESOLVERS ===

async function resolveByRoles(roles: string[], max: number): Promise<ResolvedRecipients> {
  if (roles.length === 0) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .overlaps('roles', roles)
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAllAgents(max: number): Promise<ResolvedRecipients> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('agent_status', 'licensed')
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAllManagers(max: number): Promise<ResolvedRecipients> {
  // Get users who have at least one person reporting to them
  // First get all unique upline_ids
  const { data: uplineIds } = await supabase
    .from('user_profiles')
    .select('upline_id')
    .not('upline_id', 'is', null)
    .eq('is_deleted', false);

  if (!uplineIds || uplineIds.length === 0) return emptyResult();

  const uniqueUplineIds = [...new Set(uplineIds.map(u => u.upline_id))];

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .in('id', uniqueUplineIds)
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAllTrainers(max: number): Promise<ResolvedRecipients> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .contains('roles', ['trainer'])
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

async function resolveAdmins(max: number): Promise<ResolvedRecipients> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('is_admin', true)
    .eq('is_deleted', false)
    .not('email', 'is', null)
    .limit(max + 1);

  return formatResult(data || [], max);
}

// === CONTEXT RESOLVERS ===

async function resolvePolicyAgent(context: ResolverContext): Promise<ResolvedRecipients> {
  if (!context.policyId) return emptyResult();

  const { data } = await supabase
    .from('policies')
    .select('user_id')
    .eq('id', context.policyId)
    .single();

  if (!data?.user_id) return emptyResult();

  const { data: agent } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', data.user_id)
    .single();

  if (!agent?.email) return emptyResult();

  return {
    emails: [agent.email],
    userIds: [agent.id],
    count: 1,
    truncated: false
  };
}

async function resolvePolicyClient(context: ResolverContext): Promise<ResolvedRecipients> {
  if (!context.policyId) return emptyResult();

  // Join policies -> clients to get email
  const { data } = await supabase
    .from('policies')
    .select('client_id')
    .eq('id', context.policyId)
    .single();

  if (!data?.client_id) return emptyResult();

  const { data: client } = await supabase
    .from('clients')
    .select('id, email')
    .eq('id', data.client_id)
    .single();

  if (!client?.email) return emptyResult();

  return {
    emails: [client.email],
    userIds: [], // Clients are not users
    count: 1,
    truncated: false
  };
}

async function resolveCommissionRecipient(context: ResolverContext): Promise<ResolvedRecipients> {
  // Commission recipient is the policy owner
  if (!context.commissionId) {
    // Fallback to policy agent if commission ID not available
    return resolvePolicyAgent(context);
  }

  const { data: commission } = await supabase
    .from('commissions')
    .select('policy_id')
    .eq('id', context.commissionId)
    .single();

  if (!commission?.policy_id) return emptyResult();

  // Get policy agent
  return resolvePolicyAgent({ ...context, policyId: commission.policy_id });
}

async function resolveEventUser(context: ResolverContext): Promise<ResolvedRecipients> {
  const userId = context.eventUserId || context.recipientId;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', userId)
    .eq('is_deleted', false)
    .single();

  if (!data?.email) return emptyResult();

  return {
    emails: [data.email],
    userIds: [data.id],
    count: 1,
    truncated: false
  };
}

// === PIPELINE RESOLVERS ===

async function resolvePipelinePhase(
  phaseIds: string[],
  statuses: PhaseStatus[] | undefined,
  max: number
): Promise<ResolvedRecipients> {
  if (phaseIds.length === 0) return emptyResult();

  let query = supabase
    .from('recruit_phase_progress')
    .select('user_id')
    .in('phase_id', phaseIds);

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  const { data: progress } = await query.limit(max + 1);

  if (!progress || progress.length === 0) return emptyResult();

  const userIds = [...new Set(progress.map(p => p.user_id))];

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, email')
    .in('id', userIds)
    .eq('is_deleted', false)
    .not('email', 'is', null);

  return formatResult(users || [], max);
}

async function resolvePipelineRecruiter(context: ResolverContext): Promise<ResolvedRecipients> {
  const userId = context.recipientId || context.triggeredBy;
  if (!userId) return emptyResult();

  const { data } = await supabase
    .from('user_profiles')
    .select('recruiter_id')
    .eq('id', userId)
    .single();

  if (!data?.recruiter_id) return emptyResult();

  const { data: recruiter } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('id', data.recruiter_id)
    .eq('is_deleted', false)
    .single();

  if (!recruiter?.email) return emptyResult();

  return {
    emails: [recruiter.email],
    userIds: [recruiter.id],
    count: 1,
    truncated: false
  };
}

async function resolvePipelineUpline(context: ResolverContext): Promise<ResolvedRecipients> {
  // Same as direct_upline for recruits
  return resolveDirectUpline(context);
}

// === CUSTOM RESOLVERS ===

function resolveSpecificEmail(email: string | undefined): ResolvedRecipients {
  if (!email || !isValidEmail(email)) return emptyResult();

  return {
    emails: [email],
    userIds: [],
    count: 1,
    truncated: false
  };
}

function resolveEmailList(emails: string[], max: number): ResolvedRecipients {
  const validEmails = emails.filter(isValidEmail).slice(0, max);

  return {
    emails: validEmails,
    userIds: [],
    count: validEmails.length,
    truncated: emails.length > max
  };
}

function resolveDynamicField(context: ResolverContext, fieldPath: string | undefined): ResolvedRecipients {
  if (!fieldPath) return emptyResult();

  // Navigate the field path to get the value
  const parts = fieldPath.split('.');
  let value: unknown = context;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return emptyResult();
    }
  }

  if (typeof value === 'string' && isValidEmail(value)) {
    return {
      emails: [value],
      userIds: [],
      count: 1,
      truncated: false
    };
  }

  return emptyResult();
}

function resolveTriggerUser(context: ResolverContext): ResolvedRecipients {
  const email = context.recipientEmail || context.triggeredByEmail;
  const id = context.recipientId || context.triggeredBy;

  if (!email) return emptyResult();

  return {
    emails: [email as string],
    userIds: id ? [id as string] : [],
    count: 1,
    truncated: false
  };
}

// === HELPERS ===

function emptyResult(): ResolvedRecipients {
  return { emails: [], userIds: [], count: 0, truncated: false };
}

function formatResult(
  data: Array<{ id: string; email: string }>,
  max: number
): ResolvedRecipients {
  const truncated = data.length > max;
  const limited = truncated ? data.slice(0, max) : data;

  return {
    emails: limited.map(d => d.email),
    userIds: limited.map(d => d.id),
    count: limited.length,
    truncated
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
