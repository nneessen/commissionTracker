// Process Workflow Edge Function
// Executes workflow actions sequentially with delays and error handling
// Uses user's connected Gmail for sending emails (NOT Resend)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-client.ts'
import { decrypt } from '../_shared/encryption.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkflowAction {
  type: string
  order: number
  config: Record<string, unknown>
  delayMinutes?: number
}

interface ProcessWorkflowRequest {
  runId: string
  workflowId: string
  isTest?: boolean
}

interface ActionResult {
  actionId: string
  actionType: string
  status: 'success' | 'failed' | 'skipped'
  result?: unknown
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const startTime = Date.now()
  const adminSupabase = createSupabaseAdminClient()

  try {
    const body: ProcessWorkflowRequest = await req.json()
    const { runId, workflowId, isTest } = body

    if (!runId || !workflowId) {
      return new Response(JSON.stringify({ error: 'Missing runId or workflowId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing workflow ${workflowId}, run ${runId}, isTest: ${isTest}`)

    // Get workflow details
    const { data: workflow, error: workflowError } = await adminSupabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    // Get workflow run context
    const { data: run, error: runError } = await adminSupabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      throw new Error(`Workflow run not found: ${runId}`)
    }

    // Parse actions from workflow
    const actions: WorkflowAction[] = workflow.actions || []
    const actionsExecuted: ActionResult[] = []
    let emailsSent = 0
    let actionsCompleted = 0
    let actionsFailed = 0

    // Execute actions sequentially
    for (const action of actions.sort((a, b) => a.order - b.order)) {
      // Handle delay before action
      if (action.delayMinutes && action.delayMinutes > 0 && !isTest) {
        console.log(`Waiting ${action.delayMinutes} minutes before action ${action.order}`)
        // For actual delays, we would need a different approach (like scheduling)
        // For now, we skip delays in the direct execution
      }

      try {
        const result = await executeAction(action, run.context, workflow, isTest, adminSupabase)
        actionsExecuted.push({
          actionId: `action-${action.order}`,
          actionType: action.type,
          status: 'success',
          result,
        })
        actionsCompleted++

        if (action.type === 'send_email') {
          emailsSent++
        }
      } catch (actionError) {
        const errorMessage = actionError instanceof Error ? actionError.message : 'Unknown error'
        console.error(`Action ${action.order} failed:`, errorMessage)

        actionsExecuted.push({
          actionId: `action-${action.order}`,
          actionType: action.type,
          status: 'failed',
          error: errorMessage,
        })
        actionsFailed++

        // Continue with other actions unless it's a critical failure
      }
    }

    // Update workflow run with results
    const durationMs = Date.now() - startTime
    await adminSupabase
      .from('workflow_runs')
      .update({
        status: actionsFailed > 0 ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        actions_executed: actionsExecuted,
        emails_sent: emailsSent,
        actions_completed: actionsCompleted,
        actions_failed: actionsFailed,
      })
      .eq('id', runId)

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        actionsExecuted: actionsExecuted.length,
        actionsCompleted,
        actionsFailed,
        durationMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Process workflow error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    // Try to update the run as failed
    try {
      const body: ProcessWorkflowRequest = await req.clone().json()
      if (body.runId) {
        await adminSupabase
          .from('workflow_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            error_message: errorMessage,
          })
          .eq('id', body.runId)
      }
    } catch {
      // Ignore update errors
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Execute a single workflow action
 */
async function executeAction(
  action: WorkflowAction,
  context: Record<string, unknown>,
  workflow: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<unknown> {
  console.log(`Executing action: ${action.type}`, action.config)

  switch (action.type) {
    case 'send_email':
      return await executeSendEmail(action, context, isTest, supabase)

    case 'create_notification':
      return await executeCreateNotification(action, context, isTest, supabase)

    case 'wait':
      // For immediate execution, we just log the wait
      // Real delays would need a scheduling system
      console.log(`Wait action: ${action.config.waitMinutes || 0} minutes`)
      return { waited: action.config.waitMinutes || 0 }

    case 'webhook':
      return await executeWebhook(action, context, isTest)

    case 'update_field':
      return await executeUpdateField(action, context, isTest, supabase)

    default:
      console.log(`Unknown action type: ${action.type}`)
      return { skipped: true, reason: `Unknown action type: ${action.type}` }
  }
}

/**
 * Send email action - uses user's connected Gmail (NOT Resend)
 */
async function executeSendEmail(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<unknown> {
  const templateId = action.config.templateId as string
  if (!templateId) {
    throw new Error('No template ID specified for send_email action')
  }

  // Get the workflow owner's user ID to use their Gmail
  const workflowOwnerId = context.triggeredBy as string
  if (!workflowOwnerId) {
    throw new Error('No workflow owner ID in context - cannot send email without user')
  }

  // Get workflow owner's profile
  const { data: ownerProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('user_id', workflowOwnerId)
    .single()

  if (profileError || !ownerProfile) {
    throw new Error('Workflow owner profile not found')
  }

  // Get user's Gmail OAuth token
  const { data: oauthToken, error: tokenError } = await supabase
    .from('user_email_oauth_tokens')
    .select('*')
    .eq('user_id', ownerProfile.id)
    .eq('provider', 'gmail')
    .eq('is_active', true)
    .single()

  if (tokenError || !oauthToken) {
    throw new Error('Gmail not connected. The workflow owner must connect their Gmail account in Settings > Email.')
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError || !template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  // Determine recipients based on action configuration
  let recipientEmails: string[] = []
  let recipientIds: string[] = []
  const recipientType = action.config.recipientType as string || 'trigger_user'

  switch (recipientType) {
    case 'trigger_user':
      if (context.recipientEmail) {
        recipientEmails = [context.recipientEmail as string]
        recipientIds = [context.recipientId as string || '']
      }
      break

    case 'specific_email':
      if (action.config.recipientEmail) {
        recipientEmails = [action.config.recipientEmail as string]
        const { data: user } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', action.config.recipientEmail)
          .single()
        if (user) recipientIds = [user.id]
      }
      break

    case 'current_user':
      if (context.triggeredByEmail) {
        recipientEmails = [context.triggeredByEmail as string]
        recipientIds = [context.triggeredBy as string || '']
      }
      break

    case 'manager':
      if (context.recipientId) {
        const { data: hierarchy } = await supabase
          .from('user_hierarchy')
          .select('parent_user_id')
          .eq('user_id', context.recipientId)
          .single()

        if (hierarchy?.parent_user_id) {
          const { data: manager } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('id', hierarchy.parent_user_id)
            .single()

          if (manager) {
            recipientEmails = [manager.email]
            recipientIds = [hierarchy.parent_user_id]
          }
        }
      }
      break

    case 'all_trainers':
      const { data: trainers } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('role', 'trainer')

      if (trainers) {
        recipientEmails = trainers.map(t => t.email)
        recipientIds = trainers.map(t => t.id)
      }
      break

    case 'all_agents':
      const { data: agents } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('role', 'agent')
        .eq('is_active', true)

      if (agents) {
        recipientEmails = agents.map(a => a.email)
        recipientIds = agents.map(a => a.id)
      }
      break
  }

  if (recipientEmails.length === 0) {
    throw new Error(`No recipients found for type: ${recipientType}`)
  }

  if (isTest) {
    return {
      action: 'send_email',
      template: template.name,
      subject: template.subject,
      recipientType,
      wouldSendTo: recipientEmails,
      senderGmail: oauthToken.email_address,
      isTest: true,
    }
  }

  // Decrypt access token
  let accessToken: string
  try {
    accessToken = await decrypt(oauthToken.access_token_encrypted)
  } catch (decryptError) {
    console.error('Token decryption failed:', decryptError)
    throw new Error('Failed to decrypt Gmail OAuth token')
  }

  // Check if token is expired and refresh if needed
  if (oauthToken.token_expiry && new Date(oauthToken.token_expiry) < new Date()) {
    console.log('Token expired, attempting refresh...')
    try {
      accessToken = await refreshGmailToken(oauthToken, supabase, ownerProfile.id)
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError)
      throw new Error('Gmail token expired. The workflow owner needs to reconnect their Gmail account.')
    }
  }

  // Send email via Gmail API
  const sentEmails: string[] = []
  const failedEmails: string[] = []

  for (const recipientEmail of recipientEmails) {
    try {
      const rawMessage = buildRawEmail({
        from: oauthToken.email_address,
        to: [recipientEmail],
        subject: template.subject,
        bodyHtml: template.body_html,
        bodyText: template.body_text,
      })

      await sendViaGmail(accessToken, rawMessage)
      sentEmails.push(recipientEmail)

      // Record in user_emails table
      await supabase.from('user_emails').insert({
        user_id: ownerProfile.id,
        sender_id: ownerProfile.id,
        subject: template.subject,
        body_html: template.body_html,
        body_text: template.body_text,
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider: 'gmail',
        is_incoming: false,
        from_address: oauthToken.email_address,
        to_addresses: [recipientEmail],
      })
    } catch (sendError) {
      console.error(`Failed to send to ${recipientEmail}:`, sendError)
      failedEmails.push(recipientEmail)
    }
  }

  // Update last_used_at on OAuth token
  await supabase
    .from('user_email_oauth_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', oauthToken.id)

  if (sentEmails.length === 0) {
    throw new Error(`Failed to send to all recipients: ${failedEmails.join(', ')}`)
  }

  return {
    sent: true,
    templateId,
    sentCount: sentEmails.length,
    failedCount: failedEmails.length,
    sentTo: sentEmails,
    failedTo: failedEmails.length > 0 ? failedEmails : undefined,
    senderGmail: oauthToken.email_address
  }
}

/**
 * Build RFC 2822 compliant email message
 */
function buildRawEmail(params: {
  from: string
  to: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
}): string {
  const boundary = `boundary_${Date.now()}`

  let message = ''

  // Headers
  message += `From: ${params.from}\r\n`
  message += `To: ${params.to.join(', ')}\r\n`
  message += `Subject: ${params.subject}\r\n`
  message += `MIME-Version: 1.0\r\n`

  // Body part
  const altBoundary = `alt_${Date.now()}`
  message += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n`
  message += `\r\n`

  // Plain text version
  if (params.bodyText) {
    message += `--${altBoundary}\r\n`
    message += `Content-Type: text/plain; charset="UTF-8"\r\n`
    message += `\r\n`
    message += `${params.bodyText}\r\n`
  }

  // HTML version
  message += `--${altBoundary}\r\n`
  message += `Content-Type: text/html; charset="UTF-8"\r\n`
  message += `\r\n`
  message += `${params.bodyHtml}\r\n`
  message += `--${altBoundary}--\r\n`

  return message
}

/**
 * Send email via Gmail API
 */
async function sendViaGmail(
  accessToken: string,
  rawMessage: string,
  threadId?: string
): Promise<{ id: string; threadId: string }> {
  const encoder = new TextEncoder()
  const data = encoder.encode(rawMessage)
  const base64Message = base64Encode(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const requestBody: Record<string, string> = { raw: base64Message }
  if (threadId) {
    requestBody.threadId = threadId
  }

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gmail API error:', errorText)
    throw new Error(`Gmail API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Refresh Gmail OAuth token
 */
async function refreshGmailToken(
  oauthToken: any,
  supabase: any,
  userId: string
): Promise<string> {
  if (!oauthToken.refresh_token_encrypted) {
    throw new Error('No refresh token available')
  }

  const refreshToken = await decrypt(oauthToken.refresh_token_encrypted)

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const tokens = await response.json()
  const { encrypt } = await import('../_shared/encryption.ts')

  // Update token in database
  await supabase
    .from('user_email_oauth_tokens')
    .update({
      access_token_encrypted: await encrypt(tokens.access_token),
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'gmail')

  return tokens.access_token
}

/**
 * Create notification action
 */
async function executeCreateNotification(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<unknown> {
  const title = action.config.title as string
  const message = action.config.message as string

  if (!title || !message) {
    throw new Error('Notification requires title and message')
  }

  if (isTest) {
    return {
      action: 'create_notification',
      title,
      message,
      wouldNotify: context.recipientId || 'unknown',
      isTest: true,
    }
  }

  const recipientId = context.recipientId as string
  if (!recipientId) {
    throw new Error('No recipient ID in context')
  }

  // Create notification
  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: recipientId,
    type: 'workflow',
    title,
    message,
    is_read: false,
  })

  if (notifError) {
    throw new Error(`Failed to create notification: ${notifError.message}`)
  }

  return { created: true, title }
}

/**
 * Webhook action
 */
async function executeWebhook(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean
): Promise<unknown> {
  const url = action.config.webhookUrl as string
  const method = (action.config.webhookMethod as string) || 'POST'

  if (!url) {
    throw new Error('No webhook URL specified')
  }

  if (isTest) {
    return {
      action: 'webhook',
      url,
      method,
      wouldSend: context,
      isTest: true,
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(action.config.webhookHeaders as Record<string, string> || {}),
    },
    body: method !== 'GET' ? JSON.stringify(context) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`)
  }

  return { status: response.status, url }
}

/**
 * Update field action
 */
async function executeUpdateField(
  action: WorkflowAction,
  context: Record<string, unknown>,
  isTest: boolean,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<unknown> {
  const fieldName = action.config.fieldName as string
  const fieldValue = action.config.fieldValue

  if (!fieldName) {
    throw new Error('No field name specified for update_field action')
  }

  if (isTest) {
    return {
      action: 'update_field',
      field: fieldName,
      value: fieldValue,
      isTest: true,
    }
  }

  // Determine which table to update based on context
  // This is a simplified implementation - real version would be more sophisticated
  const targetId = context.targetId as string
  const targetTable = context.targetTable as string

  if (!targetId || !targetTable) {
    throw new Error('No target specified for field update')
  }

  const { error } = await supabase
    .from(targetTable)
    .update({ [fieldName]: fieldValue })
    .eq('id', targetId)

  if (error) {
    throw new Error(`Failed to update field: ${error.message}`)
  }

  return { updated: true, field: fieldName }
}
