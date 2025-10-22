// src/features/auth/components/AuthErrorDisplay.tsx

import React from "react";
import { Button } from "@/components/ui/button";

interface AuthErrorDisplayProps {
  error: string;
  mode: "signin" | "signup" | "reset";
  onSwitchToSignup: () => void;
}

export const AuthErrorDisplay: React.FC<AuthErrorDisplayProps> = ({
  error,
  mode,
  onSwitchToSignup,
}) => {
  if (!error) return null;

  return (
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
          {mode === "signin" && error.includes("No account found") && (
            <Button
              type="button"
              onClick={onSwitchToSignup}
              variant="link"
              className="mt-2 h-auto p-0 text-sm font-semibold text-red-700 hover:text-red-600"
            >
              Create a new account
            </Button>
          )}
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
  );
};
