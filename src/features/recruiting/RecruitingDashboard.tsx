// src/features/recruiting/RecruitingDashboard.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { UserPlus, Mail, Download, Settings2, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useRecruits } from "./hooks/useRecruits";
import { RecruitListTable } from "./components/RecruitListTable";
import { RecruitDetailPanel } from "./components/RecruitDetailPanel";
import { AddRecruitDialog } from "./components/AddRecruitDialog";
import { RecruitingErrorBoundary } from "./components/RecruitingErrorBoundary";
import type { UserProfile } from "@/types/hierarchy.types";
import { useAuth } from "@/contexts/AuthContext";
import { showToast } from "@/utils/toast";
import { Link } from "@tanstack/react-router";
import { downloadCSV } from "@/utils/exportHelpers";

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
  const { user } = useAuth();
  const { data: recruitsData, isLoading: recruitsLoading } = useRecruits();

  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(null);
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Filter out the current user (upline) from the recruits list
  const recruits = (
    (recruitsData?.data || []) as RecruitWithRelations[]
  ).filter((recruit) => recruit.id !== user?.id);

  // Calculate stats from recruits data directly
  const activePhases = [
    "interview_1",
    "zoom_interview",
    "pre_licensing",
    "exam",
    "npn_received",
    "contracting",
    "bootcamp",
  ];
  const stats = {
    total: recruits.length,
    active: recruits.filter(
      (r) => r.onboarding_status && activePhases.includes(r.onboarding_status),
    ).length,
    completed: recruits.filter((r) => r.onboarding_status === "completed").length,
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
    showToast.success(`Exported ${recruits.length} recruits to CSV`);
  };

  const handleBulkEmail = () => {
    showToast.success("Bulk email feature coming soon!");
  };

  const handleCloseSheet = () => {
    setDetailSheetOpen(false);
  };

  const handleRecruitDeleted = () => {
    setSelectedRecruit(null);
    setDetailSheetOpen(false);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Page Header - Clean professional style matching other pages */}
      <div className="page-header py-3">
        <div className="flex items-center justify-between">
          {/* Left: Title and Description */}
          <div>
            <h1 className="text-lg font-semibold text-foreground">Recruiting Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and track your recruiting pipeline
            </p>
          </div>

          {/* Center: Stats Badges - Clean inline display */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/50">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">{stats.total}</span>
              <span className="text-sm text-slate-500">Total</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">{stats.active}</span>
              <span className="text-sm text-blue-400/70">Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">{stats.completed}</span>
              <span className="text-sm text-emerald-400/70">Complete</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">{stats.dropped}</span>
              <span className="text-sm text-red-400/70">Dropped</span>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleBulkEmail}>
              <Mail className="h-4 w-4 mr-1.5" />
              Email
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setAddRecruitDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Recruit
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/recruiting/admin/pipelines">
                <Settings2 className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Full width table */}
      <div className="flex-1 p-3 overflow-hidden">
        <div className="h-full bg-card rounded-lg shadow-sm overflow-hidden flex flex-col">
          <RecruitListTable
            recruits={recruits}
            isLoading={recruitsLoading}
            selectedRecruitId={selectedRecruit?.id}
            onSelectRecruit={handleSelectRecruit}
          />
        </div>
      </div>

      {/* Detail Panel as Sheet (slide-out) */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="right" className="w-[500px] sm:max-w-[500px] p-0 overflow-hidden">
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
