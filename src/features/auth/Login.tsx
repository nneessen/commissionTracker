// src/features/auth/Login.tsx

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Button, Input } from "../../components/ui";
import { SESSION_STORAGE_KEYS } from "../../constants/auth.constants";

interface LoginProps {
  onSuccess?: () => void;
}

type AuthMode = "signin" | "signup" | "reset";

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Email validation
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (mode !== "reset") {
      if (!password) {
        errors.password = "Password is required";
      } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }

      // Confirm password validation (signup only)
      if (mode === "signup") {
        if (!confirmPassword) {
          errors.confirmPassword = "Please confirm your password";
        } else if (password !== confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        onSuccess?.();
      } else if (mode === "signup") {
        const result = await signUp(email, password);

        if (result.requiresVerification) {
          // Store email in sessionStorage for verification screen
          sessionStorage.setItem(
            SESSION_STORAGE_KEYS.VERIFICATION_EMAIL,
            result.email,
          );

          // Navigate to verification screen
          navigate({
            to: "/auth/verify-email",
          } as any); // Type assertion needed for router state
        } else {
          // Auto-confirm is enabled, user is logged in
          setMessage("Account created successfully!");
          onSuccess?.();
        }
      } else if (mode === "reset") {
        await resetPassword(email);
        setMessage("Password reset email sent! Check your inbox.");
        // Switch back to signin mode after a delay
        setTimeout(() => setMode("signin"), 3000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      const errorLower = errorMessage.toLowerCase();

      // 1. Email not confirmed/verified (High Priority)
      if (
        errorLower.includes("email not confirmed") ||
        errorLower.includes("email not verified")
      ) {
        setError("Please verify your email before signing in.");
        // Store email for verification screen
        sessionStorage.setItem(SESSION_STORAGE_KEYS.VERIFICATION_EMAIL, email);
        // Redirect to verification page
        setTimeout(() => {
          navigate({
            to: "/auth/verify-email",
          } as any); // Type assertion needed for router state
        }, 1500);
      }

      // 2. Invalid credentials - user not found or wrong password (High Priority)
      // Security best practice: Same message for both cases
      else if (
        mode === "signin" &&
        (errorLower.includes("invalid login credentials") ||
          errorLower.includes("invalid email or password") ||
          errorLower.includes("email not found"))
      ) {
        setError("No account found or incorrect password. ");
      }

      // 3. Account disabled/suspended (Medium Priority)
      else if (
        errorLower.includes("user is disabled") ||
        errorLower.includes("account has been disabled") ||
        errorLower.includes("account suspended")
      ) {
        setError(
          "Your account has been disabled. Please contact support for assistance.",
        );
      }

      // 4. Rate limiting (Medium Priority)
      else if (
        errorLower.includes("rate limit") ||
        errorLower.includes("too many requests") ||
        errorLower.includes("email rate limit exceeded")
      ) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      }

      // 5. Network/Connection errors (Medium Priority)
      else if (
        errorLower.includes("network") ||
        errorLower.includes("fetch failed") ||
        errorLower.includes("failed to fetch") ||
        errorLower.includes("networkerror")
      ) {
        setError("Connection error. Please check your internet and try again.");
      }

      // 6. Password requirements (Signup only)
      else if (
        mode === "signup" &&
        errorLower.includes("password") &&
        (errorLower.includes("weak") ||
          errorLower.includes("requirements") ||
          errorLower.includes("too short"))
      ) {
        setError(
          "Password must be at least 6 characters with a mix of letters and numbers.",
        );
      }

      // 7. Generic fallback
      else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setMessage(null);
    setFormErrors({});
    setPassword("");
    setConfirmPassword("");
  };

  const getTitle = () => {
    switch (mode) {
      case "signup":
        return "Create your account";
      case "reset":
        return "Reset your password";
      default:
        return "Welcome back";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "signup":
        return "Start tracking your commissions today";
      case "reset":
        return "Enter your email and we'll send you a reset link";
      default:
        return "Sign in to continue to your dashboard";
    }
  };

  const getButtonText = () => {
    if (loading) return "Please wait...";
    switch (mode) {
      case "signup":
        return "Create account";
      case "reset":
        return "Send reset link";
      default:
        return "Sign in";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg">
            CT
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h2>
          <p className="text-sm text-gray-600">{getSubtitle()}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Success Message */}
          {message && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="ml-3 text-sm font-medium text-green-800">
                  {message}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 animate-fadeIn">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  {/* Show "Create account" button for invalid credentials */}
                  {mode === "signin" && error.includes("No account found") && (
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="mt-2 text-sm font-semibold text-red-700 hover:text-red-600 underline transition-colors"
                    >
                      Create a new account
                    </button>
                  )}
                  {/* Show support link for disabled accounts */}
                  {error.includes("disabled") && (
                    <a
                      href="mailto:support@commissiontracker.com"
                      className="mt-2 inline-block text-sm font-semibold text-red-700 hover:text-red-600 underline transition-colors"
                    >
                      Contact Support
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Input DO NOT CHANGE THE onChange PROP */}
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={formErrors.email}
              required
              disabled={loading}
              className="w-full"
            />

            {/* Password Input DO NOT CHANGE the onChange prop */}
            {mode !== "reset" && (
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={formErrors.password}
                required
                disabled={loading}
                className="w-full"
              />
            )}

            {/* Confirm Password Input (signup only) */}
            {mode === "signup" && (
              <Input
                label="Confirm password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(value) => setConfirmPassword(String(value))}
                error={formErrors.confirmPassword}
                required
                disabled={loading}
                className="w-full"
              />
            )}

            {/* Forgot Password Link (signin only) */}
            {mode === "signin" && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {getButtonText()}
            </Button>
          </form>

          {/* Mode Switcher */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                {mode === "signin" && "Don't have an account?"}
                {mode === "signup" && "Already have an account?"}
                {mode === "reset" && "Remember your password?"}
              </span>
            </div>
          </div>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors py-2"
              disabled={loading}
            >
              Create a new account
            </button>
          )}

          {(mode === "signup" || mode === "reset") && (
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors py-2"
              disabled={loading}
            >
              Sign in instead
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
