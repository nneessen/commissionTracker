// src/features/recruiting/components/RecruitDetailPanel.tsx
// Redesigned with horizontal phase stepper - compact and efficient

import React, { useState } from "react";
import { UserProfile } from "@/types/hierarchy.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  Phone,
  Activity,
  ArrowRight,
  AlertCircle,
  Trash2,
  SendHorizontal,
  Loader2,
  CheckCircle2,
  Clock,
  ListChecks,
  FolderOpen,
  Check,
  Circle,
  Ban,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DeleteRecruitDialogOptimized } from "./DeleteRecruitDialog.optimized";
import { InitializePipelineDialog } from "./InitializePipelineDialog";
import { useRouter } from "@tanstack/react-router";
import { PhaseChecklist } from "./PhaseChecklist";
import { DocumentManager } from "./DocumentManager";
import { EmailManager } from "./EmailManager";
import {
  useRecruitPhaseProgress,
  useCurrentPhase,
  useChecklistProgress,
  useAdvancePhase,
  useBlockPhase,
  useUpdatePhaseStatus,
  useInitializeRecruitProgress,
  useUnenrollFromPipeline,
} from "../hooks/useRecruitProgress";
import { useTemplate, useActiveTemplate } from "../hooks/usePipeline";
import { useCurrentUserProfile } from "@/hooks/admin/useUserApproval";
import { useRecruitDocuments } from "../hooks/useRecruitDocuments";
import { useRecruitEmails } from "../hooks/useRecruitEmails";
import { useRecruitActivityLog } from "../hooks/useRecruitActivity";
import { ONBOARDING_STATUS_COLORS } from "@/types/recruiting.types";
import { supabase } from "@/services/base/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecruitDetailPanelProps {
  recruit: UserProfile;
  currentUserId?: string;
  isUpline?: boolean;
  onRecruitDeleted?: () => void;
}

export function RecruitDetailPanel({
  recruit,
  currentUserId,
  isUpline = false,
  onRecruitDeleted,
}: RecruitDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("checklist");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [initializeDialogOpen, setInitializeDialogOpen] = useState(false);
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const _router = useRouter();

  const { data: currentUserProfile } = useCurrentUserProfile();
  const { data: phaseProgress, isLoading: progressLoading } =
    useRecruitPhaseProgress(recruit.id);
  const { data: currentPhase, isLoading: currentPhaseLoading } =
    useCurrentPhase(recruit.id);

  // CRITICAL: Use the recruit's actual template, not the global default
  // Get template ID from progress records (most reliable) or from recruit profile
  const recruitTemplateId =
    phaseProgress?.[0]?.template_id || recruit.pipeline_template_id || null;

  // Use the recruit's specific template if they have one, otherwise fall back to default for new recruits
  const { data: recruitTemplate, isLoading: recruitTemplateLoading } =
    useTemplate(recruitTemplateId ?? undefined);
  const { data: defaultTemplate, isLoading: defaultTemplateLoading } =
    useActiveTemplate();

  // Use recruit's template if available, otherwise default (for new recruits without progress)
  const template = recruitTemplateId ? recruitTemplate : defaultTemplate;
  const templateLoading = recruitTemplateId
    ? recruitTemplateLoading
    : defaultTemplateLoading;

  const { data: checklistProgress } = useChecklistProgress(
    recruit.id,
    selectedPhaseId || currentPhase?.phase_id,
  );
  const { data: documents } = useRecruitDocuments(recruit.id);
  const { data: emails } = useRecruitEmails(recruit.id);
  const { data: activityLog } = useRecruitActivityLog(recruit.id);

  const advancePhase = useAdvancePhase();
  const blockPhase = useBlockPhase();
  const updatePhaseStatus = useUpdatePhaseStatus();
  const initializeProgress = useInitializeRecruitProgress();
  const unenrollPipeline = useUnenrollFromPipeline();

  const handleAdvancePhase = async () => {
    if (!currentPhase || !confirm("Advance to next phase?")) return;
    await advancePhase.mutateAsync({
      userId: recruit.id,
      currentPhaseId: currentPhase.phase_id,
    });
  };

  const handleBlockPhase = async () => {
    if (!currentPhase) return;
    const reason = prompt("Reason for blocking:");
    if (reason)
      await blockPhase.mutateAsync({
        userId: recruit.id,
        phaseId: currentPhase.phase_id,
        reason,
      });
  };

  const handleUnblockPhase = async () => {
    if (!currentPhase || !confirm("Unblock this phase?")) return;
    await updatePhaseStatus.mutateAsync({
      userId: recruit.id,
      phaseId: currentPhase.phase_id,
      status: "in_progress",
      notes: "Unblocked",
    });
  };

  const handlePhaseClick = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setActiveTab("checklist");
  };

  const handleResendInvite = async () => {
    if (!recruit.email) return;
    setResendingInvite(true);
    try {
      // Use custom Mailgun edge function instead of Supabase's built-in email
      const { data, error: fnError } = await supabase.functions.invoke(
        "send-password-reset",
        {
          body: {
            email: recruit.email,
            redirectTo: `${window.location.origin}/auth/reset-password`,
          },
        },
      );
      if (fnError) toast.error(fnError.message);
      else if (data?.success === false) toast.error(data.error);
      else toast.success("Invite sent!");
    } finally {
      setResendingInvite(false);
    }
  };

  const handleInitializeProgress = () => {
    setInitializeDialogOpen(true);
  };

  const handleConfirmInitialize = async (templateId: string) => {
    await initializeProgress.mutateAsync({
      userId: recruit.id,
      templateId,
    });
    setInitializeDialogOpen(false);
  };

  const handleUnenroll = async () => {
    try {
      await unenrollPipeline.mutateAsync({ userId: recruit.id });
      toast.success("Recruit unenrolled from pipeline");
      setUnenrollDialogOpen(false);
      setSelectedPhaseId(null);
    } catch (error) {
      toast.error("Failed to unenroll recruit");
      console.error("[RecruitDetailPanel] Unenroll failed:", error);
    }
  };

  if (progressLoading || currentPhaseLoading || templateLoading) {
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasPipelineProgress = phaseProgress && phaseProgress.length > 0;
  const displayName =
    recruit.first_name && recruit.last_name
      ? `${recruit.first_name} ${recruit.last_name}`
      : recruit.email;
  const initials =
    recruit.first_name && recruit.last_name
      ? `${recruit.first_name[0]}${recruit.last_name[0]}`.toUpperCase()
      : recruit.email?.substring(0, 2).toUpperCase() || "??";

  const phases = template?.phases || [];

  const sortedPhases = [...phases].sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase template type
    (a: any, b: any) => a.phase_order - b.phase_order,
  );
  const progressMap = new Map(phaseProgress?.map((p) => [p.phase_id, p]) || []);
  const completedCount =
    phaseProgress?.filter((p) => p.status === "completed").length || 0;

  const viewingPhaseId = selectedPhaseId || currentPhase?.phase_id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase template type
  const viewingPhase = sortedPhases.find((p: any) => p.id === viewingPhaseId);
  const viewingChecklistItems = viewingPhase?.checklist_items || [];

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header */}
      <div className="px-3 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={recruit.profile_photo_url || undefined} />
            <AvatarFallback className="text-xs font-medium bg-zinc-200 dark:bg-zinc-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {displayName}
              </h2>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4",
                  recruit.onboarding_status
                    ? ONBOARDING_STATUS_COLORS[recruit.onboarding_status]
                    : "",
                )}
              >
                {recruit.onboarding_status?.replace(/_/g, " ") || "New"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              {recruit.email && (
                <a
                  href={`mailto:${recruit.email}`}
                  className="flex items-center gap-0.5 hover:text-zinc-700 dark:hover:text-zinc-300 truncate"
                >
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[140px]">
                    {recruit.email}
                  </span>
                </a>
              )}
              {recruit.phone && (
                <a
                  href={`tel:${recruit.phone}`}
                  className="flex items-center gap-0.5 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Phone className="h-3 w-3" />
                  {recruit.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Inline */}
        {(isUpline || currentUserProfile?.is_admin) && (
          <div className="flex items-center gap-1 mt-2">
            {hasPipelineProgress ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAdvancePhase}
                  disabled={!currentPhase || currentPhase?.status === "blocked"}
                  className="h-6 text-[10px] px-2"
                >
                  <ArrowRight className="h-3 w-3 mr-0.5" />
                  Advance
                </Button>
                {currentPhase?.status === "blocked" ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleUnblockPhase}
                    className="h-6 text-[10px] px-2"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-0.5" />
                    Unblock
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBlockPhase}
                    disabled={!currentPhase}
                    className="h-6 text-[10px] px-2"
                  >
                    <Ban className="h-3 w-3 mr-0.5" />
                    Block
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setUnenrollDialogOpen(true)}
                  disabled={unenrollPipeline.isPending}
                  className="h-6 text-[10px] px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  title="Remove from pipeline to re-enroll in a different one"
                >
                  <RotateCcw className="h-3 w-3 mr-0.5" />
                  Unenroll
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleInitializeProgress}
                disabled={initializeProgress.isPending}
                className="h-6 text-[10px] px-2"
              >
                {initializeProgress.isPending ? (
                  <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                ) : (
                  <Clock className="h-3 w-3 mr-0.5" />
                )}
                Initialize
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleResendInvite}
              disabled={resendingInvite}
              className="h-6 text-[10px] px-2"
            >
              {resendingInvite ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <SendHorizontal className="h-3 w-3 mr-0.5" />
              )}
              Invite
            </Button>
            <div className="flex-1" />
            {currentUserId !== recruit.id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-6 text-[10px] px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Horizontal Phase Stepper */}
      {hasPipelineProgress && sortedPhases.length > 0 && (
        <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Pipeline Progress
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {completedCount}/{sortedPhases.length} complete
            </span>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-0.5">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- phase template type */}
              {sortedPhases.map((phase: any, index: number) => {
                const progress = progressMap.get(phase.id);
                const status = progress?.status || "not_started";
                const isActive = phase.id === viewingPhaseId;
                const isCurrent = phase.id === currentPhase?.phase_id;

                return (
                  <Tooltip key={phase.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handlePhaseClick(phase.id)}
                        className={cn(
                          "flex-1 h-7 rounded transition-all relative group",
                          "flex items-center justify-center",
                          status === "completed" &&
                            "bg-emerald-500 hover:bg-emerald-600",
                          status === "in_progress" &&
                            "bg-amber-500 hover:bg-amber-600",
                          status === "blocked" && "bg-red-500 hover:bg-red-600",
                          status === "not_started" &&
                            "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600",
                          isActive &&
                            "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-1",
                        )}
                      >
                        {status === "completed" ? (
                          <Check className="h-3.5 w-3.5 text-white" />
                        ) : status === "in_progress" ? (
                          <span className="text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                        ) : status === "blocked" ? (
                          <Ban className="h-3 w-3 text-white" />
                        ) : (
                          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                            {index + 1}
                          </span>
                        )}
                        {isCurrent && status !== "completed" && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p className="font-medium">{phase.phase_name}</p>
                      <p className="text-zinc-400 capitalize">
                        {status.replace("_", " ")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
          {viewingPhase && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {viewingPhase.phase_name}
              </span>
              {viewingPhaseId &&
                progressMap.get(viewingPhaseId)?.status === "blocked" && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] h-4 px-1.5"
                  >
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                    Blocked
                  </Badge>
                )}
            </div>
          )}
        </div>
      )}

      {/* No Pipeline State */}
      {!hasPipelineProgress && (
        <div className="px-3 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-center">
          <Circle className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            Pipeline not initialized
          </p>
          {isUpline && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleInitializeProgress}
              disabled={initializeProgress.isPending}
              className="h-7 text-xs"
            >
              {initializeProgress.isPending
                ? "Initializing..."
                : "Initialize Pipeline"}
            </Button>
          )}
        </div>
      )}

      {/* Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="mx-3 mt-2 grid grid-cols-4 h-8 bg-zinc-200/50 dark:bg-zinc-800/50 p-0.5 rounded-md">
          <TabsTrigger
            value="checklist"
            className="text-[11px] h-7 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
          >
            <ListChecks className="h-3.5 w-3.5 mr-1" />
            Tasks
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="text-[11px] h-7 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            Docs
          </TabsTrigger>
          <TabsTrigger
            value="emails"
            className="text-[11px] h-7 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
          >
            <Mail className="h-3.5 w-3.5 mr-1" />
            Email
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="text-[11px] h-7 rounded data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm"
          >
            <Activity className="h-3.5 w-3.5 mr-1" />
            Log
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent value="checklist" className="mt-0 h-full">
            {hasPipelineProgress && viewingChecklistItems.length > 0 ? (
              <PhaseChecklist
                userId={recruit.id}
                checklistItems={viewingChecklistItems}
                checklistProgress={checklistProgress || []}
                isUpline={isUpline}
                currentUserId={currentUserId}
                currentPhaseId={currentPhase?.phase_id}
                viewedPhaseId={viewingPhaseId}
                isAdmin={currentUserProfile?.is_admin || false}
                onPhaseComplete={() => {}}
              />
            ) : (
              <div className="py-8 text-center">
                <ListChecks className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  {hasPipelineProgress
                    ? "No tasks for this phase"
                    : "Initialize pipeline to view tasks"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <DocumentManager
              userId={recruit.id}
              documents={documents}
              isUpline={isUpline}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent value="emails" className="mt-0">
            <EmailManager
              recruitId={recruit.id}
              recruitEmail={recruit.email}
              recruitName={displayName}
              emails={emails}
              isUpline={isUpline}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            {activityLog && activityLog.length > 0 ? (
              <div className="space-y-1.5">
                {activityLog.slice(0, 20).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 py-1.5 px-2 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
                  >
                    <Activity className="h-3 w-3 text-zinc-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {activity.action_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Activity className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No activity yet</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <DeleteRecruitDialogOptimized
        recruit={recruit}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => onRecruitDeleted?.()}
      />

      <InitializePipelineDialog
        open={initializeDialogOpen}
        onOpenChange={setInitializeDialogOpen}
        onConfirm={handleConfirmInitialize}
        isLoading={initializeProgress.isPending}
      />

      {/* Unenroll Confirmation Dialog */}
      <AlertDialog
        open={unenrollDialogOpen}
        onOpenChange={setUnenrollDialogOpen}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-1 text-sm">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              Unenroll from Pipeline
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove all pipeline progress for{" "}
              <span className="font-medium">{displayName}</span>. They can be
              re-enrolled in a different pipeline afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-1">
            <AlertDialogCancel
              disabled={unenrollPipeline.isPending}
              className="h-7 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnenroll}
              disabled={unenrollPipeline.isPending}
              className="bg-orange-600 hover:bg-orange-700 h-7 text-xs"
            >
              {unenrollPipeline.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Unenrolling...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Unenroll
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
