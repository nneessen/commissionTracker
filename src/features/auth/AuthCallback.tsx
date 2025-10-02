// src/features/auth/AuthCallback.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../../services/base/supabase';
import { logger } from '../../services/base/logger';
import { AUTH_CALLBACK_TYPES, type AuthCallbackType, SESSION_STORAGE_KEYS } from '../../constants/auth.constants';

/**
 * AuthCallback - Handles email confirmation and OAuth callbacks
 *
 * This component processes authentication tokens from email links:
 * - Email confirmation after signup (type: 'signup')
 * - Password recovery (type: 'recovery')
 * - Magic link login (type: 'magiclink')
 * - OAuth provider callbacks
 * - Email change confirmation (type: 'email_change')
 *
 * Edge cases handled:
 * - Expired tokens → redirect to verification page with error
 * - Invalid tokens → show error with action
 * - Already verified → sign in anyway
 * - Error codes in URL → display user-friendly messages
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const [authType, setAuthType] = useState<AuthCallbackType | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL (Supabase uses hash-based routing)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type') as AuthCallbackType;
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        // Handle errors first
        if (errorCode || errorDescription) {
          throw new Error(errorDescription || `Authentication error: ${errorCode}`);
        }

        setAuthType(type);
        logger.auth('Auth callback received', { type, hasAccessToken: !!accessToken });

        // Handle password recovery separately
        if (type === AUTH_CALLBACK_TYPES.RECOVERY) {
          logger.auth('Password recovery callback, redirecting to reset password');
          // This is handled by the ResetPassword component
          // The user will be redirected there automatically
          return;
        }

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          logger.auth('Session set successfully', { email: data.user?.email, type });

          // Clear any pending verification email from storage
          sessionStorage.removeItem(SESSION_STORAGE_KEYS.VERIFICATION_EMAIL);

          // Set appropriate success message based on type
          let successMessage = 'Authentication successful! Redirecting...';
          if (type === AUTH_CALLBACK_TYPES.SIGNUP) {
            successMessage = 'Email verified successfully! Welcome aboard!';
          } else if (type === AUTH_CALLBACK_TYPES.MAGICLINK) {
            successMessage = 'Magic link verified! Signing you in...';
          } else if (type === AUTH_CALLBACK_TYPES.EMAIL_CHANGE) {
            successMessage = 'Email updated successfully!';
          }

          setStatus('success');
          setMessage(successMessage);

          // Check if we're in a popup window
          if (window.opener && !window.opener.closed) {
            // We're in a popup - try to redirect the parent and close this window
            setTimeout(() => {
              try {
                // Try to communicate with parent window
                window.opener.location.href = '/';
                window.close();
              } catch (e) {
                // If cross-origin issue, just redirect normally
                navigate({ to: '/' });
              }
            }, 2000);
          } else {
            // Normal redirect in same window
            setTimeout(() => {
              navigate({ to: '/' });
            }, 2000);
          }
        } else {
          // No tokens found, might be an error or user navigated here directly
          throw new Error('No authentication tokens found in URL. Please try the verification link again.');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Auth callback error', err instanceof Error ? err : String(err), 'Auth');

        setStatus('error');

        // Provide user-friendly error messages with actions
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          setMessage('This verification link has expired or is invalid. Please request a new one.');

          // Redirect to verification page after showing error
          setTimeout(() => {
            navigate({ to: '/auth/verify-email' });
          }, 3000);
        } else if (errorMessage.includes('already') || errorMessage.includes('confirmed')) {
          setMessage('This email is already verified. Redirecting to login...');

          setTimeout(() => {
            navigate({ to: '/login' });
          }, 2000);
        } else {
          setMessage(
            errorMessage || 'Failed to verify email. Please try signing in again.'
          );

          // Redirect to login after showing error
          setTimeout(() => {
            navigate({ to: '/login' });
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-md w-full px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold mb-6 shadow-lg">
            CT
          </div>

          {/* Status Icon */}
          {status === 'loading' && (
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex justify-center mb-6">
              <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {status === 'error' && (
            <div className="flex justify-center mb-6">
              <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'loading' && (
              authType === AUTH_CALLBACK_TYPES.SIGNUP ? 'Verifying Email' :
              authType === AUTH_CALLBACK_TYPES.MAGICLINK ? 'Verifying Magic Link' :
              'Authenticating'
            )}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Verification Failed'}
          </h2>
          <p className="text-gray-600">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
