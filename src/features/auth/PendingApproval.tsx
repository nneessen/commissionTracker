// src/features/auth/PendingApproval.tsx
// Shows pending users the join request form or their request status

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/services/base/supabase";
import { useNavigate } from "@tanstack/react-router";
import {
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Building2,
  Users,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  useJoinRequestEligibility,
  useMyPendingJoinRequest,
} from "@/hooks/join-request";
import { JoinRequestForm } from "@/features/settings/join-request/components/JoinRequestForm";

interface PendingApprovalProps {
  email?: string;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ email }) => {
  const navigate = useNavigate();
  const { data: eligibility, isLoading: eligibilityLoading } = useJoinRequestEligibility();
  const { data: pendingRequest, isLoading: requestLoading, refetch } = useMyPendingJoinRequest();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const isLoading = eligibilityLoading || requestLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-md w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xl font-bold mb-3 shadow-lg">
            CT
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Complete Your Setup
          </h1>
          {email && (
            <p className="text-sm text-zinc-500 mt-1">
              Signed in as <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-zinc-400" />
              <p className="text-sm text-zinc-500">Loading...</p>
            </CardContent>
          </Card>
        )}

        {/* Has Pending Request - Show Status */}
        {!isLoading && pendingRequest && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Request Pending
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Awaiting Approval
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Your request to join has been submitted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* IMO */}
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-zinc-400" />
                <span className="text-zinc-500">IMO:</span>
                <span className="font-medium">{pendingRequest.imo?.name || 'Unknown'}</span>
              </div>

              {/* Agency */}
              {pendingRequest.agency && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-500">Agency:</span>
                  <span className="font-medium">{pendingRequest.agency.name}</span>
                </div>
              )}

              {/* Message */}
              {pendingRequest.message && (
                <div className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
                  "{pendingRequest.message}"
                </div>
              )}

              <Separator />

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span>An administrator will review your request shortly</span>
                </div>
                <p className="text-xs text-zinc-500">
                  You'll get access once approved. Check back later or wait for notification.
                </p>
              </div>

              <div className="text-xs text-zinc-400 text-center">
                Submitted: {new Date(pendingRequest.requested_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Has Rejected Request */}
        {!isLoading && !pendingRequest && !eligibility?.canSubmit && eligibility?.reason?.includes('rejected') && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="py-6 text-center space-y-3">
              <XCircle className="h-10 w-10 text-red-500 mx-auto" />
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">Request Rejected</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Your previous request was not approved. Contact support for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Can Submit Request - Show Form */}
        {!isLoading && eligibility?.canSubmit && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Request to Join an Organization</CardTitle>
                <CardDescription className="text-xs">
                  Select an IMO to join. Your request will be reviewed by an administrator.
                </CardDescription>
              </CardHeader>
            </Card>
            <JoinRequestForm onSuccess={() => refetch()} />
          </>
        )}

        {/* Already Approved - Shouldn't normally see this */}
        {!isLoading && !pendingRequest && !eligibility?.canSubmit && eligibility?.reason?.includes('already approved') && (
          <Card>
            <CardContent className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">You're Approved!</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Your account is ready. Redirecting...
                </p>
              </div>
              <Button onClick={() => navigate({ to: "/" })} className="mt-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sign Out */}
        <div className="pt-2">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full text-zinc-500 hover:text-zinc-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Help */}
        <p className="text-center text-xs text-zinc-400">
          Questions? Contact support at nick@nickneessen.com
        </p>
      </div>
    </div>
  );
};
