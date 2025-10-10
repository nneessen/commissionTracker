// src/features/auth/ResetPassword.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/ui';
import { logger } from '../../services/base/logger';

/**
 * ResetPassword - Handle password reset after user clicks email link
 *
 * This component is accessed when a user clicks the password reset link
 * from their email. It allows them to set a new password.
 */
export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery token in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      setHasToken(true);
      logger.auth('Password recovery token found');
    } else {
      logger.auth('No valid recovery token found');
      setError('Invalid or expired password reset link. Please request a new one.');
      setTimeout(() => {
        navigate({ to: '/login' });
      }, 3000);
    }
  }, [navigate]);

  const validatePasswords = (): string | null => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      logger.auth('Password updated successfully');

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate({ to: '/' });
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      setError(errorMessage);
      logger.error('Password update error', errorMessage, 'Auth');
    } finally {
      setLoading(false);
    }
  };

  if (!hasToken && !error) {
    return null; // Still checking for token
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg">
            CT
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Reset your password
          </h2>
          <p className="text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-3 text-sm font-medium text-green-800">
                  Password updated successfully! Redirecting to dashboard...
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-3 text-sm font-medium text-red-800">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          {hasToken && !success && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Password Input */}
              <Input
                label="New password"
                type="password"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              />

              {/* Confirm Password Input */}
              <Input
                label="Confirm new password"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                className="w-full py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {loading ? 'Updating password...' : 'Update password'}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate({ to: '/login' })}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
            disabled={loading}
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
};
