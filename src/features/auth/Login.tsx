// src/features/auth/Login.tsx

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui";
import { SESSION_STORAGE_KEYS } from "../../constants/auth.constants";
import { useAuthValidation, AuthMode } from "./hooks/useAuthValidation";
import { AuthErrorDisplay } from "./components/AuthErrorDisplay";
import { AuthSuccessMessage } from "./components/AuthSuccessMessage";
import { SignInForm } from "./components/SignInForm";
import { SignUpForm } from "./components/SignUpForm";
import { ResetPasswordForm } from "./components/ResetPasswordForm";

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { formErrors, validateForm, clearErrors } = useAuthValidation();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(email, password, confirmPassword, mode)) {
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
    clearErrors();
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
          <AuthSuccessMessage message={message || ""} />

          <AuthErrorDisplay
            error={error || ""}
            mode={mode}
            onSwitchToSignup={() => switchMode("signup")}
          />

          {mode === "signin" && (
            <SignInForm
              email={email}
              password={password}
              loading={loading}
              formErrors={formErrors}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleSubmit}
              onForgotPassword={() => switchMode("reset")}
            />
          )}

          {mode === "signup" && (
            <SignUpForm
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              loading={loading}
              formErrors={formErrors}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onSubmit={handleSubmit}
            />
          )}

          {mode === "reset" && (
            <ResetPasswordForm
              email={email}
              loading={loading}
              formErrors={formErrors}
              onEmailChange={setEmail}
              onSubmit={handleSubmit}
            />
          )}

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
            <Button
              type="button"
              onClick={() => switchMode("signup")}
              variant="link"
              disabled={loading}
              className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 h-auto py-2"
            >
              Create a new account
            </Button>
          )}

          {(mode === "signup" || mode === "reset") && (
            <Button
              type="button"
              onClick={() => switchMode("signin")}
              variant="link"
              disabled={loading}
              className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-500 h-auto py-2"
            >
              Sign in instead
            </Button>
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
