// src/features/auth/components/AuthSuccessMessage.tsx

import React from "react";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {CheckCircle} from "lucide-react";

interface AuthSuccessMessageProps {
  message: string;
}

export const AuthSuccessMessage: React.FC<AuthSuccessMessageProps> = ({
  message,
}) => {
  if (!message) return null;

  return (
    <Alert className="bg-status-active-bg border-status-active animate-fadeIn">
      <CheckCircle className="h-5 w-5 text-status-active" />
      <AlertDescription className="text-sm font-medium text-status-active">
        {message}
      </AlertDescription>
    </Alert>
  );
};
