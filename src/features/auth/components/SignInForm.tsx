// src/features/auth/components/SignInForm.tsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormErrors } from "../hooks/useAuthValidation";
import { AlertCircle, Loader2 } from "lucide-react";

interface SignInFormProps {
  email: string;
  password: string;
  loading: boolean;
  formErrors: FormErrors;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  email,
  password,
  loading,
  formErrors,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgotPassword,
}) => {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
          className={`h-9 ${formErrors.email ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
        />
        {formErrors.email && (
          <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formErrors.email}</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Button
            type="button"
            onClick={onForgotPassword}
            variant="link"
            disabled={loading}
            className="h-auto p-0 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Button>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
          className={`h-9 ${formErrors.password ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
        />
        {formErrors.password && (
          <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formErrors.password}</span>
          </div>
        )}
      </div>

      <Button
        type="submit"
        variant="warning"
        disabled={loading}
        className="w-full h-9 text-sm font-medium mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
};
