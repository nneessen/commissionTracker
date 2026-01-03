import React from "react";
import { Button } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "@tanstack/react-router";

interface PermissionDeniedProps {
  message?: string;
  showBackButton?: boolean;
}

/**
 * PermissionDenied component
 * Shows when a user lacks the required permission to access a page
 * This is distinct from DeniedAccess which is for approval denial
 */
export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  message,
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4 shadow-lg">
            CT
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Permission Denied
          </h2>
          <p className="text-sm text-muted-foreground">
            You don't have access to this page
          </p>
        </div>

        <Card className="shadow-xl border-warning/30">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-warning/10 text-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-base text-foreground font-medium">
                Insufficient Permissions
              </p>
              <p className="text-sm text-muted-foreground">
                {message ||
                  "You do not have the required permissions to access this page. If you believe this is an error, please contact your administrator."}
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">
                  Need access?
                </span>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p>
                If you need access to this page, please contact your
                administrator to request the necessary permissions.
              </p>
              <p className="font-semibold text-foreground">
                Contact: nickneessen@thestandardhq.com
              </p>
            </div>

            {showBackButton && (
              <Button
                type="button"
                onClick={handleBackToDashboard}
                variant="outline"
                className="w-full text-center text-sm font-medium py-3 rounded-xl"
              >
                Back to Dashboard
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Questions? Contact support at nickneessen@thestandardhq.com
        </p>
      </div>
    </div>
  );
};
