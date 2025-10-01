// src/features/auth/AuthCallback.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../../services/base/supabase';
import { logger } from '../../services/base/logger';

/**
 * AuthCallback - Handles email confirmation and OAuth callbacks
 *
 * This component processes authentication tokens from email links:
 * - Email confirmation after signup
 * - Magic link login
 * - OAuth provider callbacks
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL (Supabase uses hash-based routing)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        logger.auth('Auth callback received', { type, hasAccessToken: !!accessToken });

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          logger.auth('Session set successfully', { email: data.user?.email });

          setStatus('success');
          setMessage('Email verified! Redirecting to dashboard...');

          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            navigate({ to: '/' });
          }, 2000);
        } else {
          // No tokens found, might be an error or user navigated here directly
          throw new Error('No authentication tokens found in URL');
        }
      } catch (err) {
        logger.error('Auth callback error', err instanceof Error ? err : String(err), 'Auth');
        setStatus('error');
        setMessage(
          err instanceof Error
            ? err.message
            : 'Failed to verify email. Please try signing in again.'
        );

        // Redirect to login after showing error
        setTimeout(() => {
          navigate({ to: '/login' });
        }, 3000);
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
            {status === 'loading' && 'Verifying Email'}
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
