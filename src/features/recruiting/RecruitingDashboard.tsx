// src/features/recruiting/RecruitingDashboard.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Mail,
  Download,
  Settings2,
  Users,
  Inbox,
  Link2,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import { useRecruits, usePendingLeadsCount } from "./hooks";
import { useActiveTemplate, usePhases } from "./hooks/usePipeline";
import { RecruitListTable } from "./components/RecruitListTable";
import { RecruitDetailPanel } from "./components/RecruitDetailPanel";
import { AddRecruitDialog } from "./components/AddRecruitDialog";
import { SendInviteDialog } from "./components/SendInviteDialog";
import { RecruitingErrorBoundary } from "./components/RecruitingErrorBoundary";
import { RecruitingPreviewBanner } from "./components/RecruitingPreviewBanner";
import { isSuperAdminEmail } from "@/lib/temporaryAccess";
import type { UserProfile } from "@/types/hierarchy.types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { downloadCSV } from "@/utils/exportHelpers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { normalizePhaseNameToStatus } from "@/lib/pipeline";

// Extended type for recruits with joined data
type RecruitWithRelations = UserProfile & {
  recruiter?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null;
  upline?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null;
};

function RecruitingDashboardContent() {
  const { user, supabaseUser } = useAuth();
  // Filter to only show recruits where current user is the recruiter
  // Disable query until user is loaded to prevent fetching all recruits
  const { data: recruitsData, isLoading: recruitsLoading } = useRecruits(
    { recruiter_id: user?.id },
    1,
    50,
    { enabled: !!user?.id },
  );

  // Check if current user is the super admin (nickneessen@thestandardhq.com)
  const showPreviewBanner = !isSuperAdminEmail(supabaseUser?.email);
  const { data: pendingLeadsCount } = usePendingLeadsCount();

  // Fetch phases from active pipeline template (dynamic, not hardcoded)
  const { data: activeTemplate } = useActiveTemplate();
  const { data: pipelinePhases = [] } = usePhases(activeTemplate?.id);

  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(
    null,
  );
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);
  const [sendInviteDialogOpen, setSendInviteDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch current user's recruiter_slug
  const { data: recruiterSlug } = useQuery({
    queryKey: ["recruiter-slug", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_profiles")
        .select("recruiter_slug")
        .eq("id", user.id)
        .single();
      return data?.recruiter_slug || null;
    },
    enabled: !!user?.id,
  });

  const handleCopyLink = async () => {
    if (!recruiterSlug) return;
    const url = `https://www.thestandardhq.com/join-${recruiterSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Filter out the current user (upline) from the recruits list
  const recruits = (
    (recruitsData?.data || []) as RecruitWithRelations[]
  ).filter((recruit) => recruit.id !== user?.id);

  // Calculate stats from recruits data directly
  // Active phases come from the pipeline_phases table, normalized to status keys
  const activePhaseStatuses = pipelinePhases.map((phase) =>
    normalizePhaseNameToStatus(phase.phase_name),
  );
  const stats = {
    total: recruits.length,
    active: recruits.filter((r) =>
      r.onboarding_status && activePhaseStatuses.length > 0
        ? activePhaseStatuses.includes(r.onboarding_status)
        : r.onboarding_status !== "completed" &&
          r.onboarding_status !== "dropped",
    ).length,
    completed: recruits.filter((r) => r.onboarding_status === "completed")
      .length,
    dropped: recruits.filter((r) => r.onboarding_status === "dropped").length,
  };

  const handleSelectRecruit = (recruit: UserProfile) => {
    setSelectedRecruit(recruit);
    setDetailSheetOpen(true);
  };

  const handleExportCSV = () => {
    const exportData = recruits.map((r) => ({
      Name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : "",
      Email: r.email,
      Phone: r.phone || "",
      Status: r.onboarding_status || "",
      Recruiter:
        r.recruiter?.first_name && r.recruiter?.last_name
          ? `${r.recruiter.first_name} ${r.recruiter.last_name}`
          : r.recruiter?.email || "",
      Upline:
        r.upline?.first_name && r.upline?.last_name
          ? `${r.upline.first_name} ${r.upline.last_name}`
          : r.upline?.email || "",
      Created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
    }));

    downloadCSV(exportData, "recruits");
    toast.success(`Exported ${recruits.length} recruits to CSV`);
  };

  const handleBulkEmail = () => {
    toast.success("Bulk email feature coming soon!");
  };

  const _handleCloseSheet = () => {
    setDetailSheetOpen(false);
  };

  const handleRecruitDeleted = () => {
    setSelectedRecruit(null);
    setDetailSheetOpen(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Preview Warning Banner - shown to non-admin users */}
      {showPreviewBanner && <RecruitingPreviewBanner />}

      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recruiting Pipeline
            </h1>
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.total}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">total</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.active}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">active</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {stats.completed}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">complete</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <span className="font-medium text-red-600 dark:text-red-400">
                {stats.dropped}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">dropped</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Link to="/recruiting/leads">
              <Inbox className="h-3 w-3 mr-1" />
              Leads
              {pendingLeadsCount && pendingLeadsCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1 text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                >
                  {pendingLeadsCount}
                </Badge>
              ) : null}
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBulkEmail}
            className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportCSV}
            className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSendInviteDialogOpen(true)}
            className="h-6 text-[10px] px-2"
          >
            <Mail className="h-3 w-3 mr-1" />
            Send Invite
          </Button>
          <Button
            size="sm"
            onClick={() => setAddRecruitDialogOpen(true)}
            className="h-6 text-[10px] px-2"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Add Recruit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-6 w-6 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Link to="/recruiting/admin/pipelines">
              <Settings2 className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Recruiting Link Banner */}
      {recruiterSlug ? (
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Your link:
            </span>
            <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-200">
              www.thestandardhq.com/join-{recruiterSlug}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyLink}
            className="h-6 text-[10px] px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
          >
            {linkCopied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] text-amber-700 dark:text-amber-300">
              Set up your personal recruiting link to share on social media
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-6 text-[10px] px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            <Link to="/settings">
              Set Up Link
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {/* Main Content - Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <RecruitListTable
          recruits={recruits}
          isLoading={recruitsLoading}
          selectedRecruitId={selectedRecruit?.id}
          onSelectRecruit={handleSelectRecruit}
        />
      </div>

      {/* Detail Panel as Sheet (slide-out) */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent
          side="right"
          className="w-[500px] sm:max-w-[500px] p-0 overflow-hidden"
        >
          <SheetTitle className="sr-only">Recruit Details</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage recruit information, pipeline progress, and
            documents
          </SheetDescription>
          {selectedRecruit && (
            <RecruitDetailPanel
              recruit={selectedRecruit}
              currentUserId={user?.id}
              isUpline={true}
              onRecruitDeleted={handleRecruitDeleted}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Recruit Dialog */}
      <AddRecruitDialog
        open={addRecruitDialogOpen}
        onOpenChange={setAddRecruitDialogOpen}
        onSuccess={(recruitId) => {
          const newRecruit = recruits.find((r) => r.id === recruitId);
          if (newRecruit) {
            setSelectedRecruit(newRecruit);
            setDetailSheetOpen(true);
          }
        }}
      />

      {/* Send Invite Dialog */}
      <SendInviteDialog
        open={sendInviteDialogOpen}
        onOpenChange={setSendInviteDialogOpen}
      />
    </div>
  );
}

export function RecruitingDashboard() {
  return (
    <RecruitingErrorBoundary>
      <RecruitingDashboardContent />
    </RecruitingErrorBoundary>
  );
}
