// /home/nneessen/projects/commissionTracker/src/features/auth/PendingApproval.tsx

import React from "react";
import {Button} from "../../components/ui";
import {Card, CardContent} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {supabase} from "../../services/base/supabase";
import {useNavigate} from "@tanstack/react-router";

export const PendingApproval: React.FC<{ email?: string }> = ({ email }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4 shadow-lg">
            CT
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Account Pending Approval
          </h2>
          <p className="text-sm text-muted-foreground">
            Your account is awaiting administrator approval
          </p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-base text-foreground font-medium">
                Thank you for signing up!
              </p>
              {email && (
                <p className="text-sm text-muted-foreground">
                  Account: <span className="font-semibold text-foreground">{email}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Your account has been created successfully, but requires approval from an administrator before you can access the application.
              </p>
              <p className="text-sm text-muted-foreground">
                You will receive an email notification once your account has been approved.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">
                  What's next?
                </span>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p>• An administrator will review your account shortly</p>
              <p>• You'll receive an email once approved</p>
              <p>• Check back later or wait for the notification</p>
            </div>

            <Button
              type="button"
              onClick={handleSignOut}
              variant="outline"
              className="w-full text-center text-sm font-medium py-3 rounded-xl"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Questions? Contact support at nick@nickneessen.com
        </p>
      </div>
    </div>
  );
};
