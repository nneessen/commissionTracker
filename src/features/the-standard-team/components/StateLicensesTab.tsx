// src/features/the-standard-team/components/StateLicensesTab.tsx

import { useState, useMemo } from "react";
import { StateLicensesTable } from "./StateLicensesTable";
import { StateClassificationDialog } from "./StateClassificationDialog";
import {
  useTheStandardAgents,
  THE_STANDARD_AGENCY_ID,
} from "../hooks/useTheStandardAgents";
import {
  useAgentStateLicenses,
  useToggleStateLicense,
} from "../hooks/useAgentStateLicenses";
import {
  useStateClassifications,
  useUpdateStateClassification,
  type StateClassificationType,
} from "../hooks/useStateClassifications";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, MapPin } from "lucide-react";
import { toast } from "sonner";

export function StateLicensesTab() {
  const [editingState, setEditingState] = useState<{
    code: string;
    name: string;
  } | null>(null);

  const {
    data: agents = [],
    isLoading: agentsLoading,
    error: agentsError,
  } = useTheStandardAgents();

  const agentIds = useMemo(() => agents.map((a) => a.id), [agents]);

  const {
    data: licenses = [],
    isLoading: licensesLoading,
    error: licensesError,
  } = useAgentStateLicenses(agentIds);

  const {
    data: classifications = [],
    isLoading: classificationsLoading,
    error: classificationsError,
  } = useStateClassifications(THE_STANDARD_AGENCY_ID);

  const toggleMutation = useToggleStateLicense();
  const updateClassificationMutation = useUpdateStateClassification();

  const handleToggleLicense = (params: {
    agentId: string;
    stateCode: string;
    isLicensed: boolean;
    existingId?: string;
  }) => {
    toggleMutation.mutate(params, {
      onError: (error) => {
        toast.error(`Failed to update license: ${error.message}`);
      },
    });
  };

  const handleEditClassification = (stateCode: string, stateName: string) => {
    setEditingState({ code: stateCode, name: stateName });
  };

  const handleSaveClassification = (
    classification: StateClassificationType,
  ) => {
    if (!editingState) return;

    const existing = classifications.find(
      (c) => c.state_code === editingState.code,
    );

    updateClassificationMutation.mutate(
      {
        agencyId: THE_STANDARD_AGENCY_ID,
        stateCode: editingState.code,
        classification,
        existingId: existing?.id,
      },
      {
        onSuccess: () => {
          toast.success(`${editingState.name} classification updated`);
          setEditingState(null);
        },
        onError: (error) => {
          toast.error(`Failed to update: ${error.message}`);
        },
      },
    );
  };

  const isLoading = agentsLoading || licensesLoading || classificationsLoading;
  const error = agentsError || licensesError || classificationsError;

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
        <MapPin className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          No agents found in The Standard agency
        </p>
      </div>
    );
  }

  const currentClassification = editingState
    ? classifications.find((c) => c.state_code === editingState.code)
        ?.classification || "neutral"
    : "neutral";

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Check boxes for licensed states. Click color dot to set state
          classification (green/yellow/red).
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <StateLicensesTable
          agents={agents}
          licenses={licenses}
          classifications={classifications}
          isLoading={toggleMutation.isPending}
          onToggleLicense={handleToggleLicense}
          onEditClassification={handleEditClassification}
        />
      </div>

      {editingState && (
        <StateClassificationDialog
          open={!!editingState}
          onOpenChange={(open) => !open && setEditingState(null)}
          stateName={editingState.name}
          stateCode={editingState.code}
          currentClassification={currentClassification}
          onSave={handleSaveClassification}
          isSaving={updateClassificationMutation.isPending}
        />
      )}
    </div>
  );
}
