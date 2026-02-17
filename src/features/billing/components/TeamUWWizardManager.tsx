// src/features/billing/components/TeamUWWizardManager.tsx
// Team UW Wizard seat management for Team plan subscribers

import { useState } from "react";
import { Users, Wand2, UserPlus, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useTeamUWWizardSeats,
  useTeamSeatLimit,
  useEligibleDownlines,
  useGrantTeamUWSeat,
  useRevokeTeamUWSeat,
  subscriptionService,
  subscriptionKeys,
  teamSeatKeys,
} from "@/hooks/subscription";
import { useUWWizardUsage } from "@/features/underwriting";

export function TeamUWWizardManager() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: seats, isLoading: seatsLoading } = useTeamUWWizardSeats(userId);
  const { data: seatLimit } = useTeamSeatLimit(userId);
  const { data: eligibleAgents } = useEligibleDownlines(userId);
  const { data: ownerUsage } = useUWWizardUsage();

  const grantMutation = useGrantTeamUWSeat();
  const revokeMutation = useRevokeTeamUWSeat();

  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [seatPackLoading, setSeatPackLoading] = useState(false);

  const seatCount = seats?.length || 0;
  const limit = seatLimit || 5;
  const allSeatsUsed = seatCount >= limit;

  const handleAssignSeat = () => {
    if (!userId || !selectedAgentId) return;
    grantMutation.mutate(
      { ownerId: userId, agentId: selectedAgentId },
      { onSuccess: () => setSelectedAgentId("") },
    );
  };

  const handleRevokeSeat = (agentId: string) => {
    if (!userId) return;
    revokeMutation.mutate({ ownerId: userId, agentId });
  };

  const handleBuySeatPack = async () => {
    setSeatPackLoading(true);
    try {
      const result = await subscriptionService.addSeatPack();
      if (result.success) {
        toast.success("Seat pack added! You now have 5 additional agent seats.");
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
        queryClient.invalidateQueries({ queryKey: teamSeatKeys.all });
      } else {
        toast.error(result.error || "Failed to add seat pack");
      }
    } finally {
      setSeatPackLoading(false);
    }
  };

  if (seatsLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
            UW Wizard — Team Access
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px]",
            allSeatsUsed
              ? "border-amber-400 text-amber-600"
              : "border-purple-400 text-purple-600",
          )}
        >
          <Users className="h-2.5 w-2.5 mr-0.5" />
          {seatCount}/{limit} seats
        </Badge>
      </div>

      {/* Owner Usage Row */}
      {ownerUsage && (
        <div className="p-2 bg-purple-50/50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
              Your Usage (Owner)
            </span>
            <span className="text-[10px] text-zinc-500">
              {ownerUsage.runs_used} / {ownerUsage.runs_limit} runs
            </span>
          </div>
          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                ownerUsage.usage_percent >= 90
                  ? "bg-red-500"
                  : ownerUsage.usage_percent >= 75
                    ? "bg-amber-500"
                    : "bg-purple-500",
              )}
              style={{
                width: `${Math.min(ownerUsage.usage_percent, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Agent Seats Table */}
      {seats && seats.length > 0 && (
        <div className="border border-zinc-200 dark:border-zinc-700 rounded overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400">
                  Agent
                </th>
                <th className="text-right px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400">
                  Limit
                </th>
                <th className="text-right px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400 w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {seats.map((seat) => (
                <tr
                  key={seat.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <td className="px-2 py-1.5">
                    <div className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {seat.agent
                        ? `${seat.agent.first_name || ""} ${seat.agent.last_name || ""}`.trim() ||
                          seat.agent.email ||
                          "Unknown"
                        : "Unknown"}
                    </div>
                    {seat.agent?.email && (
                      <div className="text-[9px] text-zinc-400">
                        {seat.agent.email}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right text-zinc-600 dark:text-zinc-400">
                    {seat.runs_limit} runs/mo
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => handleRevokeSeat(seat.agent_id)}
                      disabled={revokeMutation.isPending}
                      className="inline-flex items-center gap-0.5 text-[9px] text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <X className="h-2.5 w-2.5" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seats && seats.length === 0 && (
        <p className="text-[10px] text-zinc-400 text-center py-2">
          No agents assigned yet. Use the dropdown below to add agents.
        </p>
      )}

      {/* Add Agent Row */}
      {!allSeatsUsed && eligibleAgents && eligibleAgents.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="flex-1 h-7 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Select agent...</option>
            {eligibleAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {`${agent.first_name || ""} ${agent.last_name || ""}`.trim() ||
                  agent.email ||
                  agent.id}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700"
            onClick={handleAssignSeat}
            disabled={!selectedAgentId || grantMutation.isPending}
          >
            {grantMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <UserPlus className="h-3 w-3 mr-0.5" />
            )}
            Assign
          </Button>
        </div>
      )}

      {!allSeatsUsed &&
        eligibleAgents &&
        eligibleAgents.length === 0 &&
        seatCount > 0 && (
          <p className="text-[10px] text-zinc-400">
            All eligible downline agents have been assigned seats.
          </p>
        )}

      {/* Seat Pack Expansion CTA */}
      {allSeatsUsed && (
        <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
          <div>
            <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">
              All seats in use
            </p>
            <p className="text-[9px] text-amber-600 dark:text-amber-400">
              Add 5 more agent seats for $100/mo
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-amber-400 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            onClick={handleBuySeatPack}
            disabled={seatPackLoading}
          >
            {seatPackLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-0.5" />
            )}
            Add Seats
          </Button>
        </div>
      )}
    </div>
  );
}
