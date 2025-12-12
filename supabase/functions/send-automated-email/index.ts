// File: /home/nneessen/projects/commissionTracker/supabase/functions/send-automated-email/index.ts
// Send Automated Email Edge Function
// Sends automated emails using Resend API
// This function is for system-generated emails (workflows, notifications) not user emails

import {serve} from 'https://deno.land/std@0.168.0/http/server.ts'
import {createSupabaseAdminClient} from '../_shared/supabase-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: SendEmailRequest = await req.json()
    const { to, subject, html, text } = body

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get Resend API key from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, simulating email send')

      // For now, just log the email and return success
      // This allows the workflow to complete even without email service
      console.log('=== SIMULATED EMAIL ===')
      console.log('To:', to)
      console.log('Subject:', subject)
      console.log('Body (text):', text || '(no text version)')
      console.log('Body (HTML):', html.substring(0, 200) + '...')
      console.log('=======================')

      // Log to database for debugging
      const adminSupabase = createSupabaseAdminClient()
      await adminSupabase.from('email_logs').insert({
        to,
        subject,
        body_html: html,
        body_text: text,
        status: 'simulated',
        provider: 'none',
        created_at: new Date().toISOString()
      }).catch(_err => {
        // Ignore if table doesn't exist
        console.log('Could not log to email_logs table')
      })

      return new Response(
        JSON.stringify({
          success: true,
          messageId: `simulated-${Date.now()}`,
          simulated: true,
          message: 'Email simulated (no email service configured)'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: body.from || 'Commission Tracker <noreply@commissiontracker.com>',
        to: [to],
        subject,
        html,
        text,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.id,
        message: 'Email sent successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Send automated email error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})