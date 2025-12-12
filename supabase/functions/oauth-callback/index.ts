// OAuth Callback Edge Function
// Handles Gmail and Outlook OAuth redirects
// Exchanges authorization code for tokens, encrypts, and stores them

import {serve} from 'https://deno.land/std@0.168.0/http/server.ts'
import {encrypt} from '../_shared/encryption.ts'
import {createSupabaseAdminClient} from '../_shared/supabase-client.ts'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI')! // e.g., https://xxx.supabase.co/functions/v1/oauth-callback

// Frontend URL to redirect after OAuth
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

interface GoogleUserInfo {
  email: string
  name: string
  picture?: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // Contains user_id and provider
  const error = url.searchParams.get('error')

  // Handle OAuth error
  if (error) {
    console.error('OAuth error:', error)
    return Response.redirect(`${FRONTEND_URL}/settings?error=${encodeURIComponent(error)}`)
  }

  // Validate required params
  if (!code || !state) {
    console.error('Missing code or state')
    return Response.redirect(`${FRONTEND_URL}/settings?error=missing_params`)
  }

  try {
    // Parse state: user_id:provider
    const [userId, provider] = state.split(':')

    if (!userId || !provider) {
      throw new Error('Invalid state parameter')
    }

    console.log(`Processing OAuth callback for user ${userId}, provider: ${provider}`)

    // Exchange code for tokens based on provider
    if (provider === 'gmail') {
      const tokens = await exchangeGoogleCode(code)
      const userInfo = await getGoogleUserInfo(tokens.access_token)

      // Encrypt tokens
      const accessTokenEncrypted = await encrypt(tokens.access_token)
      const refreshTokenEncrypted = tokens.refresh_token
        ? await encrypt(tokens.refresh_token)
        : null

      // Calculate token expiry
      const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)

      // Store in database using admin client (bypasses RLS)
      const supabase = createSupabaseAdminClient()

      // Upsert OAuth token record
      const { error: dbError } = await supabase
        .from('user_email_oauth_tokens')
        .upsert(
          {
            user_id: userId,
            provider: 'gmail',
            access_token_encrypted: accessTokenEncrypted,
            refresh_token_encrypted: refreshTokenEncrypted,
            token_expiry: tokenExpiry.toISOString(),
            scopes: tokens.scope.split(' '),
            email_address: userInfo.email,
            is_active: true,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' }
        )

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Failed to store tokens: ${dbError.message}`)
      }

      console.log(`Successfully stored Gmail tokens for user ${userId} (${userInfo.email})`)

      // Set up Gmail Watch for incoming emails (optional, can be done later)
      // await setupGmailWatch(tokens.access_token, userId)

      // Redirect to frontend with success
      return Response.redirect(
        `${FRONTEND_URL}/settings?success=email_connected&email=${encodeURIComponent(userInfo.email)}`
      )
    } else if (provider === 'outlook') {
      // Microsoft OAuth (future implementation)
      throw new Error('Outlook OAuth not yet implemented')
    } else {
      throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (err) {
    console.error('OAuth callback error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return Response.redirect(`${FRONTEND_URL}/settings?error=${encodeURIComponent(errorMessage)}`)
  }
})

/**
 * Exchange Google authorization code for tokens
 */
async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Google token exchange failed:', error)
    throw new Error('Failed to exchange authorization code')
  }

  return response.json()
}

/**
 * Get user info from Google to get their email address
 */
async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Google user info')
  }

  return response.json()
}

/**
 * Set up Gmail Watch for push notifications on incoming emails
 * This enables real-time incoming email notifications via Pub/Sub
 */
async function _setupGmailWatch(
  accessToken: string,
  userId: string
): Promise<{ historyId: string; expiration: string }> {
  const PUBSUB_TOPIC = Deno.env.get('GOOGLE_PUBSUB_TOPIC')! // e.g., projects/myproject/topics/gmail-notifications

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicName: PUBSUB_TOPIC,
      labelIds: ['INBOX'], // Watch inbox only
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Gmail Watch setup failed:', error)
    throw new Error('Failed to set up Gmail Watch')
  }

  const watchResponse = await response.json()

  // Store watch subscription info
  const supabase = createSupabaseAdminClient()
  await supabase.from('email_watch_subscriptions').upsert(
    {
      user_id: userId,
      provider: 'gmail',
      history_id: watchResponse.historyId,
      expiration: new Date(parseInt(watchResponse.expiration)).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' }
  )

  return {
    historyId: watchResponse.historyId,
    expiration: watchResponse.expiration,
  }
}
