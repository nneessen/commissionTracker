// src/features/the-standard-team/components/WritingNumbersTab.tsx

import { useMemo } from "react";
import { WritingNumbersTable } from "./WritingNumbersTable";
import { useTheStandardAgents } from "../hooks/useTheStandardAgents";
import {
  useAgentWritingNumbers,
  useUpsertWritingNumber,
} from "../hooks/useAgentWritingNumbers";
import { useActiveCarriers } from "@/hooks/carriers";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";

export function WritingNumbersTab() {
  const {
    data: agents = [],
    isLoading: agentsLoading,
    error: agentsError,
  } = useTheStandardAgents();

  const {
    data: carriers = [],
    isLoading: carriersLoading,
    error: carriersError,
  } = useActiveCarriers();

  const agentIds = useMemo(() => agents.map((a) => a.id), [agents]);

  const {
    data: writingNumbers = [],
    isLoading: writingNumbersLoading,
    error: writingNumbersError,
  } = useAgentWritingNumbers(agentIds);

  const upsertMutation = useUpsertWritingNumber();

  const handleUpsertWritingNumber = (params: {
    agentId: string;
    carrierId: string;
    writingNumber: string;
    existingId?: string;
  }) => {
    upsertMutation.mutate(params, {
      onSuccess: () => {
        toast.success("Writing number saved");
      },
      onError: (error) => {
        toast.error(`Failed to save: ${error.message}`);
      },
    });
  };

  const isLoading = agentsLoading || carriersLoading || writingNumbersLoading;
  const error = agentsError || carriersError || writingNumbersError;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="flex items-center gap-2 text-red-500 text-[11px]">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load data: {error.message}</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-700" />
        <Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-700" />
        <Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-700" />
        <Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-700" />
        <Skeleton className="h-8 w-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          No agents found in The Standard agency
        </p>
      </div>
    );
  }

  if (carriers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          No active carriers found
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Click any cell to add or edit a writing number. Press Enter to save,
          Escape to cancel.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <WritingNumbersTable
          agents={agents}
          carriers={carriers}
          writingNumbers={writingNumbers}
          isLoading={upsertMutation.isPending}
          onUpsertWritingNumber={handleUpsertWritingNumber}
        />
      </div>
    </div>
  );
}
