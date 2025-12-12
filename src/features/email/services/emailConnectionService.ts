// Email Connection Service
// Handles Gmail/Outlook OAuth connection management

import {supabase} from '@/services'
import type {EmailOAuthToken, EmailConnectionStatus, EmailProvider} from '@/types/email.types'

// Environment-based configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || ''

// Gmail OAuth scopes
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

/**
 * Get the current user's email connection status
 */
export async function getEmailConnectionStatus(): Promise<EmailConnectionStatus> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { isConnected: false, provider: null, email: null, lastUsed: null, expiresAt: null }
  }

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { isConnected: false, provider: null, email: null, lastUsed: null, expiresAt: null }
  }

  // Get active OAuth token
  const { data: token } = await supabase
    .from('user_email_oauth_tokens')
    .select('provider, email_address, is_active, token_expiry, last_used_at')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .single()

  if (!token) {
    return { isConnected: false, provider: null, email: null, lastUsed: null, expiresAt: null }
  }

  return {
    isConnected: true,
    provider: token.provider as EmailProvider,
    email: token.email_address,
    lastUsed: token.last_used_at,
    expiresAt: token.token_expiry,
  }
}

/**
 * Get all email OAuth tokens for the current user
 */
export async function getEmailOAuthTokens(): Promise<EmailOAuthToken[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return []

  const { data: tokens, error } = await supabase
    .from('user_email_oauth_tokens')
    .select('id, user_id, provider, email_address, is_active, token_expiry, scopes, last_used_at, created_at, updated_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch OAuth tokens:', error)
    return []
  }

  return tokens as EmailOAuthToken[]
}

/**
 * Initiate Gmail OAuth flow
 * Opens a popup or redirects to Google's OAuth consent screen
 */
export async function initiateGmailOAuth(): Promise<void> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    throw new Error('Gmail OAuth not configured. Please set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_REDIRECT_URI.')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to connect Gmail.')
  }

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found.')
  }

  // State parameter: profile_id:provider
  const state = `${profile.id}:gmail`

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline', // Get refresh token
    prompt: 'consent', // Always show consent to ensure refresh token
    state,
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  // Redirect to Google OAuth
  window.location.href = authUrl
}

/**
 * Disconnect email account
 */
export async function disconnectEmail(provider: EmailProvider): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to disconnect email.')
  }

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found.')
  }

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('user_email_oauth_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', profile.id)
    .eq('provider', provider)

  if (error) {
    console.error('Failed to disconnect email:', error)
    throw new Error('Failed to disconnect email account.')
  }
}

/**
 * Get email quota for the current user
 */
export async function getEmailQuota(provider: EmailProvider): Promise<{
  sent: number
  limit: number
  remaining: number
}> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { sent: 0, limit: 500, remaining: 500 }
  }

  // Get user profile ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { sent: 0, limit: 500, remaining: 500 }
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: quota } = await supabase
    .from('email_quota_tracking')
    .select('emails_sent')
    .eq('user_id', profile.id)
    .eq('provider', provider)
    .eq('date', today)
    .single()

  const limit = provider === 'gmail' ? 500 : 2000 // Personal Gmail vs Workspace/Outlook
  const sent = quota?.emails_sent || 0

  return {
    sent,
    limit,
    remaining: Math.max(0, limit - sent),
  }
}

/**
 * Check if email is properly configured
 */
export function isEmailConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_REDIRECT_URI)
}

/**
 * Get OAuth configuration status for UI display
 */
export function getOAuthConfigStatus(): {
  gmail: { configured: boolean; clientId: string }
  outlook: { configured: boolean }
} {
  return {
    gmail: {
      configured: Boolean(GOOGLE_CLIENT_ID && GOOGLE_REDIRECT_URI),
      clientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'Not set',
    },
    outlook: {
      configured: false, // Not implemented yet
    },
  }
}
