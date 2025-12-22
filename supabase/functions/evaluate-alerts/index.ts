// Edge Function: Evaluate Alert Rules
// Phase 10: Notifications & Alerts System
// Triggered by external cron to evaluate alert rules and create notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-client.ts';
import { addDays, differenceInDays, format, subMonths, startOfMonth, endOfMonth } from 'https://esm.sh/date-fns@3.3.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
type AlertMetric =
  | 'policy_lapse_warning'
  | 'target_miss_risk'
  | 'commission_threshold'
  | 'new_policy_count'
  | 'recruit_stall'
  | 'override_change'
  | 'team_production_drop'
  | 'persistency_warning'
  | 'license_expiration';

type AlertComparison = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

interface AlertRule {
  id: string;
  owner_id: string;
  imo_id: string | null;
  agency_id: string | null;
  metric: AlertMetric;
  comparison: AlertComparison;
  threshold_value: number;
  threshold_unit: string | null;
  applies_to_self: boolean;
  applies_to_downlines: boolean;
  applies_to_team: boolean;
  notify_in_app: boolean;
  notify_email: boolean;
  cooldown_hours: number;
  last_triggered_at: string | null;
}

interface EvaluationResult {
  ruleId: string;
  triggered: boolean;
  evaluations: number;
  notifications: number;
  error?: string;
}

interface AlertMatch {
  userId: string;
  currentValue: number;
  entityType?: string;
  entityId?: string;
  context: Record<string, unknown>;
}

// Compare values based on comparison operator
function compareValues(current: number, threshold: number, comparison: AlertComparison): boolean {
  switch (comparison) {
    case 'lt': return current < threshold;
    case 'lte': return current <= threshold;
    case 'gt': return current > threshold;
    case 'gte': return current >= threshold;
    case 'eq': return current === threshold;
    default: return false;
  }
}

// Get users to evaluate based on rule scope
async function getUsersToEvaluate(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule
): Promise<string[]> {
  const userIds: Set<string> = new Set();

  if (rule.applies_to_self) {
    userIds.add(rule.owner_id);
  }

  if (rule.applies_to_downlines) {
    // Get owner's downlines
    const { data: downlines } = await supabase
      .from('user_profiles')
      .select('id')
      .like('hierarchy_path', `%${rule.owner_id}%`)
      .neq('id', rule.owner_id);

    downlines?.forEach(d => userIds.add(d.id));
  }

  if (rule.applies_to_team) {
    // Get all users in the IMO/Agency
    let query = supabase.from('user_profiles').select('id');

    if (rule.imo_id) {
      query = query.eq('imo_id', rule.imo_id);
    } else if (rule.agency_id) {
      query = query.eq('agency_id', rule.agency_id);
    }

    const { data: teamMembers } = await query;
    teamMembers?.forEach(m => userIds.add(m.id));
  }

  return Array.from(userIds);
}

// Evaluate policy_lapse_warning metric
async function evaluatePolicyLapseWarning(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[]
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];
  const today = new Date();
  const warningDate = addDays(today, rule.threshold_value);

  for (const userId of userIds) {
    const { data: policies } = await supabase
      .from('policies')
      .select('id, policy_number, client_id, lapse_date')
      .eq('agent_id', userId)
      .eq('status', 'active')
      .not('lapse_date', 'is', null)
      .lte('lapse_date', format(warningDate, 'yyyy-MM-dd'))
      .gte('lapse_date', format(today, 'yyyy-MM-dd'));

    if (policies && policies.length > 0) {
      for (const policy of policies) {
        const daysUntilLapse = differenceInDays(new Date(policy.lapse_date!), today);
        if (compareValues(daysUntilLapse, rule.threshold_value, rule.comparison)) {
          matches.push({
            userId,
            currentValue: daysUntilLapse,
            entityType: 'policy',
            entityId: policy.id,
            context: {
              policyNumber: policy.policy_number,
              lapseDate: policy.lapse_date,
              daysUntilLapse,
            },
          });
        }
      }
    }
  }

  return matches;
}

// Evaluate license_expiration metric
async function evaluateLicenseExpiration(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[]
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];
  const today = new Date();
  const warningDate = addDays(today, rule.threshold_value);

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, license_expiration')
    .in('id', userIds)
    .not('license_expiration', 'is', null)
    .lte('license_expiration', format(warningDate, 'yyyy-MM-dd'))
    .gte('license_expiration', format(today, 'yyyy-MM-dd'));

  if (users) {
    for (const user of users) {
      const daysUntilExpiration = differenceInDays(new Date(user.license_expiration!), today);
      if (compareValues(daysUntilExpiration, rule.threshold_value, rule.comparison)) {
        matches.push({
          userId: user.id,
          currentValue: daysUntilExpiration,
          entityType: 'license',
          entityId: user.id,
          context: {
            userName: `${user.first_name} ${user.last_name}`.trim(),
            expirationDate: user.license_expiration,
            daysUntilExpiration,
          },
        });
      }
    }
  }

  return matches;
}

// Evaluate recruit_stall metric
async function evaluateRecruitStall(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[]
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];
  const today = new Date();

  // Find recruits whose recruiter is in userIds and who are stalled
  const { data: recruits } = await supabase
    .from('user_profiles')
    .select(`
      id, first_name, last_name, recruiter_id,
      current_onboarding_phase, onboarding_status,
      recruit_phase_progress!inner(phase_id, started_at)
    `)
    .in('recruiter_id', userIds)
    .in('onboarding_status', ['lead', 'active'])
    .not('current_onboarding_phase', 'is', null);

  if (recruits) {
    for (const recruit of recruits) {
      // Get the current phase progress
      const currentPhaseProgress = (recruit.recruit_phase_progress as unknown[])?.find(
        (p: { phase_id: string }) => p.phase_id === recruit.current_onboarding_phase
      ) as { started_at: string } | undefined;

      if (currentPhaseProgress?.started_at) {
        const daysInPhase = differenceInDays(today, new Date(currentPhaseProgress.started_at));

        if (compareValues(daysInPhase, rule.threshold_value, rule.comparison)) {
          matches.push({
            userId: recruit.recruiter_id!,
            currentValue: daysInPhase,
            entityType: 'recruit',
            entityId: recruit.id,
            context: {
              recruitName: `${recruit.first_name} ${recruit.last_name}`.trim(),
              phaseName: recruit.current_onboarding_phase,
              daysInPhase,
            },
          });
        }
      }
    }
  }

  return matches;
}

// Evaluate new_policy_count metric
async function evaluateNewPolicyCount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[]
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];
  const endDate = new Date();
  const startDate = startOfMonth(subMonths(endDate, 1));
  const endOfPeriod = endOfMonth(subMonths(endDate, 1));

  for (const userId of userIds) {
    const { count } = await supabase
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', userId)
      .gte('effective_date', format(startDate, 'yyyy-MM-dd'))
      .lte('effective_date', format(endOfPeriod, 'yyyy-MM-dd'));

    const policyCount = count ?? 0;

    if (compareValues(policyCount, rule.threshold_value, rule.comparison)) {
      matches.push({
        userId,
        currentValue: policyCount,
        entityType: 'production',
        context: {
          periodStart: format(startDate, 'MMM d, yyyy'),
          periodEnd: format(endOfPeriod, 'MMM d, yyyy'),
          policyCount,
        },
      });
    }
  }

  return matches;
}

// Evaluate commission_threshold metric
async function evaluateCommissionThreshold(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[]
): Promise<AlertMatch[]> {
  const matches: AlertMatch[] = [];
  const endDate = new Date();
  const startDate = startOfMonth(subMonths(endDate, 1));
  const endOfPeriod = endOfMonth(subMonths(endDate, 1));

  for (const userId of userIds) {
    const { data: commissions } = await supabase
      .from('commissions')
      .select('earned_amount')
      .eq('agent_id', userId)
      .gte('effective_date', format(startDate, 'yyyy-MM-dd'))
      .lte('effective_date', format(endOfPeriod, 'yyyy-MM-dd'));

    const totalCommission = commissions?.reduce((sum, c) => sum + (c.earned_amount ?? 0), 0) ?? 0;

    if (compareValues(totalCommission, rule.threshold_value, rule.comparison)) {
      matches.push({
        userId,
        currentValue: totalCommission,
        entityType: 'commission',
        context: {
          periodStart: format(startDate, 'MMM d, yyyy'),
          periodEnd: format(endOfPeriod, 'MMM d, yyyy'),
          totalCommission,
        },
      });
    }
  }

  return matches;
}

// Main evaluation dispatcher
async function evaluateMetric(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  userIds: string[]
): Promise<AlertMatch[]> {
  switch (rule.metric) {
    case 'policy_lapse_warning':
      return evaluatePolicyLapseWarning(supabase, rule, userIds);

    case 'license_expiration':
      return evaluateLicenseExpiration(supabase, rule, userIds);

    case 'recruit_stall':
      return evaluateRecruitStall(supabase, rule, userIds);

    case 'new_policy_count':
      return evaluateNewPolicyCount(supabase, rule, userIds);

    case 'commission_threshold':
      return evaluateCommissionThreshold(supabase, rule, userIds);

    // TODO: Implement remaining metrics
    case 'target_miss_risk':
    case 'override_change':
    case 'team_production_drop':
    case 'persistency_warning':
      console.log(`[EvaluateAlerts] Metric ${rule.metric} not yet implemented`);
      return [];

    default:
      console.log(`[EvaluateAlerts] Unknown metric: ${rule.metric}`);
      return [];
  }
}

// Create notification for alert match
async function createAlertNotification(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule,
  match: AlertMatch
): Promise<string | null> {
  // Generate notification title and message based on metric
  let title = '';
  let message = '';

  switch (rule.metric) {
    case 'policy_lapse_warning':
      title = 'Policy Lapse Warning';
      message = `Policy ${match.context.policyNumber} will lapse in ${match.currentValue} days`;
      break;

    case 'license_expiration':
      title = 'License Expiration Warning';
      message = `License expires in ${match.currentValue} days`;
      break;

    case 'recruit_stall':
      title = 'Recruit Stalled';
      message = `${match.context.recruitName} has been in ${match.context.phaseName} for ${match.currentValue} days`;
      break;

    case 'new_policy_count':
      title = 'Low Policy Production';
      message = `Only ${match.currentValue} new policies last month (threshold: ${rule.threshold_value})`;
      break;

    case 'commission_threshold':
      title = 'Commission Below Threshold';
      message = `Commission of $${match.currentValue.toLocaleString()} is below threshold of $${rule.threshold_value.toLocaleString()}`;
      break;

    default:
      title = 'Alert Triggered';
      message = `Alert rule "${rule.metric}" triggered with value ${match.currentValue}`;
  }

  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: match.userId,
        type: `alert_${rule.metric}`,
        title,
        message,
        metadata: {
          rule_id: rule.id,
          metric: rule.metric,
          current_value: match.currentValue,
          threshold_value: rule.threshold_value,
          comparison: rule.comparison,
          entity_type: match.entityType,
          entity_id: match.entityId,
          ...match.context,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[EvaluateAlerts] Failed to create notification:', error);
      return null;
    }

    return notification.id;
  } catch (err) {
    console.error('[EvaluateAlerts] Error creating notification:', err);
    return null;
  }
}

// Process a single alert rule
async function processRule(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rule: AlertRule
): Promise<EvaluationResult> {
  const result: EvaluationResult = {
    ruleId: rule.id,
    triggered: false,
    evaluations: 0,
    notifications: 0,
  };

  try {
    console.log(`[EvaluateAlerts] Processing rule: ${rule.id} (${rule.metric})`);

    // Get users to evaluate
    const userIds = await getUsersToEvaluate(supabase, rule);
    result.evaluations = userIds.length;

    if (userIds.length === 0) {
      console.log(`[EvaluateAlerts] No users to evaluate for rule ${rule.id}`);
      return result;
    }

    // Evaluate the metric
    const matches = await evaluateMetric(supabase, rule, userIds);

    if (matches.length === 0) {
      // Record non-trigger evaluation
      await supabase.rpc('record_alert_evaluation', {
        p_rule_id: rule.id,
        p_triggered: false,
        p_current_value: 0,
        p_evaluation_context: { evaluatedUsers: userIds.length },
      });
      return result;
    }

    result.triggered = true;

    // Create notifications for each match
    for (const match of matches) {
      if (rule.notify_in_app) {
        const notificationId = await createAlertNotification(supabase, rule, match);

        if (notificationId) {
          result.notifications++;

          // Record the evaluation
          await supabase.rpc('record_alert_evaluation', {
            p_rule_id: rule.id,
            p_triggered: true,
            p_current_value: match.currentValue,
            p_affected_user_id: match.userId,
            p_affected_entity_type: match.entityType,
            p_affected_entity_id: match.entityId,
            p_notification_id: notificationId,
            p_evaluation_context: match.context,
          });
        }
      }
    }

    console.log(`[EvaluateAlerts] Rule ${rule.id}: ${matches.length} matches, ${result.notifications} notifications`);

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    result.error = error;
    console.error(`[EvaluateAlerts] Error processing rule ${rule.id}:`, error);
  }

  return result;
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!authHeader?.includes('service_role') && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[EvaluateAlerts] Unauthorized request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Get due alert rules
    const { data: dueRules, error: fetchError } = await supabase.rpc('get_due_alert_rules');

    if (fetchError) {
      console.error('[EvaluateAlerts] Failed to fetch due rules:', fetchError);
      throw fetchError;
    }

    if (!dueRules || dueRules.length === 0) {
      console.log('[EvaluateAlerts] No rules due for evaluation');
      return new Response(
        JSON.stringify({ message: 'No rules due', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EvaluateAlerts] Processing ${dueRules.length} due rule(s)`);

    // Process each rule
    const results: EvaluationResult[] = [];
    for (const rule of dueRules) {
      const result = await processRule(supabase, rule as AlertRule);
      results.push(result);
    }

    const triggered = results.filter(r => r.triggered).length;
    const totalNotifications = results.reduce((sum, r) => sum + r.notifications, 0);
    const failed = results.filter(r => r.error).length;

    console.log(`[EvaluateAlerts] Completed: ${triggered} triggered, ${totalNotifications} notifications, ${failed} errors`);

    return new Response(
      JSON.stringify({
        message: 'Evaluation complete',
        processed: results.length,
        triggered,
        totalNotifications,
        failed,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[EvaluateAlerts] Error:', error);

    return new Response(
      JSON.stringify({ error }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
