// Send Email Edge Function
// Sends email via Gmail API using stored OAuth tokens
// Supports attachments and threading

import {serve} from 'https://deno.land/std@0.168.0/http/server.ts'
import {decrypt} from '../_shared/encryption.ts'
import {createSupabaseClient, createSupabaseAdminClient} from '../_shared/supabase-client.ts'
import {encode as base64Encode} from 'https://deno.land/std@0.168.0/encoding/base64.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailRequest {
  to: string[] // Array of recipient email addresses
  cc?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  attachments?: Array<{
    filename: string
    content: string // Base64 encoded
    mimeType: string
  }>
  threadId?: string // For replies, include the thread ID
  replyToEmailId?: string // Reference to user_emails.id if replying
  recruitId?: string // Optional: Link to recruit (user_id in user_emails)
}

interface SendEmailResponse {
  success: boolean
  emailId?: string // Our database ID
  gmailMessageId?: string // Gmail's message ID
  threadId?: string
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

  try {
    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with user's JWT
    const supabase = createSupabaseClient(authHeader)

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const body: SendEmailRequest = await req.json()

    if (!body.to || body.to.length === 0 || !body.subject || !body.bodyHtml) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, bodyHtml' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use admin client to access OAuth tokens (bypasses RLS)
    const adminSupabase = createSupabaseAdminClient()

    // Get user's Gmail OAuth token
    const { data: oauthToken, error: tokenError } = await adminSupabase
      .from('user_email_oauth_tokens')
      .select('*')
      .eq('user_id', profile.id)
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single()

    if (tokenError || !oauthToken) {
      return new Response(
        JSON.stringify({ error: 'Gmail not connected. Please connect your Gmail account in settings.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check quota
    const quotaCheckResult = await adminSupabase.rpc('check_email_quota', {
      p_user_id: profile.id,
      p_provider: 'gmail',
      p_limit: 500, // Personal Gmail limit
    })

    if (!quotaCheckResult.data) {
      return new Response(
        JSON.stringify({ error: 'Daily email quota exceeded. Gmail allows 500 emails per day.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Decrypt access token
    let accessToken: string
    try {
      accessToken = await decrypt(oauthToken.access_token_encrypted)
    } catch (decryptError) {
      console.error('Token decryption failed:', decryptError)
      return new Response(JSON.stringify({ error: 'Failed to decrypt OAuth token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if token is expired and refresh if needed
    if (oauthToken.token_expiry && new Date(oauthToken.token_expiry) < new Date()) {
      console.log('Token expired, attempting refresh...')
      try {
        accessToken = await refreshGmailToken(oauthToken, adminSupabase, profile.id)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        return new Response(
          JSON.stringify({
            error: 'Gmail token expired and refresh failed. Please reconnect your Gmail account.',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Build the email message
    const rawMessage = buildRawEmail({
      from: oauthToken.email_address,
      to: body.to,
      cc: body.cc,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      attachments: body.attachments,
    })

    // Send via Gmail API
    const gmailResponse = await sendViaGmail(accessToken, rawMessage, body.threadId)

    // Create email record in database
    const { data: emailRecord, error: emailError } = await supabase.from('user_emails').insert({
      user_id: body.recruitId || profile.id, // Link to recruit if specified, otherwise sender
      sender_id: profile.id,
      subject: body.subject,
      body_html: body.bodyHtml,
      body_text: body.bodyText,
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider: 'gmail',
      provider_message_id: gmailResponse.id,
      thread_id: gmailResponse.threadId,
      is_incoming: false,
      from_address: oauthToken.email_address,
      to_addresses: body.to,
      cc_addresses: body.cc,
      reply_to_id: body.replyToEmailId,
    }).select().single()

    if (emailError) {
      console.error('Failed to create email record:', emailError)
      // Email was sent, but we couldn't record it - log and continue
    }

    // Increment quota
    await adminSupabase.rpc('increment_email_quota', {
      p_user_id: profile.id,
      p_provider: 'gmail',
    })

    // Update last_used_at on OAuth token
    await adminSupabase
      .from('user_email_oauth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', oauthToken.id)

    const response: SendEmailResponse = {
      success: true,
      emailId: emailRecord?.id,
      gmailMessageId: gmailResponse.id,
      threadId: gmailResponse.threadId,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Send email error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Build RFC 2822 compliant email message
 */
function buildRawEmail(params: {
  from: string
  to: string[]
  cc?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  attachments?: Array<{ filename: string; content: string; mimeType: string }>
}): string {
  const boundary = `boundary_${Date.now()}`
  const hasAttachments = params.attachments && params.attachments.length > 0

  let message = ''

  // Headers
  message += `From: ${params.from}\r\n`
  message += `To: ${params.to.join(', ')}\r\n`
  if (params.cc && params.cc.length > 0) {
    message += `Cc: ${params.cc.join(', ')}\r\n`
  }
  message += `Subject: ${params.subject}\r\n`
  message += `MIME-Version: 1.0\r\n`

  if (hasAttachments) {
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`
    message += `\r\n`
    message += `--${boundary}\r\n`
  }

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

  // Attachments
  if (hasAttachments && params.attachments) {
    for (const attachment of params.attachments) {
      message += `--${boundary}\r\n`
      message += `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"\r\n`
      message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`
      message += `Content-Transfer-Encoding: base64\r\n`
      message += `\r\n`
      message += `${attachment.content}\r\n`
    }
    message += `--${boundary}--\r\n`
  }

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
  // Gmail API requires URL-safe base64 encoding
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
  adminSupabase: any,
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
  await adminSupabase
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
