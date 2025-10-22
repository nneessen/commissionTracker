// src/features/auth/components/ResetPasswordForm.tsx
// TODO: label type issue in Input component

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormErrors } from "../hooks/useAuthValidation";

interface ResetPasswordFormProps {
  email: string;
  loading: boolean;
  formErrors: FormErrors;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  email,
  loading,
  formErrors,
  onEmailChange,
  onSubmit,
}) => {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Input
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(value) => onEmailChange(String(value))}
        error={formErrors.email}
        required
        disabled={loading}
        className="w-full"
      />

      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        className="w-full py-3 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
      >
        {loading ? "Please wait..." : "Send reset link"}
      </Button>
    </form>
  );
};
