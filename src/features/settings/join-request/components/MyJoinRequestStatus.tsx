import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  Building2,
  Users,
  User,
} from 'lucide-react';
import {
  useMyPendingJoinRequest,
  useMyJoinRequests,
  useCancelJoinRequest,
} from '@/hooks/join-request';
import type { JoinRequest } from '@/types/join-request.types';

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    variant: 'outline' as const,
    color: 'text-yellow-600',
  },
  approved: {
    icon: CheckCircle2,
    label: 'Approved',
    variant: 'default' as const,
    color: 'text-green-600',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    variant: 'destructive' as const,
    color: 'text-red-600',
  },
  cancelled: {
    icon: Ban,
    label: 'Cancelled',
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
};

function formatUserName(user?: { first_name: string | null; last_name: string | null; email: string | null }) {
  if (!user) return 'Unknown';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.email || 'Unknown';
}

function RequestCard({ request }: { request: JoinRequest }) {
  const cancelRequest = useCancelJoinRequest();
  const config = statusConfig[request.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  const handleCancel = async () => {
    try {
      await cancelRequest.mutateAsync(request.id);
      toast.success('Request cancelled');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to cancel request'
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${config.color}`} />
            Join Request
          </CardTitle>
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* IMO */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">IMO:</span>
          <span className="font-medium">{request.imo?.name || 'Unknown'}</span>
        </div>

        {/* Agency */}
        {request.agency && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Agency:</span>
            <span className="font-medium">{request.agency.name}</span>
          </div>
        )}

        {/* Approver */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Reviewed by:</span>
          <span className="font-medium">{formatUserName(request.approver)}</span>
        </div>

        {/* Message */}
        {request.message && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            "{request.message}"
          </div>
        )}

        {/* Rejection Reason */}
        {request.status === 'rejected' && request.rejection_reason && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            <span className="font-medium">Reason:</span> {request.rejection_reason}
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground">
          Requested: {new Date(request.requested_at).toLocaleDateString()}
          {request.reviewed_at && (
            <> · Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}</>
          )}
        </div>

        {/* Cancel Button */}
        {request.status === 'pending' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelRequest.isPending}
            className="w-full h-7 text-xs"
          >
            {cancelRequest.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Ban className="h-3 w-3 mr-1" />
            )}
            Cancel Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function MyJoinRequestStatus() {
  const { data: pendingRequest, isLoading: pendingLoading } = useMyPendingJoinRequest();
  const { data: allRequests, isLoading: allLoading } = useMyJoinRequests();

  if (pendingLoading || allLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading...
        </CardContent>
      </Card>
    );
  }

  // Show pending request prominently
  if (pendingRequest) {
    return <RequestCard request={pendingRequest} />;
  }

  // Show most recent non-pending request if any
  const recentRequest = allRequests?.find((r) => r.status !== 'pending');
  if (recentRequest) {
    return <RequestCard request={recentRequest} />;
  }

  // No requests
  return null;
}
