// src/features/auth/hooks/useEmailVerification.ts

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { SESSION_STORAGE_KEYS, RESEND_COOLDOWN_SECONDS, MAX_RESEND_ATTEMPTS } from '../../../constants/auth.constants';
import { logger } from '../../../services/base/logger';

/**
 * Custom hook to manage email verification state and logic
 */
export const useEmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resendVerificationEmail, session } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Initialize email from router state or sessionStorage
  useEffect(() => {
    const routerEmail = (location.state as any)?.email;
    const storedEmail = sessionStorage.getItem(SESSION_STORAGE_KEYS.VERIFICATION_EMAIL);

    if (routerEmail) {
      setEmail(routerEmail);
      sessionStorage.setItem(SESSION_STORAGE_KEYS.VERIFICATION_EMAIL, routerEmail);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      setError('No email found. Please sign up again.');
      logger.warn('EmailVerificationPending: No email found in state or sessionStorage', undefined, 'Auth');
    }
  }, [location]);

  // Check if user is already verified - redirect to dashboard
  useEffect(() => {
    if (session) {
      logger.auth('User already verified, redirecting to dashboard');
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.VERIFICATION_EMAIL);
      navigate({ to: '/' });
    }
  }, [session, navigate]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  /**
   * Handle resend verification email with validation and rate limiting
   */
  const handleResend = async () => {
    if (!email) {
      setError('No email address available. Please sign up again.');
      return;
    }

    if (cooldownSeconds > 0) {
      return; // Still in cooldown
    }

    if (resendCount >= MAX_RESEND_ATTEMPTS) {
      setError(`Maximum resend attempts (${MAX_RESEND_ATTEMPTS}) reached. Please try again later or contact support.`);
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await resendVerificationEmail(email);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      setResendCount(resendCount + 1);
      setMessage('Verification email sent! Please check your inbox.');
      logger.auth('Verification email resent', { email, attempt: resendCount + 1 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend email';

      if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError(errorMessage);
      }

      logger.error('Resend verification email failed', err instanceof Error ? err : String(err), 'Auth');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate back to login and clear verification email from storage
   */
  const handleBackToLogin = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.VERIFICATION_EMAIL);
    navigate({ to: '/login' });
  };

  /**
   * Get button text based on current state
   */
  const getResendButtonText = () => {
    if (loading) return 'Sending...';
    if (cooldownSeconds > 0) return `Resend in ${cooldownSeconds}s`;
    if (resendCount >= MAX_RESEND_ATTEMPTS) return 'Maximum attempts reached';
    if (resendCount === 0) return 'Resend verification email';
    return 'Resend email again';
  };

  const isResendDisabled = loading || cooldownSeconds > 0 || resendCount >= MAX_RESEND_ATTEMPTS || !email;

  return {
    email,
    loading,
    error,
    message,
    resendCount,
    cooldownSeconds,
    isResendDisabled,
    handleResend,
    handleBackToLogin,
    getResendButtonText,
  };
};
