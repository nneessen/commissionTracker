// src/features/settings/agency-request/AgencyRequestPage.tsx
// Main page for agency request workflow - compact zinc styling

import { Building2 } from "lucide-react";
import { usePendingAgencyRequestCount } from "@/hooks/agency-request";
import { RequestAgencySection } from "./components/RequestAgencySection";
import { PendingApprovalsList } from "./components/PendingApprovalsList";

export function AgencyRequestPage() {
  const { data: pendingCount = 0 } = usePendingAgencyRequestCount();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-zinc-400" />
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Agency Requests
            </h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Request to become an agency or manage pending approvals
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Show pending approvals if user has any to approve */}
        {pendingCount > 0 && <PendingApprovalsList />}

        {/* Show request section */}
        <RequestAgencySection />
      </div>
    </div>
  );
}
