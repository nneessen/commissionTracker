// src/features/auth/components/ResetPasswordForm.tsx

import React from "react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {FormErrors} from "../hooks/useAuthValidation";
import {AlertCircle} from "lucide-react";

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

      <Button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-base font-semibold rounded-xl"
      >
        {loading ? "Please wait..." : "Send reset link"}
      </Button>
    </form>
  );
};
