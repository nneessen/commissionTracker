// src/features/settings/agency-request/components/MyAgencyRequestStatus.tsx
// Shows the status of a user's agency request

import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, XCircle, Clock, CheckCircle2, Building2 } from "lucide-react";
import { useCancelAgencyRequest } from "@/hooks/agency-request";
import type { AgencyRequest } from "@/types/agency-request.types";
import { formatAgencyRequestDisplayName } from "@/types/agency-request.types";

interface MyAgencyRequestStatusProps {
  request: AgencyRequest;
}

export function MyAgencyRequestStatus({ request }: MyAgencyRequestStatusProps) {
  const cancelRequest = useCancelAgencyRequest();

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this request?")) {
      return;
    }

    try {
      await cancelRequest.mutateAsync(request.id);
      toast.success("Request cancelled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel request";
      toast.error(message);
    }
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{request.status}</Badge>;
    }
  };

  const approverName = request.approver
    ? formatAgencyRequestDisplayName(
        request.approver.first_name,
        request.approver.last_name,
        request.approver.email
      )
    : "Unknown";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{request.proposed_name}</span>
            <span className="text-sm text-muted-foreground">({request.proposed_code})</span>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Submitted:</span>
          <p className="font-medium">
            {new Date(request.requested_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Approver:</span>
          <p className="font-medium">{approverName}</p>
        </div>
        {request.reviewed_at && (
          <div>
            <span className="text-muted-foreground">Reviewed:</span>
            <p className="font-medium">
              {new Date(request.reviewed_at).toLocaleDateString()}
            </p>
          </div>
        )}
        {request.created_agency && (
          <div>
            <span className="text-muted-foreground">Agency Created:</span>
            <p className="font-medium">{request.created_agency.name}</p>
          </div>
        )}
      </div>

      {request.proposed_description && (
        <div className="text-sm">
          <span className="text-muted-foreground">Description:</span>
          <p className="mt-1">{request.proposed_description}</p>
        </div>
      )}

      {request.status === "rejected" && request.rejection_reason && (
        <div className="p-3 bg-red-50 rounded-md text-sm">
          <span className="text-red-700 font-medium">Rejection Reason:</span>
          <p className="text-red-600 mt-1">{request.rejection_reason}</p>
        </div>
      )}

      {request.status === "pending" && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelRequest.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {cancelRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Request
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
