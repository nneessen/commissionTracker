// src/features/auth/EmailVerificationPending.tsx

import React from 'react';
import { Button } from '../../components/ui';
import { MAX_RESEND_ATTEMPTS } from '../../constants/auth.constants';
import { useEmailVerification } from './hooks/useEmailVerification';
import { Alert } from './components/Alert';
import { EmailIcon } from './components/EmailIcon';

/**
 * EmailVerificationPending
 *
 * Displays after user signup to inform them that a verification email has been sent.
 * Provides ability to resend email with rate limiting (60s cooldown, max 3 attempts).
 *
 * Flow:
 * 1. User signs up → redirected here with email in router state
 * 2. User checks email → clicks verification link
 * 3. AuthCallback processes link → sets session → redirects to dashboard
 *
 * Edge cases handled:
 * - No email in state → fallback to sessionStorage → show error if missing
 * - User already verified → auto-redirect to dashboard
 * - Email resend failures → show actionable error message
 * - Rate limiting → enforce cooldown and attempt limits
 *
 * @component
 */
export const EmailVerificationPending: React.FC = () => {
  const {
    email,
    loading,
    error,
    message,
    resendCount,
    isResendDisabled,
    handleResend,
    handleBackToLogin,
    getResendButtonText,
  } = useEmailVerification();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg">
            CT
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-600">
            We sent a verification link to
          </p>
          {email && (
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {email}
            </p>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Email Icon */}
          <EmailIcon />

          {/* Success Message */}
          {message && <Alert type="success" message={message} />}

          {/* Error Message */}
          {error && <Alert type="error" message={error} />}

          {/* Instructions */}
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-700">
              Click the link in the email to verify your account and get started.
            </p>
            <p className="text-xs text-gray-500">
              The link will expire in 24 hours for security reasons.
            </p>
          </div>

          {/* Resend Button */}
          <Button
            onClick={handleResend}
            disabled={isResendDisabled}
            loading={loading}
            className="w-full py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label={getResendButtonText()}
          >
            {getResendButtonText()}
          </Button>

          {/* Attempt counter */}
          {resendCount > 0 && resendCount < MAX_RESEND_ATTEMPTS && (
            <p className="text-xs text-center text-gray-500">
              {resendCount} of {MAX_RESEND_ATTEMPTS} resend attempts used
            </p>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                Didn't receive the email?
              </span>
            </div>
          </div>

          {/* Help text */}
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>Check your spam folder or try resending the email.</p>
            <p>Make sure you entered the correct email address.</p>
          </div>

          {/* Back to login */}
          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors py-2"
          >
            Back to login
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          Need help? Contact support at support@commissiontracker.com
        </p>
      </div>
    </div>
  );
};
