// src/features/recruiting/components/RecruitBottomPanel.tsx
// Lightweight bottom-drawer panel for basic-tier uplines to manage recruit pipeline progress.
// Shows: recruit info, pipeline enrollment, current phase, advance/revert controls.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  ListChecks,
  LogOut,
} from "lucide-react";
import { useTemplates, useTemplate } from "../hooks/usePipeline";
import {
  useRecruitPhaseProgress,
  useInitializeRecruitProgress,
  useAdvancePhase,
  useRevertPhase,
  useChecklistProgress,
  useUnenrollFromPipeline,
} from "../hooks/useRecruitProgress";
import { cn } from "@/lib/utils";
import { TERMINAL_STATUS_COLORS } from "@/types/recruiting.types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { UserProfile } from "@/types/hierarchy.types";

interface RecruitBottomPanelProps {
  recruit: UserProfile;
  onClose: () => void;
}

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  not_started: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

type ChecklistItemDef = { id: string; item_name: string; item_order: number };
type ChecklistProgressRecord = { checklist_item_id: string; status: string };

/** Renders checklist items for a phase. Item definitions come from the template
 *  (already loaded by the parent); progress records supply the status badges. */
function PhaseChecklist({
  userId,
  phaseId,
  items,
}: {
  userId: string;
  phaseId: string;
  items: ChecklistItemDef[];
}) {
  const { data: rawProgress = [], isLoading } = useChecklistProgress(
    userId,
    phaseId,
  );
  const progressMap = new Map(
    (rawProgress as unknown as ChecklistProgressRecord[]).map((p) => [
      p.checklist_item_id,
      p.status,
    ]),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 py-1">
        No checklist items for this phase.
      </p>
    );
  }

  const sorted = [...items].sort((a, b) => a.item_order - b.item_order);

  return (
    <div className="flex flex-col gap-1 mt-1">
      {sorted.map((item) => {
        const status = progressMap.get(item.id) ?? "not_started";
        const label = status.replace(/_/g, " ");
        return (
          <div
            key={item.id}
            className="flex items-center justify-between px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800/60"
          >
            <span className="text-[10px] text-zinc-700 dark:text-zinc-300 flex-1 truncate">
              {item.item_name}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] h-4 ml-2 shrink-0",
                CHECKLIST_STATUS_COLORS[status] ??
                  CHECKLIST_STATUS_COLORS.not_started,
              )}
            >
              {label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export function RecruitBottomPanel({
  recruit,
  onClose,
}: RecruitBottomPanelProps) {
  const queryClient = useQueryClient();

  const [enrollingTemplateId, setEnrollingTemplateId] = useState<string | null>(
    null,
  );
  // Track the enrolled template locally so UI updates immediately after enrollment
  const [enrolledTemplateId, setEnrolledTemplateId] = useState<string | null>(
    null,
  );
  // Phase bar click expansion
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  // Unenroll confirmation dialog
  const [confirmUnenroll, setConfirmUnenroll] = useState(false);

  const { data: templates = [] } = useTemplates();
  const { data: phaseProgress = [], isLoading: phaseProgressLoading } =
    useRecruitPhaseProgress(recruit.id);

  // Derive template from profile, local enrollment state, or phase progress records.
  // Priority: local enrollment state > live DB progress records > stale recruit prop.
  // recruit.pipeline_template_id is last because the prop can be stale while the
  // recruits query re-fetches after an enroll/unenroll action.
  const progressTemplateId = phaseProgress[0]?.template_id ?? null;
  const effectiveTemplateId =
    enrolledTemplateId || progressTemplateId || recruit.pipeline_template_id;

  // Use the full template (includes checklist_items per phase) so PhaseChecklist
  // can show item names even before recruit_checklist_progress records are created.
  const { data: template } = useTemplate(effectiveTemplateId ?? undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase template type
  const phases = ((template as any)?.phases ?? []) as Array<{
    id: string;
    phase_name: string;
    phase_description?: string | null;
    phase_order: number;
    checklist_items: ChecklistItemDef[];
  }>;

  const initializeProgress = useInitializeRecruitProgress();
  const advancePhase = useAdvancePhase();
  const revertPhase = useRevertPhase();
  const unenrollFromPipeline = useUnenrollFromPipeline();

  const activeTemplates = templates.filter((t) => t.is_active);
  // On initial load phaseProgress is [] before the query resolves — don't flash the
  // enrollment options just because data hasn't arrived yet.
  const hasPipeline =
    !!effectiveTemplateId && (phaseProgressLoading || phaseProgress.length > 0);

  // Find the current in-progress phase
  const currentProgress = phaseProgress.find((p) => p.status === "in_progress");
  const currentPhase = currentProgress
    ? phases.find((p) => p.id === currentProgress.phase_id)
    : null;

  // Sorted phases for progress display
  const sortedPhases = [...phases].sort(
    (a, b) => a.phase_order - b.phase_order,
  );
  const currentPhaseIndex = currentPhase
    ? sortedPhases.findIndex((p) => p.id === currentPhase.id)
    : -1;
  const totalPhases = sortedPhases.length;

  // Pipeline template name
  const pipelineTemplate = templates.find((t) => t.id === effectiveTemplateId);

  // Days since pipeline started
  const pipelineStarted =
    phaseProgress.length > 0
      ? phaseProgress.reduce(
          (earliest, p) => {
            if (!p.started_at) return earliest;
            return !earliest || new Date(p.started_at) < new Date(earliest)
              ? p.started_at
              : earliest;
          },
          null as string | null,
        )
      : null;

  const handleEnroll = async (templateId: string) => {
    setEnrollingTemplateId(templateId);
    try {
      await initializeProgress.mutateAsync({ userId: recruit.id, templateId });
      toast.success("Recruit enrolled in pipeline");
      setEnrolledTemplateId(templateId);
      setEnrollingTemplateId(null);
      // Invalidate recruits so the parent refetches with updated pipeline_template_id
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
    } catch {
      toast.error("Failed to enroll recruit in pipeline");
      setEnrollingTemplateId(null);
    }
  };

  const handleAdvance = async () => {
    if (!currentProgress) return;
    try {
      await advancePhase.mutateAsync({
        userId: recruit.id,
        currentPhaseId: currentProgress.phase_id,
      });
      toast.success("Phase advanced");
    } catch {
      toast.error("Failed to advance phase");
    }
  };

  // FIX: pass the PREVIOUS completed phase ID, not the current in_progress phase
  const handleRevert = async () => {
    if (currentPhaseIndex <= 0) return;
    const previousPhase = sortedPhases[currentPhaseIndex - 1];
    if (!previousPhase) return;
    try {
      await revertPhase.mutateAsync({
        userId: recruit.id,
        phaseId: previousPhase.id,
      });
      toast.success("Phase reverted");
    } catch {
      toast.error("Failed to revert phase");
    }
  };

  const handleUnenroll = async () => {
    try {
      await unenrollFromPipeline.mutateAsync({ userId: recruit.id });
      toast.success("Recruit unenrolled from pipeline");
      setEnrolledTemplateId(null);
      setConfirmUnenroll(false);
      setSelectedPhaseId(null);
    } catch {
      toast.error("Failed to unenroll from pipeline");
      setConfirmUnenroll(false);
    }
  };

  const handlePhaseBarClick = (phaseId: string) => {
    setSelectedPhaseId((prev) => (prev === phaseId ? null : phaseId));
  };

  const isAllCompleted =
    phaseProgress.length > 0 &&
    phaseProgress.every((p) => p.status === "completed");

  const displayName =
    `${recruit.first_name || ""} ${recruit.last_name || ""}`.trim() ||
    "Unknown";
  const initials = `${(recruit.first_name?.[0] || "").toUpperCase()}${(recruit.last_name?.[0] || "").toUpperCase()}`;

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={recruit.profile_photo_url || undefined} />
            <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
              {displayName}
            </h3>
            <div className="flex items-center gap-3 mt-0.5">
              {recruit.email && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <Mail className="h-3 w-3" />
                  {recruit.email}
                </span>
              )}
              {recruit.phone && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <Phone className="h-3 w-3" />
                  {recruit.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              recruit.approval_status === "declined" &&
              !recruit.pipeline_template_id
                ? "destructive"
                : "secondary"
            }
            className={cn(
              "text-[9px] h-4",
              recruit.pipeline_template_id
                ? ["completed", "dropped", "withdrawn"].includes(
                    recruit.onboarding_status || "",
                  )
                  ? TERMINAL_STATUS_COLORS[recruit.onboarding_status!]
                  : "bg-blue-100 text-blue-800"
                : recruit.approval_status === "active" ||
                    recruit.approval_status === "approved"
                  ? "bg-green-100 text-green-800"
                  : "",
            )}
          >
            {recruit.pipeline_template_id
              ? ["completed", "dropped", "withdrawn"].includes(
                  recruit.onboarding_status || "",
                )
                ? recruit.onboarding_status!.replace(/_/g, " ")
                : recruit.current_onboarding_phase || "In Pipeline"
              : recruit.approval_status || "Pending"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!hasPipeline ? (
          /* --- Not enrolled --- */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <ListChecks className="h-4 w-4" />
              <span>Not enrolled in a pipeline</span>
            </div>

            {activeTemplates.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeTemplates.map((t) => (
                  <button
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2.5 rounded-lg border text-left transition-colors",
                      "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500",
                      "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                      enrollingTemplateId === t.id &&
                        "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30",
                    )}
                    disabled={initializeProgress.isPending}
                    onClick={() => handleEnroll(t.id)}
                  >
                    <div>
                      <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                        {t.name}
                      </p>
                      {t.description && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {t.description}
                        </p>
                      )}
                    </div>
                    {enrollingTemplateId === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0 ml-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                No active pipeline templates available. Contact your admin to
                set up a pipeline.
              </p>
            )}
          </div>
        ) : (
          /* --- Enrolled in pipeline --- */
          <div className="space-y-4">
            {/* Pipeline info card */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Pipeline
                  </p>
                  <p className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {pipelineTemplate?.name || "Unknown Pipeline"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pipelineStarted && (
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Started
                      </p>
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-0.5">
                        {formatDistanceToNow(new Date(pipelineStarted), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] text-zinc-400 hover:text-red-600 dark:hover:text-red-400 gap-1"
                    onClick={() => setConfirmUnenroll(true)}
                    disabled={unenrollFromPipeline.isPending}
                    title="Unenroll from pipeline"
                  >
                    <LogOut className="h-3 w-3" />
                    Unenroll
                  </Button>
                </div>
              </div>

              {/* Phase progress bar — each segment is clickable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {isAllCompleted
                      ? "All phases completed"
                      : currentPhase
                        ? `Phase ${currentPhaseIndex + 1} of ${totalPhases}: ${currentPhase.phase_name}`
                        : "Waiting to start"}
                  </p>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {isAllCompleted ? totalPhases : currentPhaseIndex + 1}/
                    {totalPhases}
                  </span>
                </div>
                <div className="flex gap-1">
                  {sortedPhases.map((phase) => {
                    const progress = phaseProgress.find(
                      (p) => p.phase_id === phase.id,
                    );
                    const status = progress?.status || "not_started";
                    const isSelected = selectedPhaseId === phase.id;
                    return (
                      <button
                        key={phase.id}
                        className={cn(
                          "h-3 flex-1 rounded-full transition-all focus:outline-none",
                          "hover:opacity-80 hover:scale-y-125",
                          isSelected &&
                            "ring-2 ring-offset-1 ring-zinc-400 dark:ring-zinc-500",
                          status === "completed"
                            ? "bg-emerald-500"
                            : status === "in_progress"
                              ? "bg-blue-500"
                              : status === "blocked"
                                ? "bg-red-400"
                                : "bg-zinc-200 dark:bg-zinc-700",
                        )}
                        title={`${phase.phase_name} — ${status.replace(/_/g, " ")} (click to view)`}
                        onClick={() => handlePhaseBarClick(phase.id)}
                      />
                    );
                  })}
                </div>

                {/* Expanded checklist for selected phase */}
                {selectedPhaseId &&
                  (() => {
                    const selPhase = sortedPhases.find(
                      (p) => p.id === selectedPhaseId,
                    );
                    return (
                      <div className="mt-2 px-1">
                        <div className="flex items-center gap-1 mb-1">
                          <ChevronDown className="h-3 w-3 text-zinc-400" />
                          <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                            {selPhase?.phase_name}
                          </p>
                        </div>
                        <PhaseChecklist
                          userId={recruit.id}
                          phaseId={selectedPhaseId}
                          items={selPhase?.checklist_items ?? []}
                        />
                      </div>
                    );
                  })()}
              </div>

              {/* Current phase details */}
              {currentPhase && currentProgress && (
                <div className="flex items-center gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex-1">
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Current Phase
                    </p>
                    <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                      {currentPhase.phase_name}
                    </p>
                    {currentPhase.phase_description && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {currentPhase.phase_description}
                      </p>
                    )}
                  </div>
                  {currentProgress.started_at && (
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Days in phase
                      </p>
                      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        {Math.ceil(
                          (Date.now() -
                            new Date(currentProgress.started_at).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Phase controls */}
            {!isAllCompleted && currentProgress && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] gap-1"
                  disabled={currentPhaseIndex <= 0 || revertPhase.isPending}
                  onClick={handleRevert}
                >
                  {revertPhase.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronLeft className="h-3 w-3" />
                  )}
                  Revert Phase
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-[10px] gap-1"
                  disabled={advancePhase.isPending}
                  onClick={handleAdvance}
                >
                  Advance Phase
                  {advancePhase.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}

            {isAllCompleted && (
              <div className="flex items-center justify-center py-2">
                <Badge
                  variant="default"
                  className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                >
                  Pipeline Complete
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unenroll confirmation — rendered inline inside the panel (avoids z-index portal issues) */}
      {confirmUnenroll && (
        <div className="absolute inset-0 rounded-t-xl bg-black/50 flex items-center justify-center px-4 z-10">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-xl p-4">
            <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
              Unenroll from Pipeline?
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              This will remove all phase and checklist progress for{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {displayName}
              </span>
              . They can then be enrolled in a different pipeline.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-[10px]"
                onClick={() => setConfirmUnenroll(false)}
                disabled={unenrollFromPipeline.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-[10px] bg-red-600 hover:bg-red-700 text-white"
                onClick={handleUnenroll}
                disabled={unenrollFromPipeline.isPending}
              >
                {unenrollFromPipeline.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Unenroll
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
