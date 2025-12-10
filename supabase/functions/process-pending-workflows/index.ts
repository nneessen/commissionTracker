// Process Pending Workflows Edge Function
// This function runs periodically (via cron) to check for pending workflow runs
// and invoke the process-workflow function for each one

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessResult {
  runId: string
  workflowId: string
  status: 'queued' | 'failed'
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
  const results: ProcessResult[] = []

  try {
    console.log('Starting pending workflow runs processor...')

    // Find pending runs that haven't been processed yet
    // Only process runs created in the last hour to avoid stale runs
    const { data: pendingRuns, error: fetchError } = await adminSupabase
      .from('workflow_runs')
      .select(`
        id,
        workflow_id,
        context,
        started_at,
        workflows:workflow_id (
          name,
          status
        )
      `)
      .eq('status', 'pending')
      .gte('started_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('started_at', { ascending: true })
      .limit(10) // Process in batches of 10

    if (fetchError) {
      throw new Error(`Failed to fetch pending runs: ${fetchError.message}`)
    }

    if (!pendingRuns || pendingRuns.length === 0) {
      console.log('No pending workflow runs to process')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending runs to process',
          processed: 0,
          durationMs: Date.now() - startTime,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Found ${pendingRuns.length} pending runs to process`)

    // Process each run by invoking the process-workflow function
    for (const run of pendingRuns) {
      try {
        // Update status to 'running' to prevent duplicate processing
        const { error: updateError } = await adminSupabase
          .from('workflow_runs')
          .update({ status: 'running' })
          .eq('id', run.id)
          .eq('status', 'pending') // Only update if still pending (prevent race conditions)

        if (updateError) {
          console.error(`Failed to update run ${run.id} to running:`, updateError)
          results.push({
            runId: run.id,
            workflowId: run.workflow_id,
            status: 'failed',
            error: 'Failed to update status',
          })
          continue
        }

        // Invoke the process-workflow function
        const { data, error: invokeError } = await adminSupabase.functions.invoke(
          'process-workflow',
          {
            body: {
              runId: run.id,
              workflowId: run.workflow_id,
              isTest: false,
            },
          }
        )

        if (invokeError) {
          throw invokeError
        }

        console.log(`Queued workflow run ${run.id} for processing`)
        results.push({
          runId: run.id,
          workflowId: run.workflow_id,
          status: 'queued',
        })
      } catch (runError) {
        const errorMessage = runError instanceof Error ? runError.message : 'Unknown error'
        console.error(`Failed to process run ${run.id}:`, errorMessage)

        // Update run as failed
        await adminSupabase
          .from('workflow_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
            duration_ms: Date.now() - new Date(run.started_at).getTime(),
          })
          .eq('id', run.id)

        results.push({
          runId: run.id,
          workflowId: run.workflow_id,
          status: 'failed',
          error: errorMessage,
        })
      }
    }

    const successCount = results.filter((r) => r.status === 'queued').length
    const failedCount = results.filter((r) => r.status === 'failed').length

    console.log(`Processed ${successCount} runs successfully, ${failedCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingRuns.length,
        successCount,
        failedCount,
        results,
        durationMs: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Process pending workflows error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    return new Response(JSON.stringify({ success: false, error: errorMessage, results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
