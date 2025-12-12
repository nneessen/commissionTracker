// src/features/auth/EmailVerificationPending.tsx

import React from "react";
import {Button} from "../../components/ui";
import {Card, CardContent} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {MAX_RESEND_ATTEMPTS} from "../../constants/auth.constants";
import {useEmailVerification} from "./hooks/useEmailVerification";
import {EmailIcon} from "./components/EmailIcon";
import {AuthErrorDisplay} from "./components/AuthErrorDisplay";
import {AuthSuccessMessage} from "./components/AuthSuccessMessage";

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
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4 shadow-lg">
            CT
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Check your email
          </h2>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to
          </p>
          {email && (
            <p className="text-sm font-semibold text-foreground mt-1">{email}</p>
          )}
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8 space-y-6">
            <EmailIcon />

            {message && <AuthSuccessMessage message={message} />}

            {error && <AuthErrorDisplay error={error} mode="signin" onSwitchToSignup={() => {}} />}

            <div className="text-center space-y-3">
              <p className="text-sm text-foreground">
                Click the link in the email to verify your account and get
                started.
              </p>
              <p className="text-xs text-muted-foreground">
                The link will expire in 24 hours for security reasons.
              </p>
            </div>

            <Button
              onClick={handleResend}
              disabled={isResendDisabled}
              className="w-full py-3 text-base font-semibold rounded-xl"
              aria-label={getResendButtonText()}
            >
              {loading ? "Sending..." : getResendButtonText()}
            </Button>

            {resendCount > 0 && resendCount < MAX_RESEND_ATTEMPTS && (
              <p className="text-xs text-center text-muted-foreground">
                {resendCount} of {MAX_RESEND_ATTEMPTS} resend attempts used
              </p>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">
                  Didn't receive the email?
                </span>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Check your spam folder or try resending the email.</p>
              <p>Make sure you entered the correct email address.</p>
            </div>

            <Button
              type="button"
              onClick={handleBackToLogin}
              variant="link"
              className="w-full text-center text-sm font-medium h-auto py-2"
            >
              Back to login
            </Button>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Need help? Contact support at support@commissiontracker.com
        </p>
      </div>
    </div>
  );
};
