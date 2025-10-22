// src/features/auth/EmailVerificationPending.tsx

import React from "react";
import { Button } from "../../components/ui";
import { MAX_RESEND_ATTEMPTS } from "../../constants/auth.constants";
import { useEmailVerification } from "./hooks/useEmailVerification";
import { Alert } from "@/components/ui/alert";
import { EmailIcon } from "@/components/custom_ui/EmailIcon";

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
            <p className="text-sm font-semibold text-gray-900 mt-1">{email}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <EmailIcon />

          {message && <Alert type="success" message={message} />}

          {error && <Alert type="error" message={error} />}

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-700">
              Click the link in the email to verify your account and get
              started.
            </p>
            <p className="text-xs text-gray-500">
              The link will expire in 24 hours for security reasons.
            </p>
          </div>

          <Button
            onClick={handleResend}
            disabled={isResendDisabled}
            loading={loading}
            className="w-full py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label={getResendButtonText()}
          >
            {getResendButtonText()}
          </Button>

          {resendCount > 0 && resendCount < MAX_RESEND_ATTEMPTS && (
            <p className="text-xs text-center text-gray-500">
              {resendCount} of {MAX_RESEND_ATTEMPTS} resend attempts used
            </p>
          )}

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

          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>Check your spam folder or try resending the email.</p>
            <p>Make sure you entered the correct email address.</p>
          </div>

          <Button
            type="button"
            onClick={handleBackToLogin}
            variant="link"
            className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 h-auto py-2"
          >
            Back to login
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          Need help? Contact support at support@commissiontracker.com
        </p>
      </div>
    </div>
  );
};
