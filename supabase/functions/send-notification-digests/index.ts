// Edge Function: Send Notification Digests
// Phase 10: Notifications & Alerts System
// Triggered by external cron to send email digests of unread notifications
//
// SECURITY: Phase 10 hardening applied:
// - Proper timezone handling using user preferences
// - No cross-org data leakage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseAdminClient } from '../_shared/supabase-client.ts';
import { format } from 'https://esm.sh/date-fns@3.3.1';
import { formatInTimeZone, toZonedTime } from 'https://esm.sh/date-fns-tz@3.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface UserWithDigestPrefs {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_digest_frequency: string;
  email_digest_time: string;
  email_digest_timezone: string;
  last_digest_sent_at: string | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface ProcessResult {
  userId: string;
  email: string;
  success: boolean;
  notificationCount: number;
  error?: string;
}

// Validate timezone string
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Get current time in user's timezone
function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number } {
  const validTz = isValidTimezone(timezone) ? timezone : 'America/New_York';

  try {
    const now = new Date();
    const zonedTime = toZonedTime(now, validTz);
    return {
      hour: zonedTime.getHours(),
      minute: zonedTime.getMinutes(),
    };
  } catch {
    // Fallback to UTC if timezone conversion fails
    const now = new Date();
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
    };
  }
}

// Check if user is due for digest based on their preferences (with timezone)
function isDigestDue(
  prefs: UserWithDigestPrefs,
  currentTimeUtc: Date
): boolean {
  const {
    email_digest_frequency,
    email_digest_time,
    email_digest_timezone,
    last_digest_sent_at,
  } = prefs;

  // Parse preferred time (HH:MM:SS format)
  const [prefHour, prefMinute] = email_digest_time.split(':').map(Number);

  // Get current time in user's timezone
  const userCurrentTime = getCurrentTimeInTimezone(email_digest_timezone);

  // Check if within 15-minute window of preferred time (cron runs every 15 min)
  const prefTotalMinutes = prefHour * 60 + prefMinute;
  const currentTotalMinutes = userCurrentTime.hour * 60 + userCurrentTime.minute;
  const timeDiff = Math.abs(currentTotalMinutes - prefTotalMinutes);

  // Handle midnight wraparound (e.g., pref=23:55, current=00:05)
  const wrappedDiff = Math.min(timeDiff, 1440 - timeDiff); // 1440 = 24*60

  if (wrappedDiff > 15) {
    return false;
  }

  // Check frequency
  if (last_digest_sent_at) {
    const lastSent = new Date(last_digest_sent_at);
    const hoursSinceLastDigest = (currentTimeUtc.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

    if (email_digest_frequency === 'daily' && hoursSinceLastDigest < 20) {
      return false; // Less than ~20 hours since last daily digest
    }
    if (email_digest_frequency === 'weekly' && hoursSinceLastDigest < 144) {
      return false; // Less than 6 days since last weekly digest
    }
  }

  return true;
}

// Get notification icon based on type
function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    recruit_graduated: '🎓',
    document_approved: '✅',
    document_rejected: '❌',
    document_uploaded: '📄',
    new_message: '💬',
    phase_completed: '🏆',
    phase_advanced: '⬆️',
    checklist_item_completed: '☑️',
    email_received: '📧',
    alert_policy_lapse_warning: '⚠️',
    alert_target_miss_risk: '📉',
    alert_commission_threshold: '💰',
    alert_recruit_stall: '⏳',
    alert_license_expiration: '📋',
    alert_new_policy_count: '📊',
    alert_persistency_warning: '📉',
  };
  return icons[type] || '🔔';
}

// Format notifications as HTML email
function formatDigestEmail(
  userName: string,
  notifications: Notification[],
  frequency: string,
  timezone: string
): string {
  const periodLabel = frequency === 'daily' ? 'Daily' : 'Weekly';
  const validTz = isValidTimezone(timezone) ? timezone : 'America/New_York';

  const notificationRows = notifications.map(n => {
    const icon = getNotificationIcon(n.type);
    // Format time in user's timezone
    let time: string;
    try {
      time = formatInTimeZone(new Date(n.created_at), validTz, 'MMM d, h:mm a');
    } catch {
      time = format(new Date(n.created_at), 'MMM d, h:mm a');
    }
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center;">
            <span style="font-size: 20px; margin-right: 12px;">${icon}</span>
            <div>
              <div style="font-weight: 500; color: #1a202c;">${escapeHtml(n.title)}</div>
              ${n.message ? `<div style="font-size: 13px; color: #666; margin-top: 4px;">${escapeHtml(n.message)}</div>` : ''}
              <div style="font-size: 12px; color: #999; margin-top: 4px;">${time}</div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${periodLabel} Notification Digest</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px;">
          <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">
            🔔 ${periodLabel} Notification Digest
          </h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">
            Hi ${escapeHtml(userName)}, here's what you missed
          </p>
        </div>

        <!-- Stats -->
        <div style="background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-size: 14px; color: #666;">
            <strong style="color: #1e3a5f; font-size: 18px;">${notifications.length}</strong>
            notification${notifications.length !== 1 ? 's' : ''} since your last digest
          </span>
        </div>

        <!-- Notifications -->
        <table style="width: 100%; border-collapse: collapse;">
          ${notificationRows}
        </table>

        <!-- CTA -->
        <div style="padding: 20px; text-align: center;">
          <a href="https://app.thestandardhq.com/notifications"
             style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 500;">
            View All Notifications
          </a>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #666; font-size: 12px;">
            This is your ${periodLabel.toLowerCase()} notification digest from The Standard HQ.
          </p>
          <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">
            To change your digest preferences, visit Settings > Notifications in your dashboard.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// HTML escape to prevent XSS in email content
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Send email via Resend
async function sendDigestEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    console.log('[NotificationDigests] Resend not configured, simulating send');
    return { success: true, messageId: `simulated-${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Standard HQ <notifications@thestandardhq.com>',
        to: [to],
        subject,
        html,
        tags: [
          { name: 'type', value: 'notification-digest' },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[NotificationDigests] Resend error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true, messageId: data.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[NotificationDigests] Email send error:', error);
    return { success: false, error };
  }
}

// Process digest for a single user
async function processUserDigest(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  user: UserWithDigestPrefs
): Promise<ProcessResult> {
  const result: ProcessResult = {
    userId: user.user_id,
    email: user.email,
    success: false,
    notificationCount: 0,
  };

  try {
    // Get unread notifications since last digest
    let query = supabase
      .from('notifications')
      .select('id, type, title, message, created_at, metadata')
      .eq('user_id', user.user_id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (user.last_digest_sent_at) {
      query = query.gt('created_at', user.last_digest_sent_at);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      console.log(`[NotificationDigests] No new notifications for ${user.email}`);
      result.success = true;
      return result;
    }

    result.notificationCount = notifications.length;
    const userName = user.first_name || user.email.split('@')[0];

    // Format and send email with proper timezone
    const subject = `${user.email_digest_frequency === 'daily' ? 'Daily' : 'Weekly'} Digest: ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`;
    const html = formatDigestEmail(
      userName,
      notifications as Notification[],
      user.email_digest_frequency,
      user.email_digest_timezone
    );

    const emailResult = await sendDigestEmail(user.email, subject, html);

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email');
    }

    // Log the digest delivery
    await supabase.from('notification_digest_log').insert({
      user_id: user.user_id,
      notification_count: notifications.length,
      notification_ids: notifications.map(n => n.id),
      email_sent_to: user.email,
      email_message_id: emailResult.messageId,
      status: 'sent',
    });

    // Update last_digest_sent_at
    await supabase
      .from('notification_preferences')
      .update({ last_digest_sent_at: new Date().toISOString() })
      .eq('user_id', user.user_id);

    result.success = true;
    console.log(`[NotificationDigests] Sent digest to ${user.email} with ${notifications.length} notifications`);

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    result.error = error;
    console.error(`[NotificationDigests] Failed for ${user.email}:`, error);

    // Log failed attempt
    try {
      await supabase.from('notification_digest_log').insert({
        user_id: user.user_id,
        notification_count: 0,
        notification_ids: [],
        email_sent_to: user.email,
        status: 'failed',
        error_message: error,
      });
    } catch {
      // Ignore logging errors
    }
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
      console.log('[NotificationDigests] Unauthorized request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseAdminClient();
    const currentTime = new Date();

    // Get users with email digest enabled
    const { data: usersWithDigest, error: fetchError } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        email_digest_frequency,
        email_digest_time,
        email_digest_timezone,
        last_digest_sent_at
      `)
      .eq('email_digest_enabled', true);

    if (fetchError) {
      console.error('[NotificationDigests] Failed to fetch users:', fetchError);
      throw fetchError;
    }

    if (!usersWithDigest || usersWithDigest.length === 0) {
      console.log('[NotificationDigests] No users with digest enabled');
      return new Response(
        JSON.stringify({ message: 'No users with digest enabled', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details for each
    const userIds = usersWithDigest.map(u => u.user_id);
    const { data: userProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    if (profileError) {
      throw new Error(`Failed to fetch user profiles: ${profileError.message}`);
    }

    // Combine preferences with user info
    const usersToProcess: UserWithDigestPrefs[] = usersWithDigest
      .map(prefs => {
        const profile = userProfiles?.find(p => p.id === prefs.user_id);
        if (!profile) return null;

        return {
          user_id: prefs.user_id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email_digest_frequency: prefs.email_digest_frequency,
          email_digest_time: prefs.email_digest_time,
          email_digest_timezone: prefs.email_digest_timezone || 'America/New_York',
          last_digest_sent_at: prefs.last_digest_sent_at,
        };
      })
      .filter((u): u is UserWithDigestPrefs => u !== null)
      .filter(u => isDigestDue(u, currentTime));

    if (usersToProcess.length === 0) {
      console.log('[NotificationDigests] No users due for digest');
      return new Response(
        JSON.stringify({ message: 'No users due for digest', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[NotificationDigests] Processing ${usersToProcess.length} user(s)`);

    // Process each user
    const results: ProcessResult[] = [];
    for (const user of usersToProcess) {
      const result = await processUserDigest(supabase, user);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalNotifications = results.reduce((sum, r) => sum + r.notificationCount, 0);

    console.log(`[NotificationDigests] Completed: ${successful} successful, ${failed} failed, ${totalNotifications} total notifications`);

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        processed: results.length,
        successful,
        failed,
        totalNotifications,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[NotificationDigests] Error:', error);

    return new Response(
      JSON.stringify({ error }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
