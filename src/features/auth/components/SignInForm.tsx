// src/features/auth/components/SignInForm.tsx
// TODO: label type issue in Input component

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormErrors } from "../hooks/useAuthValidation";

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
    <form className="space-y-5" onSubmit={onSubmit}>
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        error={formErrors.email}
        required
        disabled={loading}
        className="w-full"
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        error={formErrors.password}
        required
        disabled={loading}
        className="w-full"
      />

      <div className="flex items-center justify-end">
        <Button
          type="button"
          onClick={onForgotPassword}
          variant="link"
          disabled={loading}
          className="h-auto p-0 text-sm font-medium"
        >
          Forgot your password?
        </Button>
      </div>

      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        className="w-full py-3 text-base font-semibold rounded-xl"
      >
        {loading ? "Please wait..." : "Sign in"}
      </Button>
    </form>
  );
};
