// src/features/auth/Login.tsx

import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { SESSION_STORAGE_KEYS } from "../../constants/auth.constants";
import { AuthErrorDisplay } from "./components/AuthErrorDisplay";
import { AuthSuccessMessage } from "./components/AuthSuccessMessage";
import { SignInForm } from "./components/SignInForm";
import { ResetPasswordForm } from "./components/ResetPasswordForm";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Info, Shield, TrendingUp, Users } from "lucide-react";

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const formErrors = {};
  const validateForm = (
    _email: string,
    _password: string,
    _confirmPassword: string,
    _mode: string,
  ) => true;
  const clearErrors = () => {};
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(email, password, "", mode)) {
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        onSuccess?.();
      } else if (mode === "reset") {
        await resetPassword(email);
        setMessage("Password reset email sent! Check your inbox.");
        setTimeout(() => setMode("signin"), 3000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      const errorLower = errorMessage.toLowerCase();

      if (
        errorLower.includes("email not confirmed") ||
        errorLower.includes("email not verified")
      ) {
        setError("Please verify your email before signing in.");
        sessionStorage.setItem(SESSION_STORAGE_KEYS.VERIFICATION_EMAIL, email);
        setTimeout(() => {
          navigate({
            to: "/auth/verify-email",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- router state type
          } as any);
        }, 1500);
      } else if (
        mode === "signin" &&
        (errorLower.includes("invalid login credentials") ||
          errorLower.includes("invalid email or password") ||
          errorLower.includes("email not found"))
      ) {
        setError("No account found or incorrect password. ");
      } else if (
        errorLower.includes("user is disabled") ||
        errorLower.includes("account has been disabled") ||
        errorLower.includes("account suspended")
      ) {
        setError(
          "Your account has been disabled. Please contact support for assistance.",
        );
      } else if (
        errorLower.includes("rate limit") ||
        errorLower.includes("too many requests") ||
        errorLower.includes("email rate limit exceeded")
      ) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (
        errorLower.includes("network") ||
        errorLower.includes("fetch failed") ||
        errorLower.includes("failed to fetch") ||
        errorLower.includes("networkerror")
      ) {
        setError("Connection error. Please check your internet and try again.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: "signin" | "reset") => {
    setMode(newMode);
    setError(null);
    setMessage(null);
    clearErrors();
    setPassword("");
  };

  const getTitle = () => {
    switch (mode) {
      case "reset":
        return "Reset password";
      default:
        return "Welcome back";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "reset":
        return "Enter your email and we'll send you a reset link";
      default:
        return "Sign in to your agency dashboard";
    }
  };

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

        {/* Diagonal accent lines */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-10">
          <div className="absolute top-20 right-0 w-[600px] h-px bg-gradient-to-l from-background via-background/50 to-transparent rotate-[-35deg] origin-right" />
          <div className="absolute top-40 right-0 w-[500px] h-px bg-gradient-to-l from-background via-background/30 to-transparent rotate-[-35deg] origin-right" />
          <div className="absolute top-60 right-0 w-[400px] h-px bg-gradient-to-l from-background via-background/20 to-transparent rotate-[-35deg] origin-right" />
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
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold text-background leading-tight mb-4">
                Your agency,
                <br />
                <span className="text-background/70">fully optimized.</span>
              </h1>
              <p className="text-background/60 text-lg max-w-md">
                Track commissions, manage recruits, and grow your insurance
                business with powerful analytics and automation.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid gap-4 max-w-md">
              <div className="flex items-center gap-4 text-background/80">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background/10">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-sm">
                  Real-time commission tracking & forecasting
                </span>
              </div>
              <div className="flex items-center gap-4 text-background/80">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background/10">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-sm">
                  Complete recruiting pipeline management
                </span>
              </div>
              <div className="flex items-center gap-4 text-background/80">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background/10">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-sm">Secure, role-based team access</span>
              </div>
            </div>
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
              {getTitle()}
            </h2>
            <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-6">
            <AuthSuccessMessage message={message || ""} />
            <AuthErrorDisplay
              error={error || ""}
              mode={mode}
              onSwitchToSignup={() => {}}
            />
          </div>

          {/* Forms */}
          {mode === "signin" && (
            <>
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

              <Alert className="mt-6 border-muted bg-muted/30">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-muted-foreground">
                  This system is invitation-only. Contact your manager for
                  access.
                </AlertDescription>
              </Alert>
            </>
          )}

          {mode === "reset" && (
            <>
              <ResetPasswordForm
                email={email}
                loading={loading}
                formErrors={formErrors}
                onEmailChange={setEmail}
                onSubmit={handleSubmit}
              />

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-background text-muted-foreground">
                      Remember your password?
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => switchMode("signin")}
                  variant="ghost"
                  disabled={loading}
                  className="w-full mt-4 text-sm font-medium"
                >
                  Back to sign in
                </Button>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              to="/terms"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
