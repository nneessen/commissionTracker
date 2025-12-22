import { Loader2, UserPlus } from 'lucide-react';
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
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5 text-zinc-400" />
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Join Requests
            </h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Request to join an organization
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Show pending approvals if user is an approver */}
        {(pendingCount ?? 0) > 0 && <PendingJoinApprovalsList />}

        {/* Show form if eligible */}
        {eligibility?.canSubmit && <JoinRequestForm />}

        {/* Show current status */}
        <MyJoinRequestStatus />

        {/* Show reason if not eligible and no pending request shown */}
        {!eligibility?.canSubmit && eligibility?.reason && (
          <div className="text-center py-4 text-[11px] text-zinc-500 dark:text-zinc-400">
            {eligibility.reason}
          </div>
        )}
      </div>
    </div>
  );
}
