import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Building2,
  User,
  Clock,
  MessageSquare,
} from 'lucide-react';
import {
  usePendingJoinApprovals,
  useApproveJoinRequest,
  useRejectJoinRequest,
} from '@/hooks/join-request';
import type { JoinRequest } from '@/types/join-request.types';

function formatUserName(user?: { first_name: string | null; last_name: string | null; email: string | null }) {
  if (!user) return 'Unknown';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.email || 'Unknown';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface RequestRowProps {
  request: JoinRequest;
  onApprove: (request: JoinRequest) => void;
  onReject: (request: JoinRequest) => void;
}

function RequestRow({ request, onApprove, onReject }: RequestRowProps) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {formatUserName(request.requester)}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {formatDate(request.requested_at)}
        </Badge>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          <span>{request.imo?.name || 'Unknown IMO'}</span>
        </div>
        {request.agency && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{request.agency.name}</span>
          </div>
        )}
      </div>

      {/* Message */}
      {request.message && (
        <div className="flex items-start gap-1 text-xs bg-muted/50 p-2 rounded">
          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="italic">"{request.message}"</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="default"
          className="flex-1 h-7 text-xs"
          onClick={() => onApprove(request)}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-7 text-xs"
          onClick={() => onReject(request)}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}

export function PendingJoinApprovalsList() {
  const { data: requests, isLoading } = usePendingJoinApprovals();
  const approveRequest = useApproveJoinRequest();
  const rejectRequest = useRejectJoinRequest();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (request: JoinRequest) => {
    try {
      await approveRequest.mutateAsync({ request_id: request.id });
      toast.success(`Approved ${formatUserName(request.requester)}'s request`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to approve request'
      );
    }
  };

  const handleRejectClick = (request: JoinRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return;

    try {
      await rejectRequest.mutateAsync({
        request_id: selectedRequest.id,
        reason: rejectionReason.trim() || null,
      });
      toast.success(`Rejected ${formatUserName(selectedRequest.requester)}'s request`);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reject request'
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading pending approvals...
        </CardContent>
      </Card>
    );
  }

  if (!requests?.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pending Join Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          No pending requests to review
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pending Join Requests
            <Badge variant="secondary" className="text-xs ml-auto">
              {requests.length}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Review and approve new user requests to join your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleRejectClick}
            />
          ))}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Reject {formatUserName(selectedRequest?.requester)}'s request to join.
              Optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
