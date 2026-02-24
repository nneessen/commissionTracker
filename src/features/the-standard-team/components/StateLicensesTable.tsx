// src/features/the-standard-team/components/StateLicensesTable.tsx

import { useMemo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { US_STATES } from "@/constants/states";
import type { TheStandardAgent } from "../hooks/useTheStandardAgents";
import type { AgentStateLicense } from "../hooks/useAgentStateLicenses";
import type {
  StateClassification,
  StateClassificationType,
} from "../hooks/useStateClassifications";

interface StateLicensesTableProps {
  agents: TheStandardAgent[];
  selectedAgentId?: string;
  visibleStates?: ReadonlyArray<(typeof US_STATES)[number]>;
  licenses: AgentStateLicense[];
  classifications: StateClassification[];
  canEditClassifications?: boolean;
  isLoading?: boolean;
  onToggleLicense: (params: {
    agentId: string;
    stateCode: string;
    isLicensed: boolean;
    existingId?: string;
  }) => void;
  onEditClassification: (stateCode: string, stateName: string) => void;
}

const getClassificationBgClass = (
  classification: StateClassificationType | undefined,
): string => {
  switch (classification) {
    case "green":
      return "bg-emerald-50 dark:bg-emerald-950/30";
    case "yellow":
      return "bg-amber-50 dark:bg-amber-950/30";
    case "red":
      return "bg-red-50 dark:bg-red-950/30";
    default:
      return "";
  }
};

export function StateLicensesTable({
  agents,
  selectedAgentId,
  visibleStates,
  licenses,
  classifications,
  canEditClassifications = false,
  onToggleLicense,
  onEditClassification,
}: StateLicensesTableProps) {
  const states = visibleStates ?? US_STATES;
  const stateLabelColWidth = 120;
  const colorColWidth = 40;
  const agentColWidth = 80;

  // Build lookup maps
  const licenseMap = useMemo(() => {
    const map = new Map<string, AgentStateLicense>();
    licenses.forEach((lic) => {
      map.set(`${lic.agent_id}-${lic.state_code}`, lic);
    });
    return map;
  }, [licenses]);

  const classificationMap = useMemo(() => {
    const map = new Map<string, StateClassification>();
    classifications.forEach((cls) => {
      map.set(cls.state_code, cls);
    });
    return map;
  }, [classifications]);

  const getLicense = useCallback(
    (agentId: string, stateCode: string) => {
      return licenseMap.get(`${agentId}-${stateCode}`);
    },
    [licenseMap],
  );

  const getClassification = useCallback(
    (stateCode: string) => {
      return classificationMap.get(stateCode)?.classification;
    },
    [classificationMap],
  );

  const handleCheckboxChange = (
    agentId: string,
    stateCode: string,
    checked: boolean,
  ) => {
    const existing = getLicense(agentId, stateCode);
    onToggleLicense({
      agentId,
      stateCode,
      isLicensed: checked,
      existingId: existing?.id,
    });
  };

  const tableWidth =
    stateLabelColWidth + colorColWidth + agents.length * agentColWidth;

  return (
    <div className="h-full w-full min-w-0 overflow-auto overscroll-x-contain">
      <div className="inline-block min-w-full align-top">
        <table
          className="w-max min-w-full border-collapse"
          style={{
            width: `${Math.max(tableWidth, 0)}px`,
            minWidth: "100%",
          }}
        >
          <thead className="sticky top-0 z-10">
            <tr className="bg-zinc-100 dark:bg-zinc-800">
              <th className="sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide text-left px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 min-w-[120px] w-[120px]">
                State
              </th>
              <th className="sticky left-[120px] z-20 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide text-center px-2 py-2 border-b border-zinc-200 dark:border-zinc-700 w-[40px] min-w-[40px]">
                Color
              </th>
              {agents.map((agent) => (
                <th
                  key={agent.id}
                  className={cn(
                    "text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide text-center px-2 py-2 border-b border-zinc-200 dark:border-zinc-700 min-w-[80px] w-[80px]",
                    agent.id === selectedAgentId &&
                      "bg-blue-100/70 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
                  )}
                  title={`${agent.first_name} ${agent.last_name}`}
                >
                  <div className="truncate max-w-[75px]">
                    {agent.first_name?.[0]}. {agent.last_name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((state, idx) => {
              const classification = getClassification(state.value);
              const bgClass = getClassificationBgClass(classification);

              return (
                <tr
                  key={state.value}
                  className={cn(
                    "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30",
                    bgClass ||
                      (idx % 2 === 0
                        ? "bg-white dark:bg-zinc-900"
                        : "bg-zinc-50/50 dark:bg-zinc-900/50"),
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 text-[11px] font-medium text-zinc-900 dark:text-zinc-100 px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800",
                      bgClass ||
                        (idx % 2 === 0
                          ? "bg-white dark:bg-zinc-900"
                          : "bg-zinc-50/50 dark:bg-zinc-900/50"),
                    )}
                  >
                    {state.label}
                  </td>
                  <td
                    className={cn(
                      "sticky left-[120px] z-10 text-center py-1.5 border-b border-zinc-100 dark:border-zinc-800",
                      bgClass ||
                        (idx % 2 === 0
                          ? "bg-white dark:bg-zinc-900"
                          : "bg-zinc-50/50 dark:bg-zinc-900/50"),
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!canEditClassifications) return;
                        onEditClassification(state.value, state.label);
                      }}
                      disabled={!canEditClassifications}
                      className="p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                      title={
                        canEditClassifications
                          ? `Set ${state.label} classification (current: ${classification || "neutral"})`
                          : "You can only edit color classifications for your own agency (unless admin)"
                      }
                    >
                      <div
                        className={cn(
                          "h-3 w-3 rounded-full border",
                          classification === "green" &&
                            "bg-emerald-500 border-emerald-600",
                          classification === "yellow" &&
                            "bg-amber-500 border-amber-600",
                          classification === "red" &&
                            "bg-red-500 border-red-600",
                          (!classification || classification === "neutral") &&
                            "bg-zinc-300 border-zinc-400 dark:bg-zinc-600 dark:border-zinc-500",
                        )}
                      />
                    </button>
                  </td>
                  {agents.map((agent) => {
                    const license = getLicense(agent.id, state.value);
                    const isLicensed = license?.is_licensed ?? false;

                    return (
                      <td
                        key={agent.id}
                        className={cn(
                          "text-center py-1 px-2 border-b border-zinc-100 dark:border-zinc-800",
                          bgClass,
                          agent.id === selectedAgentId &&
                            "bg-blue-50/70 dark:bg-blue-950/15",
                        )}
                      >
                        <Checkbox
                          checked={isLicensed}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(
                              agent.id,
                              state.value,
                              !!checked,
                            )
                          }
                          className="h-4 w-4"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
