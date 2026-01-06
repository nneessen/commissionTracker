// src/features/auth/ResetPassword.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "../../services/base/logger";
import { AuthErrorDisplay } from "./components/AuthErrorDisplay";
import { AuthSuccessMessage } from "./components/AuthSuccessMessage";
import { ArrowLeft, KeyRound } from "lucide-react";
import { LogoSpinner } from "@/components/ui/logo-spinner";

/**
 * ResetPassword - Handle password reset after user clicks email link
 *
 * This component is accessed when a user clicks the password reset link
 * from their email. It allows them to set a new password.
 */
export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, session, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return;
    }

    // Check if we have a valid recovery token in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    let accessToken = hashParams.get("access_token");
    let type = hashParams.get("type");

    // Fallback: Check sessionStorage for recovery hash (stored by index.tsx before Supabase could clear it)
    if (!accessToken || !type) {
      const storedHash = sessionStorage.getItem("recovery_hash");
      if (storedHash) {
        const storedParams = new URLSearchParams(storedHash.substring(1));
        accessToken = storedParams.get("access_token");
        type = storedParams.get("type");
        // Clear stored hash after reading
        sessionStorage.removeItem("recovery_hash");
        logger.auth("Using stored recovery hash from sessionStorage");
      }
    }

    // Check for hash tokens OR existing session
    // Supabase client may have already processed the hash and cleared it,
    // but the session is still valid for password reset
    if ((type === "recovery" && accessToken) || session) {
      setHasToken(true);
      setCheckedAuth(true);
      logger.auth("Password recovery token found or session active");
    } else {
      logger.auth("No valid recovery token or session found");
      setError(
        "Invalid or expired password reset link. Please request a new one.",
      );
      setCheckedAuth(true);
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 3000);
    }
  }, [navigate, session, authLoading]);

  const validatePasswords = (): string | null => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
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
      logger.auth("Password updated successfully");

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate({ to: "/" });
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update password";
      setError(errorMessage);
      logger.error("Password update error", errorMessage, "Auth");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is being checked
  if (authLoading || (!checkedAuth && !hasToken && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LogoSpinner size="xl" className="mb-4" />
          <p className="text-muted-foreground">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-foreground relative overflow-hidden">
        {/* Refined grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Animated glow orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-10 w-full">
          {/* Enhanced logo with glow and subtitle */}
          <div className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-xl group-hover:bg-amber-500/30 transition-all duration-500" />
              <img
                src="/logos/Light Letter Logo .png"
                alt="The Standard"
                className="relative h-14 w-14 drop-shadow-2xl dark:hidden"
              />
              <img
                src="/logos/LetterLogo.png"
                alt="The Standard"
                className="relative h-14 w-14 drop-shadow-2xl hidden dark:block"
              />
            </div>
            <div className="flex flex-col">
              <span
                className="text-white dark:text-black text-2xl font-bold tracking-wide"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                THE STANDARD
              </span>
              <span className="text-amber-400 text-[10px] uppercase tracking-[0.3em] font-medium">
                Financial Group
              </span>
            </div>
          </div>

          {/* Middle - Main messaging */}
          <div className="space-y-4">
            <div className="w-7 h-7 rounded bg-white/10 dark:bg-black/10 flex items-center justify-center">
              <KeyRound className="h-3.5 w-3.5 text-white dark:text-black" />
            </div>
            <h1
              className="text-4xl xl:text-5xl font-bold leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span className="text-white dark:text-black">Secure your</span>
              <br />
              <span className="text-white/70 dark:text-black/70">account.</span>
            </h1>
            <p className="text-white/80 dark:text-black/70 text-sm max-w-md leading-relaxed">
              Create a new password to regain access to your agency dashboard
              and continue managing your business.
            </p>
          </div>

          {/* Bottom */}
          <div className="text-white/50 dark:text-black/50 text-xs">
            © {new Date().getFullYear()} The Standard Financial Group
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="flex items-center gap-3">
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
              <div className="flex flex-col">
                <span
                  className="text-foreground text-xl font-bold tracking-wide"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  THE STANDARD
                </span>
                <span className="text-amber-500 text-[9px] uppercase tracking-[0.25em] font-medium">
                  Financial Group
                </span>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-3 text-center lg:text-left">
            <h2
              className="text-lg font-bold text-foreground mb-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Reset your password
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          {/* Form Card with frosted glass effect */}
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl p-4">
            {/* Messages */}
            <div className="space-y-4 mb-6">
              {success && (
                <AuthSuccessMessage message="Password updated successfully! Redirecting to dashboard..." />
              )}
              {error && (
                <AuthErrorDisplay
                  error={error}
                  mode="signin"
                  onSwitchToSignup={() => {}}
                />
              )}
            </div>

            {/* Form */}
            {hasToken && !success && (
              <form className="space-y-3" onSubmit={handleSubmit}>
                {/* Password Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">
                    New password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-9"
                  />
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    Confirm new password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className="h-9"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="warning"
                  disabled={loading}
                  className="w-full h-9 text-sm font-medium mt-2"
                >
                  {loading ? (
                    <>
                      <LogoSpinner size="sm" className="mr-2" />
                      Updating password...
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            )}

            {/* Back to login */}
            <div className="mt-6">
              <Button
                type="button"
                onClick={() => navigate({ to: "/login" })}
                variant="ghost"
                disabled={loading}
                className="w-full h-10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
