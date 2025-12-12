// Email Connection Hook
// Manages Gmail/Outlook OAuth connection state

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {getEmailConnectionStatus, getEmailOAuthTokens, initiateGmailOAuth, disconnectEmail, getEmailQuota, isEmailConfigured, getOAuthConfigStatus} from '../services/emailConnectionService'
import type {EmailProvider} from '@/types/email.types'

// Query keys
export const emailConnectionKeys = {
  all: ['email-connection'] as const,
  status: () => [...emailConnectionKeys.all, 'status'] as const,
  tokens: () => [...emailConnectionKeys.all, 'tokens'] as const,
  quota: (provider: EmailProvider) => [...emailConnectionKeys.all, 'quota', provider] as const,
  config: () => [...emailConnectionKeys.all, 'config'] as const,
}

/**
 * Hook to get email connection status
 */
export function useEmailConnectionStatus() {
  return useQuery({
    queryKey: emailConnectionKeys.status(),
    queryFn: getEmailConnectionStatus,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to get all OAuth tokens
 */
export function useEmailOAuthTokens() {
  return useQuery({
    queryKey: emailConnectionKeys.tokens(),
    queryFn: getEmailOAuthTokens,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to get email quota
 */
export function useEmailQuota(provider: EmailProvider) {
  return useQuery({
    queryKey: emailConnectionKeys.quota(provider),
    queryFn: () => getEmailQuota(provider),
    staleTime: 60 * 1000, // 1 minute
    enabled: Boolean(provider),
  })
}

/**
 * Hook to initiate Gmail OAuth
 */
export function useConnectGmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: initiateGmailOAuth,
    onError: (error) => {
      console.error('Gmail OAuth error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect Gmail')
    },
    onSuccess: () => {
      // Will redirect, so this won't be called unless using popup
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.all })
    },
  })
}

/**
 * Hook to disconnect email
 */
export function useDisconnectEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disconnectEmail,
    onError: (error) => {
      console.error('Disconnect email error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect email')
    },
    onSuccess: () => {
      toast.success('Email account disconnected')
      queryClient.invalidateQueries({ queryKey: emailConnectionKeys.all })
    },
  })
}

/**
 * Hook to check OAuth configuration
 */
export function useOAuthConfig() {
  return useQuery({
    queryKey: emailConnectionKeys.config(),
    queryFn: () => ({
      isConfigured: isEmailConfigured(),
      ...getOAuthConfigStatus(),
    }),
    staleTime: Infinity, // Config doesn't change during session
  })
}

/**
 * Combined hook for email connection management
 */
export function useEmailConnection() {
  const status = useEmailConnectionStatus()
  const config = useOAuthConfig()
  const connectGmail = useConnectGmail()
  const disconnect = useDisconnectEmail()

  return {
    // Status
    isConnected: status.data?.isConnected ?? false,
    provider: status.data?.provider ?? null,
    email: status.data?.email ?? null,
    lastUsed: status.data?.lastUsed ?? null,
    isLoading: status.isLoading,
    error: status.error,

    // Config
    isConfigured: config.data?.isConfigured ?? false,
    gmailConfigured: config.data?.gmail?.configured ?? false,
    outlookConfigured: config.data?.outlook?.configured ?? false,

    // Actions
    connectGmail: connectGmail.mutate,
    isConnecting: connectGmail.isPending,
    disconnect: disconnect.mutate,
    isDisconnecting: disconnect.isPending,

    // Refetch
    refetch: status.refetch,
  }
}
