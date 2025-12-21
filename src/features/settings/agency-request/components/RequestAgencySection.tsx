// src/features/settings/agency-request/components/RequestAgencySection.tsx
// Section showing request form or current request status

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useCanRequestAgency, useMyAgencyRequests } from "@/hooks/agency-request";
import { RequestAgencyForm } from "./RequestAgencyForm";
import { MyAgencyRequestStatus } from "./MyAgencyRequestStatus";
import { Skeleton } from "@/components/ui/skeleton";

export function RequestAgencySection() {
  const { data: eligibility, isLoading: isCheckingEligibility } = useCanRequestAgency();
  const { data: myRequests, isLoading: isLoadingRequests } = useMyAgencyRequests();

  const isLoading = isCheckingEligibility || isLoadingRequests;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the most recent request
  const latestRequest = myRequests?.[0];
  const hasPendingRequest = latestRequest?.status === "pending";
  const hasApprovedRequest = latestRequest?.status === "approved";
  const hasRejectedRequest = latestRequest?.status === "rejected";

  // If user has an approved request, show success
  if (hasApprovedRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Agency Created
          </CardTitle>
          <CardDescription>
            Your agency request was approved and your agency has been created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MyAgencyRequestStatus request={latestRequest} />
        </CardContent>
      </Card>
    );
  }

  // If user has a pending request, show status
  if (hasPendingRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            Request Pending
          </CardTitle>
          <CardDescription>
            Your agency request is waiting for approval from your upline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MyAgencyRequestStatus request={latestRequest} />
        </CardContent>
      </Card>
    );
  }

  // If user has a rejected request, show rejection with option to re-request
  if (hasRejectedRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Request Rejected
          </CardTitle>
          <CardDescription>
            Your previous request was rejected. You may submit a new request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MyAgencyRequestStatus request={latestRequest} />
          {eligibility?.canRequest && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Submit New Request</h4>
              <RequestAgencyForm />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // If user can request, show form
  if (eligibility?.canRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Request Agency Status
          </CardTitle>
          <CardDescription>
            Submit a request to become an agency. Your direct upline will review and approve your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestAgencyForm />
        </CardContent>
      </Card>
    );
  }

  // User cannot request - show reason
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Agency Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot Request Agency Status</AlertTitle>
          <AlertDescription>
            {eligibility?.reason || "You are not eligible to request agency status at this time."}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
