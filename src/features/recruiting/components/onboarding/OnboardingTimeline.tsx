// src/features/recruiting/components/onboarding/OnboardingTimeline.tsx
// Brutalist progress path - massive numbers, harsh lines, visual journey

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckCircle2, Circle, Clock, Lock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ChecklistItem {
  id: string;
  item_name: string;
  item_description?: string;
  visible_to_recruit?: boolean;
}

interface ChecklistProgressItem {
  checklist_item_id: string;
  status: string;
}

interface PhaseData {
  id: string;
  phase_name: string;
  visible_to_recruit?: boolean;
  checklist_items?: ChecklistItem[];
}

interface PhaseProgressItem {
  id: string;
  status: string;
  phase_id: string;
  started_at?: string | null;
  notes?: string | null;
  blocked_reason?: string | null;
}

interface OnboardingTimelineProps {
  phaseProgress?: PhaseProgressItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- template phases type
  templatePhases?: any[];
  allChecklistProgress?: ChecklistProgressItem[];
  expandedPhase: string | null;
  onExpandedChange: (phaseId: string | null) => void;
  className?: string;
}

export function OnboardingTimeline({
  phaseProgress,
  templatePhases,
  allChecklistProgress,
  expandedPhase,
  onExpandedChange,
}: OnboardingTimelineProps) {
  if (!phaseProgress || phaseProgress.length === 0) {
    return (
      <section className="relative bg-[#0a0a0a] rounded-lg p-6">
        <p className="text-white/30 text-sm font-mono text-center">
          No phases available
        </p>
      </section>
    );
  }

  return (
    <section className="relative bg-[#0a0a0a] overflow-hidden rounded-lg">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: "var(--recruiting-primary)", opacity: 0.4 }}
      />

      <div className="relative z-10 p-4 md:p-6">
        {/* Header */}
        <span className="font-mono text-[10px] text-white/30 tracking-[0.3em] uppercase block mb-4 md:mb-6">
          [03] Journey
        </span>

        {/* Phase list */}
        <div className="space-y-0">
          {phaseProgress.map((phase, index) => {
            const isCompleted = phase.status === "completed";
            const isInProgress = phase.status === "in_progress";
            const isBlocked = phase.status === "blocked";
            const isExpanded = expandedPhase === phase.id;

            const phaseData = templatePhases?.find(
              (p: PhaseData) => p.id === phase.phase_id,
            ) as PhaseData | undefined;
            const phaseName = phaseData?.phase_name || "Unknown Phase";
            const isPhaseHidden = phaseData?.visible_to_recruit === false;

            const phaseChecklistItems = (
              phaseData?.checklist_items || []
            ).filter(
              (item: ChecklistItem) => item.visible_to_recruit !== false,
            );

            const phaseNumber = String(index + 1).padStart(2, "0");

            return (
              <Collapsible
                key={phase.id}
                open={isExpanded && !isPhaseHidden}
                onOpenChange={(open: boolean) =>
                  !isPhaseHidden && onExpandedChange(open ? phase.id : null)
                }
              >
                <CollapsibleTrigger
                  className="w-full text-left"
                  disabled={isPhaseHidden}
                >
                  <div
                    className={`group border-t-2 py-4 md:py-6 flex gap-3 md:gap-6 lg:gap-8 items-start transition-all duration-300 ${
                      isPhaseHidden
                        ? "opacity-40 cursor-default"
                        : "cursor-pointer hover:pl-2"
                    }`}
                    style={{
                      borderColor: isInProgress
                        ? "var(--recruiting-primary)"
                        : isCompleted
                          ? "rgba(var(--recruiting-primary-rgb), 0.4)"
                          : isBlocked
                            ? "rgba(239, 68, 68, 0.4)"
                            : "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {/* Phase number */}
                    <span
                      className="text-[12vw] md:text-[8vw] lg:text-[5vw] font-black leading-[0.7] tracking-tighter shrink-0"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        color: isInProgress
                          ? "var(--recruiting-primary)"
                          : "white",
                        opacity: isCompleted ? 0.15 : isInProgress ? 0.5 : 0.08,
                      }}
                    >
                      {phaseNumber}
                    </span>

                    {/* Phase content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Status icon */}
                        {isPhaseHidden ? (
                          <Lock className="h-4 w-4 text-white/30" />
                        ) : isCompleted ? (
                          <CheckCircle2
                            className="h-4 w-4"
                            style={{ color: "var(--recruiting-primary)" }}
                          />
                        ) : isInProgress ? (
                          <Clock
                            className="h-4 w-4"
                            style={{ color: "var(--recruiting-primary)" }}
                          />
                        ) : isBlocked ? (
                          <Circle className="h-4 w-4 text-red-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/20" />
                        )}

                        {/* Phase name */}
                        <h3
                          className={`text-lg md:text-xl font-black uppercase tracking-tight ${
                            isPhaseHidden
                              ? "text-white/30"
                              : isCompleted
                                ? "text-white/50"
                                : "text-white"
                          }`}
                          style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          {isPhaseHidden ? "Pending" : phaseName}
                        </h3>

                        {/* Expand icon */}
                        {!isPhaseHidden && (
                          <ChevronRight
                            className={`h-4 w-4 text-white/30 transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        )}
                      </div>

                      {/* Started date or status */}
                      <p className="text-white/30 text-xs font-mono uppercase tracking-wider">
                        {isPhaseHidden
                          ? "Admin action required"
                          : isCompleted && phase.started_at
                            ? `Completed • Started ${format(new Date(phase.started_at), "MMM d")}`
                            : isInProgress && phase.started_at
                              ? `In Progress • Started ${format(new Date(phase.started_at), "MMM d")}`
                              : isBlocked
                                ? "Blocked"
                                : "Not started"}
                      </p>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-[15vw] md:ml-[10vw] lg:ml-[5vw] pb-6 pl-4 md:pl-8 border-l border-white/10">
                    {phaseChecklistItems.length > 0 ? (
                      <div className="space-y-3">
                        {phaseChecklistItems.map((item: ChecklistItem) => {
                          const progressItem = allChecklistProgress?.find(
                            (p: ChecklistProgressItem) =>
                              p.checklist_item_id === item.id,
                          );
                          const itemCompleted =
                            progressItem?.status === "completed";

                          return (
                            <div
                              key={item.id}
                              className="flex items-start gap-3"
                            >
                              {itemCompleted ? (
                                <CheckCircle2
                                  className="h-4 w-4 mt-0.5 shrink-0"
                                  style={{ color: "var(--recruiting-primary)" }}
                                />
                              ) : (
                                <Circle className="h-4 w-4 mt-0.5 text-white/20 shrink-0" />
                              )}
                              <div>
                                <p
                                  className={`text-sm ${
                                    itemCompleted
                                      ? "text-white/40 line-through"
                                      : "text-white/70"
                                  }`}
                                >
                                  {item.item_name}
                                </p>
                                {item.item_description && (
                                  <p className="text-white/30 text-xs mt-0.5">
                                    {item.item_description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-white/30 text-sm font-mono">
                        No checklist items
                      </p>
                    )}

                    {phase.notes && (
                      <div className="mt-4 py-2 px-3 bg-white/5 rounded">
                        <p className="text-white/50 text-xs">{phase.notes}</p>
                      </div>
                    )}

                    {phase.blocked_reason && (
                      <div className="mt-4 py-2 px-3 bg-red-950/30 rounded border border-red-500/20">
                        <p className="text-red-400 text-xs">
                          {phase.blocked_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* Bottom accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: "var(--recruiting-primary)", opacity: 0.2 }}
      />
    </section>
  );
}
