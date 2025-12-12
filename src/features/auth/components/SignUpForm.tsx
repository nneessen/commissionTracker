// src/features/auth/components/SignUpForm.tsx

import React from "react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {FormErrors} from "../hooks/useAuthValidation";
import {AlertCircle} from "lucide-react";

interface SignUpFormProps {
  email: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  formErrors: FormErrors;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  email,
  password,
  confirmPassword,
  loading,
  formErrors,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) => {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          disabled={loading}
          className={formErrors.email ? "border-destructive" : ""}
        />
        {formErrors.email && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {formErrors.email}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          disabled={loading}
          className={formErrors.password ? "border-destructive" : ""}
        />
        {formErrors.password && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {formErrors.password}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          required
          disabled={loading}
          className={formErrors.confirmPassword ? "border-destructive" : ""}
        />
        {formErrors.confirmPassword && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {formErrors.confirmPassword}
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-base font-semibold rounded-xl"
      >
        {loading ? "Please wait..." : "Create account"}
      </Button>
    </form>
  );
};
