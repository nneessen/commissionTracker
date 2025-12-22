// src/features/settings/agency-request/AgencyRequestPage.tsx
// Main page for agency request workflow

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardCheck } from "lucide-react";
import { usePendingAgencyRequestCount } from "@/hooks/agency-request";
import { RequestAgencySection } from "./components/RequestAgencySection";
import { PendingApprovalsList } from "./components/PendingApprovalsList";

export function AgencyRequestPage() {
  const { data: pendingCount = 0 } = usePendingAgencyRequestCount();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Agency Requests</h2>
        <p className="text-sm text-muted-foreground">
          Request to become an agency or manage pending approval requests
        </p>
      </div>

      <Tabs defaultValue="my-request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-request" className="gap-2">
            <Building2 className="h-4 w-4" />
            My Request
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Pending Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-request">
          <RequestAgencySection />
        </TabsContent>

        <TabsContent value="approvals">
          <PendingApprovalsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
