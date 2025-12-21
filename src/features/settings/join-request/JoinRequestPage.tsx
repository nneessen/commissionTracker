import { Loader2, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useJoinRequestEligibility, usePendingJoinApprovalCount } from '@/hooks/join-request';
import {
  JoinRequestForm,
  MyJoinRequestStatus,
  PendingJoinApprovalsList,
} from './components';

/**
 * Join Request Page
 *
 * Shows different content based on user state:
 * - If user can submit a request: shows the form
 * - If user has a pending/recent request: shows status
 * - If user is an approver: shows pending approvals
 */
export function JoinRequestPage() {
  const { data: eligibility, isLoading: eligibilityLoading } = useJoinRequestEligibility();
  const { data: pendingCount } = usePendingJoinApprovalCount();

  if (eligibilityLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Join Requests</h2>
      </div>

      {/* Show pending approvals if user is an approver */}
      {(pendingCount ?? 0) > 0 && <PendingJoinApprovalsList />}

      {/* Show form if eligible */}
      {eligibility?.canSubmit && <JoinRequestForm />}

      {/* Show current status */}
      <MyJoinRequestStatus />

      {/* Show reason if not eligible and no pending request shown */}
      {!eligibility?.canSubmit && eligibility?.reason && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {eligibility.reason}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
