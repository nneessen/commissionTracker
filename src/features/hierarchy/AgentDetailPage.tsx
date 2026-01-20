// src/features/hierarchy/AgentDetailPage.tsx

import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Mail,
  User,
  Phone,
  MapPin,
  FileCheck,
  DollarSign,
  TrendingUp,
  Users,
  Edit,
} from "lucide-react";
import {
  useAgentCommissions,
  useAgentDetails,
  useAgentOverrides,
  useAgentPolicies,
  useTeamComparison,
} from "@/hooks/hierarchy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/services/base/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditAgentModal } from "./components/EditAgentModal";

/** Type for policy objects returned from hierarchyService.getAgentPolicies */
interface AgentPolicy {
  id: string;
  policyNumber: string;
  clientName: string;
  product: string;
  carrier: string;
  annualPremium: number;
  status: string;
  createdAt: string;
  effectiveDate: string;
  issueDate: string;
}

/** Type for commission objects returned from hierarchyService.getAgentCommissions */
interface AgentCommission {
  id: string;
  date: string;
  type: string;
  policyNumber: string;
  amount: number;
  earnedAmount?: number;
  unearnedAmount?: number;
  monthsPaid?: number;
  advanceMonths?: number;
  status: string;
}

export function AgentDetailPage() {
  const { agentId } = useParams({ from: "/hierarchy/agent/$agentId" });
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "policies" | "commissions" | "overrides" | "team"
  >("policies");

  // Fetch comprehensive agent data
  const { data: agentData, isLoading: loadingAgent } = useAgentDetails(
    agentId,
    {
      enabled: !!agentId,
    },
  );

  // A POLICY OBJECT
  //   {
  //     "id": "2e403634-78f7-4799-a53d-c6c32aa66031",
  //     "policyNumber": "A1313395",
  //     "clientName": "JOSEPH MORAN",
  //     "product": "term_life",
  //     "carrier": "Baltimore Life",
  //     "annualPremium": 1534.8,
  //     "status": "pending",
  //     "createdAt": "2026-01-03T16:47:08.79648+00:00",
  //     "effectiveDate": "2026-01-28",
  //     "issueDate": "2026-01-28" is this suppose to be submitDate? are they the same?
  // }

  const { data: policies, isLoading: loadingPolicies } = useAgentPolicies(
    agentId,
    {
      enabled: !!agentId,
    },
  );

  const { data: commissions, isLoading: loadingCommissions } =
    useAgentCommissions(agentId, {
      enabled: !!agentId,
    });

  // Get current user for viewer override calculations
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: overrides } = useAgentOverrides(agentId, {
    enabled: !!agentId,
    viewerId: currentUser?.id,
  });

  const { data: teamComparison } = useTeamComparison(agentId, {
    enabled: !!agentId,
  });

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading agent details...
        </div>
      </div>
    );
  }

  if (!agentData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <AlertCircle className="h-6 w-6 text-zinc-400" />
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Agent not found
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => navigate({ to: "/hierarchy" })}
        >
          Back to Team
        </Button>
      </div>
    );
  }

  // Calculate additional metrics
  const policyList = policies?.policies || [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const mtdPolicies = policyList.filter((p: AgentPolicy) => {
    const pDate = new Date(p.createdAt);
    return (
      pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear
    );
  });

  const ytdPolicies = policyList.filter((p: AgentPolicy) => {
    const pDate = new Date(p.createdAt);
    return pDate.getFullYear() === currentYear;
  });

  const mtdMetrics = {
    policies: mtdPolicies.length,
    premium: mtdPolicies.reduce(
      (sum: number, p: AgentPolicy) => sum + (p.annualPremium || 0),
      0,
    ),
  };

  const ytdMetrics = {
    policies: ytdPolicies.length,
    premium: ytdPolicies.reduce(
      (sum: number, p: AgentPolicy) => sum + (p.annualPremium || 0),
      0,
    ),
  };

  const commissionMetrics = {
    advances: commissions?.advances || 0,
    earned: commissions?.totalEarned || 0,
    unearned: commissions?.unearned || 0,
    chargebacks: commissions?.chargebacks || 0,
  };

  const agentOverrideEarnings = {
    mtd: overrides?.agentEarnings?.mtd || overrides?.mtd || 0,
    ytd: overrides?.agentEarnings?.ytd || overrides?.ytd || 0,
  };

  const viewerEarningsFromAgent = {
    mtd: overrides?.viewerEarningsFromAgent?.mtd || 0,
    ytd: overrides?.viewerEarningsFromAgent?.ytd || 0,
  };

  const agentName =
    agentData.first_name && agentData.last_name
      ? `${agentData.first_name} ${agentData.last_name}`
      : agentData.email;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/hierarchy" })}
            className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Agent info inline */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {agentName}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-0.5">
                  <Mail className="h-2.5 w-2.5" />
                  {agentData.email}
                </span>
                {agentData.phone && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-600">|</span>
                    <span className="flex items-center gap-0.5">
                      <Phone className="h-2.5 w-2.5" />
                      {agentData.phone}
                    </span>
                  </>
                )}
                {agentData.state && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-600">|</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {agentData.state}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 border-zinc-300 dark:border-zinc-600"
            >
              Level {agentData.contract_level || 80}%
            </Badge>
            {agentData.approval_status === "approved" ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] h-5 px-1.5">
                Active
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 text-[10px] h-5 px-1.5">
                {agentData.approval_status}
              </Badge>
            )}
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <FileCheck className="h-3 w-3 text-zinc-400" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {mtdMetrics.policies}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">MTD</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {formatCurrency(mtdMetrics.premium)}
              </span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {ytdMetrics.policies}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">YTD</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400"
            onClick={() =>
              toast.success(
                `Message feature coming soon for ${agentData.email}`,
              )
            }
          >
            <Mail className="h-3 w-3 mr-1" />
            Message
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Compact tabs */}
      <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5 w-fit">
        <button
          onClick={() => setActiveTab("policies")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
            activeTab === "policies"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          <FileCheck className="h-3.5 w-3.5" />
          Policies
        </button>
        <button
          onClick={() => setActiveTab("commissions")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
            activeTab === "commissions"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Commissions
        </button>
        <button
          onClick={() => setActiveTab("overrides")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
            activeTab === "overrides"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Overrides
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-all",
            activeTab === "team"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Team
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {/* Policies Tab */}
        {activeTab === "policies" && (
          <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Policy #
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Client
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Product
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Carrier
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Effective
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                    Premium
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPolicies ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-8"
                    >
                      Loading policies...
                    </TableCell>
                  </TableRow>
                ) : policyList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-8"
                    >
                      No policies found
                    </TableCell>
                  </TableRow>
                ) : (
                  policyList.map((policy: AgentPolicy) => (
                    <TableRow
                      key={policy.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                    >
                      <TableCell className="py-1.5 text-[11px] font-mono text-zinc-900 dark:text-zinc-100">
                        {policy.policyNumber}
                      </TableCell>
                      <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100">
                        {policy.clientName}
                      </TableCell>
                      <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100">
                        {policy.product}
                      </TableCell>
                      <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100">
                        {policy.carrier}
                      </TableCell>
                      <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100">
                        {formatDate(policy.issueDate)}
                      </TableCell>
                      <TableCell className="py-1.5 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 text-right">
                        {formatCurrency(policy.annualPremium)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-4 px-1",
                            policy.status === "active" &&
                              "text-emerald-600 border-emerald-300 dark:border-emerald-700",
                            policy.status === "lapsed" &&
                              "text-yellow-600 border-yellow-300 dark:border-yellow-700",
                            policy.status === "cancelled" &&
                              "text-red-600 border-red-300 dark:border-red-700",
                          )}
                        >
                          {policy.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === "commissions" && (
          <div className="space-y-2">
            {/* Inline commission stats header */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Advances:
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(commissionMetrics.advances)}
                  </span>
                </div>
                <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Earned:
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(commissionMetrics.earned)}
                  </span>
                </div>
                <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Unearned:
                  </span>
                  <span className="font-semibold text-yellow-600">
                    {formatCurrency(commissionMetrics.unearned)}
                  </span>
                </div>
                <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Chargebacks:
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(commissionMetrics.chargebacks)}
                  </span>
                </div>
              </div>
            </div>

            {/* Commission table */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <Table>
                <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                  <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Date
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Type
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Policy
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                      Advance
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                      Earned
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                      Unearned
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-center">
                      Progress
                    </TableHead>
                    <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCommissions ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-8"
                      >
                        Loading commissions...
                      </TableCell>
                    </TableRow>
                  ) : !commissions?.recent ||
                    commissions.recent.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-8"
                      >
                        No commissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    commissions.recent.map((commission: AgentCommission) => (
                      <TableRow
                        key={commission.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                      >
                        <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100">
                          {formatDate(commission.date)}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100 capitalize">
                          {commission.type}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] font-mono text-zinc-900 dark:text-zinc-100">
                          {commission.policyNumber}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 text-right">
                          {formatCurrency(commission.amount)}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] font-semibold text-emerald-600 text-right">
                          {formatCurrency(commission.earnedAmount || 0)}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] text-yellow-600 text-right">
                          {formatCurrency(commission.unearnedAmount || 0)}
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
                          {commission.monthsPaid || 0}/
                          {commission.advanceMonths || 9} mo
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] h-4 px-1",
                              commission.status === "paid" &&
                                "text-emerald-600 border-emerald-300 dark:border-emerald-700",
                              commission.status === "pending" &&
                                "text-yellow-600 border-yellow-300 dark:border-yellow-700",
                            )}
                          >
                            {commission.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Overrides Tab */}
        {activeTab === "overrides" && (
          <div className="space-y-2">
            {/* Inline override stats header */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Their MTD Earnings:
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(agentOverrideEarnings.mtd)}
                  </span>
                </div>
                <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Their YTD Earnings:
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(agentOverrideEarnings.ytd)}
                  </span>
                </div>
                {/* Show viewer's overrides from this agent if not viewing own profile */}
                {currentUser?.id !== agentId && (
                  <>
                    <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Your MTD from them:
                      </span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(viewerEarningsFromAgent.mtd)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Two-column layout for override details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Agent's Override Earnings from Downlines */}
              <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
                <h4 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                  Their Override Earnings
                </h4>
                {agentOverrideEarnings.mtd > 0 ||
                agentOverrideEarnings.ytd > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        MTD Override Income:
                      </span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(agentOverrideEarnings.mtd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        YTD Override Income:
                      </span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(agentOverrideEarnings.ytd)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-2">
                    No override earnings yet
                  </p>
                )}
              </div>

              {/* Your Overrides from This Agent (only if not viewing own profile) */}
              {currentUser?.id !== agentId && (
                <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
                  <h4 className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                    Your Overrides from This Agent
                  </h4>
                  {viewerEarningsFromAgent.mtd > 0 ||
                  viewerEarningsFromAgent.ytd > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          MTD Override Income:
                        </span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(viewerEarningsFromAgent.mtd)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          YTD Override Income:
                        </span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(viewerEarningsFromAgent.ytd)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-2">
                      No overrides from this agent yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-2">
            {teamComparison?.directReports?.length > 0 ? (
              <>
                {/* Inline team stats header */}
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-zinc-400" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {teamComparison.totalMembers}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        direct reports
                      </span>
                    </div>
                    <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-1">
                      <FileCheck className="h-3 w-3 text-zinc-400" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {teamComparison.totalPolicies}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        team policies
                      </span>
                    </div>
                    <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-500" />
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(teamComparison.totalPremium)}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        team premium
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team table */}
                <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <Table>
                    <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                      <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                        <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                          Agent
                        </TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                          Level
                        </TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                          Policies
                        </TableHead>
                        <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 text-right">
                          Premium
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamComparison.directReports.map(
                        (member: {
                          id: string;
                          name: string;
                          email: string;
                          contractLevel: number;
                          policies: number;
                          premium: number;
                        }) => (
                          <TableRow
                            key={member.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                          >
                            <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100">
                              {member.name}
                            </TableCell>
                            <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100 text-right">
                              {member.contractLevel}%
                            </TableCell>
                            <TableCell className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100 text-right">
                              {member.policies}
                            </TableCell>
                            <TableCell className="py-1.5 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 text-right">
                              {formatCurrency(member.premium)}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-center">
                <Users className="h-5 w-5 text-zinc-400 mx-auto mb-2" />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  No direct reports
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Agent Modal */}
      <EditAgentModal
        agent={agentData}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
