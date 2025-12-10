// Process Email Queue Edge Function
// Processes pending emails from the email_queue table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const adminSupabase = createSupabaseAdminClient();
  const startTime = Date.now();

  try {
    console.log('Processing email queue...');

    // Get pending emails
    const { data: pendingEmails, error: fetchError } = await adminSupabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch pending emails: ${fetchError.message}`);
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('No pending emails to process');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending emails',
          processed: 0,
          durationMs: Date.now() - startTime
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${pendingEmails.length} pending emails`);

    let sentCount = 0;
    let failedCount = 0;

    for (const email of pendingEmails) {
      try {
        // Mark as sending
        await adminSupabase
          .from('email_queue')
          .update({ status: 'sending' })
          .eq('id', email.id);

        // Get recipient email address - either from direct email field or lookup by ID
        let recipientEmail = email.recipient_email;

        if (!recipientEmail && email.recipient_id) {
          const { data: recipient } = await adminSupabase
            .from('user_profiles')
            .select('email')
            .eq('id', email.recipient_id)
            .single();

          recipientEmail = recipient?.email;
        }

        if (!recipientEmail) {
          throw new Error('Recipient email not found');
        }

        // Invoke send-automated-email function (doesn't require user auth)
        const { data: sendResult, error: sendError } = await adminSupabase.functions.invoke('send-automated-email', {
          body: {
            to: recipientEmail,
            subject: email.subject,
            html: email.body_html,
            text: email.body_text || undefined
          }
        });

        if (sendError) {
          throw sendError;
        }

        // Mark as sent
        await adminSupabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);

        sentCount++;
        console.log(`Email ${email.id} sent to ${recipientEmail}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to send email ${email.id}:`, errorMessage);

        // Mark as failed
        await adminSupabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: errorMessage
          })
          .eq('id', email.id);

        failedCount++;
      }
    }

    console.log(`Email processing complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingEmails.length,
        sentCount,
        failedCount,
        durationMs: Date.now() - startTime
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Process email queue error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
