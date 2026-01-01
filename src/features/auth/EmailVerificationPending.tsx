// src/features/auth/EmailVerificationPending.tsx

import React from "react";
import { Button } from "../../components/ui";
import { Separator } from "@/components/ui/separator";
import { MAX_RESEND_ATTEMPTS } from "../../constants/auth.constants";
import { useEmailVerification } from "./hooks/useEmailVerification";
import { AuthErrorDisplay } from "./components/AuthErrorDisplay";
import { AuthSuccessMessage } from "./components/AuthSuccessMessage";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-foreground relative overflow-hidden">
        {/* Geometric background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo and brand */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <img
                src="/logos/Light Letter Logo .png"
                alt="The Standard"
                className="h-12 w-12 dark:hidden"
              />
              <img
                src="/logos/LetterLogo.png"
                alt="The Standard"
                className="h-12 w-12 hidden dark:block"
              />
              <span className="text-background text-2xl font-semibold tracking-tight">
                THE STANDARD
              </span>
            </div>
          </div>

          {/* Middle - Main messaging */}
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-background/10 flex items-center justify-center">
              <Mail className="h-10 w-10 text-background" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-background leading-tight">
              Almost there.
            </h1>
            <p className="text-background/60 text-lg max-w-md">
              We just need to verify your email address before you can start
              using the platform.
            </p>
          </div>

          {/* Bottom */}
          <div className="text-background/40 text-sm">
            © {new Date().getFullYear()} The Standard Holdings. All rights
            reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <img
              src="/logos/LetterLogo.png"
              alt="The Standard"
              className="h-10 w-10 dark:hidden"
            />
            <img
              src="/logos/Light Letter Logo .png"
              alt="The Standard"
              className="h-10 w-10 hidden dark:block"
            />
            <span className="text-foreground text-xl font-semibold tracking-tight">
              THE STANDARD
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to
            </p>
            {email && (
              <p className="text-sm font-semibold text-foreground mt-1">
                {email}
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-6">
            {message && <AuthSuccessMessage message={message} />}
            {error && (
              <AuthErrorDisplay
                error={error}
                mode="signin"
                onSwitchToSignup={() => {}}
              />
            )}
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div className="space-y-3">
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
              className="w-full h-11"
              aria-label={getResendButtonText()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                getResendButtonText()
              )}
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
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-background text-muted-foreground">
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
              variant="ghost"
              className="w-full h-10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Need help? Contact support at support@thestandard.com
          </p>
        </div>
      </div>
    </div>
  );
};
