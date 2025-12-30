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
import { Loader2, ArrowLeft, KeyRound } from "lucide-react";

/**
 * ResetPassword - Handle password reset after user clicks email link
 *
 * This component is accessed when a user clicks the password reset link
 * from their email. It allows them to set a new password.
 */
export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery token in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    if (type === "recovery" && accessToken) {
      setHasToken(true);
      logger.auth("Password recovery token found");
    } else {
      logger.auth("No valid recovery token found");
      setError(
        "Invalid or expired password reset link. Please request a new one.",
      );
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 3000);
    }
  }, [navigate]);

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

  if (!hasToken && !error) {
    return null; // Still checking for token
  }

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
                src="/logos/LetterLogo.png"
                alt="The Standard"
                className="h-12 w-12 invert"
              />
              <span className="text-background text-2xl font-semibold tracking-tight">
                THE STANDARD
              </span>
            </div>
          </div>

          {/* Middle - Main messaging */}
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-background/10 flex items-center justify-center">
              <KeyRound className="h-10 w-10 text-background" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-background leading-tight">
              Secure your
              <br />
              <span className="text-background/70">account.</span>
            </h1>
            <p className="text-background/60 text-lg max-w-md">
              Create a new password to regain access to your agency dashboard
              and continue managing your business.
            </p>
          </div>

          {/* Bottom */}
          <div className="text-background/40 text-sm">
            © {new Date().getFullYear()} The Standard Holdings. All rights
            reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <img
              src="/logos/LetterLogo.png"
              alt="The Standard"
              className="h-10 w-10"
            />
            <span className="text-foreground text-xl font-semibold tracking-tight">
              THE STANDARD
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Reset your password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>

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
            <form className="space-y-4" onSubmit={handleSubmit}>
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
                  className="h-11"
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
                  className="h-11"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm font-medium mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
  );
};
