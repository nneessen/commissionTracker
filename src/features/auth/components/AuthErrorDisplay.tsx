// src/features/auth/components/AuthErrorDisplay.tsx

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

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
    <Alert variant="destructive" className="animate-fadeIn">
      <AlertCircle className="h-5 w-5" />
      <AlertDescription>
        <p className="text-sm font-medium">{error}</p>
        {mode === "signin" && error.includes("No account found") && (
          <Button
            type="button"
            onClick={onSwitchToSignup}
            variant="link"
            className="mt-2 h-auto p-0 text-sm font-semibold text-destructive hover:text-destructive/80"
          >
            Create a new account
          </Button>
        )}
        {error.includes("disabled") && (
          <a
            href="mailto:support@commissiontracker.com"
            className="mt-2 inline-block text-sm font-semibold text-destructive hover:text-destructive/80 underline transition-colors"
          >
            Contact Support
          </a>
        )}
      </AlertDescription>
    </Alert>
  );
};
