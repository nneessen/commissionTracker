// src/features/auth/ResetPassword.tsx

import React, { useState, useEffect } from 'react';
import {useNavigate} from '@tanstack/react-router';
import {useAuth} from '../../contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import {logger} from '../../services/base/logger';
import {AuthErrorDisplay} from './components/AuthErrorDisplay';
import {AuthSuccessMessage} from './components/AuthSuccessMessage';

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
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4 shadow-lg">
            CT
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Reset your password
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl">
          <CardContent className="p-8 space-y-6">
            {/* Success Message */}
            {success && (
              <AuthSuccessMessage message="Password updated successfully! Redirecting to dashboard..." />
            )}

            {/* Error Message */}
            {error && (
              <AuthErrorDisplay error={error} mode="signin" onSwitchToSignup={() => {}} />
            )}

            {/* Form */}
            {hasToken && !success && (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-base font-semibold rounded-xl"
                >
                  {loading ? 'Updating password...' : 'Update password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Button
            type="button"
            onClick={() => navigate({ to: '/login' })}
            variant="link"
            disabled={loading}
            className="h-auto p-0 text-sm font-medium"
          >
            ← Back to login
          </Button>
        </div>
      </div>
    </div>
  );
};
