// src/features/settings/agency-request/components/PendingApprovalsList.tsx
// List of pending agency requests awaiting approval

import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Users,
  Inbox,
} from "lucide-react";
import {
  usePendingAgencyRequests,
  useApproveAgencyRequest,
  useRejectAgencyRequest,
} from "@/hooks/agency-request";
import type { AgencyRequest } from "@/types/agency-request.types";
import { formatAgencyRequestDisplayName } from "@/types/agency-request.types";

export function PendingApprovalsList() {
  const { data: pendingRequests, isLoading } = usePendingAgencyRequests();
  const approveRequest = useApproveAgencyRequest();
  const rejectRequest = useRejectAgencyRequest();

  const [selectedRequest, setSelectedRequest] = useState<AgencyRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = (request: AgencyRequest) => {
    setSelectedRequest(request);
    setActionType("approve");
  };

  const handleReject = (request: AgencyRequest) => {
    setSelectedRequest(request);
    setActionType("reject");
    setRejectionReason("");
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      if (actionType === "approve") {
        await approveRequest.mutateAsync(selectedRequest.id);
        toast.success("Agency request approved! New agency has been created.");
      } else {
        await rejectRequest.mutateAsync({
          requestId: selectedRequest.id,
          reason: rejectionReason.trim() || undefined,
        });
        toast.success("Agency request rejected");
      }
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason("");
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${actionType} request`;
      toast.error(message);
    }
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setRejectionReason("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Agency requests from your downline awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending requests</p>
            <p className="text-sm">
              When agents in your downline request agency status, they will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
            <Badge variant="destructive" className="ml-2">
              {pendingRequests.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Review and approve or reject agency requests from your downline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <PendingRequestCard
                key={request.id}
                request={request}
                onApprove={() => handleApprove(request)}
                onReject={() => handleReject(request)}
                isProcessing={
                  (approveRequest.isPending || rejectRequest.isPending) &&
                  selectedRequest?.id === request.id
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Agency Request" : "Reject Agency Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" ? (
                <>
                  This will create a new agency for{" "}
                  <strong>
                    {selectedRequest?.requester
                      ? formatAgencyRequestDisplayName(
                          selectedRequest.requester.first_name,
                          selectedRequest.requester.last_name,
                          selectedRequest.requester.email
                        )
                      : "the requester"}
                  </strong>{" "}
                  and move their downline agents to the new agency.
                </>
              ) : (
                "Provide an optional reason for rejection."
              )}
            </DialogDescription>
          </DialogHeader>

          {actionType === "approve" && selectedRequest && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedRequest.proposed_name}</span>
                <Badge variant="outline">{selectedRequest.proposed_code}</Badge>
              </div>
              {selectedRequest.proposed_description && (
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.proposed_description}
                </p>
              )}
            </div>
          )}

          {actionType === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={approveRequest.isPending || rejectRequest.isPending}
            >
              {(approveRequest.isPending || rejectRequest.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PendingRequestCardProps {
  request: AgencyRequest;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

function PendingRequestCard({
  request,
  onApprove,
  onReject,
  isProcessing,
}: PendingRequestCardProps) {
  const requesterName = request.requester
    ? formatAgencyRequestDisplayName(
        request.requester.first_name,
        request.requester.last_name,
        request.requester.email
      )
    : "Unknown";

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{requesterName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{request.proposed_name}</span>
            <Badge variant="outline" className="text-xs">
              {request.proposed_code}
            </Badge>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(request.requested_at).toLocaleDateString()}
        </span>
      </div>

      {request.proposed_description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {request.proposed_description}
        </p>
      )}

      {request.current_agency && (
        <p className="text-xs text-muted-foreground">
          Currently in: {request.current_agency.name}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isProcessing}
          className="flex-1"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isProcessing}
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
