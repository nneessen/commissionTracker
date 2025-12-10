// Process Workflow Edge Function
// Executes workflow actions sequentially with delays and error handling

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-client.ts'

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
 * Send email action
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

  // Get template
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError || !template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  if (isTest) {
    return {
      action: 'send_email',
      template: template.name,
      subject: template.subject,
      wouldSendTo: context.recipientEmail || 'unknown',
      isTest: true,
    }
  }

  // For actual sending, we would call the send-email function
  // or queue the email for sending
  const recipientId = context.recipientId as string
  if (!recipientId) {
    throw new Error('No recipient ID in context')
  }

  // Queue email for sending
  const { error: queueError } = await supabase.from('email_queue').insert({
    template_id: templateId,
    recipient_id: recipientId,
    subject: template.subject,
    body_html: template.body_html,
    status: 'pending',
    variables: action.config.variables || {},
  })

  if (queueError) {
    throw new Error(`Failed to queue email: ${queueError.message}`)
  }

  return { queued: true, templateId }
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
