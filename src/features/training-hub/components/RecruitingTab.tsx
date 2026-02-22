// src/features/training-hub/components/RecruitingTab.tsx
// Full pipeline management for trainers and contracting admins
// Uses same RecruitDetailPanel as RecruitingDashboard for consistency

import { useState, useMemo } from "react";
import { UserPlus, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useAllUsers } from "@/hooks/admin";
import { useAuth } from "@/contexts/AuthContext";
import { usePhases } from "@/features/recruiting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecruitDetailPanel, AddRecruitDialog } from "@/features/recruiting";
import type { RoleName } from "@/types/permissions.types";
import type { UserProfile } from "@/types/user.types";
import { hasStaffRole } from "@/constants/roles";
import { downloadCSV } from "@/utils/exportHelpers";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { TERMINAL_STATUS_COLORS } from "@/types/recruiting.types";

interface RecruitingTabProps {
  searchQuery: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function RecruitingTab({ searchQuery }: RecruitingTabProps) {
  const [selectedRecruit, setSelectedRecruit] = useState<UserProfile | null>(
    null,
  );
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [addRecruitDialogOpen, setAddRecruitDialogOpen] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { user: currentUser } = useAuth();
  const { data: allUsers, isLoading: usersLoading } = useAllUsers();
  const { data: phases } = usePhases(undefined);

  // Pure recruits: have recruit role, no agent/admin/staff roles
  // Training Hub sees ALL recruits (no hierarchy filtering)
  const allRecruits = useMemo(() => {
    return (
      allUsers?.filter((u: UserProfile) => {
        // Must have recruit role
        if (!u.roles?.includes("recruit" as RoleName)) return false;
        // Exclude agents
        if (
          u.roles?.includes("agent" as RoleName) ||
          u.roles?.includes("active_agent" as RoleName)
        )
          return false;
        // Exclude admins
        if (u.is_admin === true) return false;
        // Exclude staff (trainer, contracting_manager, etc.)
        if (hasStaffRole(u.roles)) return false;
        return true;
      }) || []
    );
  }, [allUsers]);

  // Apply filters
  const filteredRecruits = useMemo(() => {
    return allRecruits.filter((recruit: UserProfile) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName =
          `${recruit.first_name || ""} ${recruit.last_name || ""}`.toLowerCase();
        if (
          !fullName.includes(query) &&
          !recruit.email?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        const status = recruit.onboarding_status || "not_started";
        if (statusFilter === "active") {
          if (status === "completed" || status === "dropped") return false;
        } else if (status !== statusFilter) {
          return false;
        }
      }

      // Phase filter
      if (phaseFilter !== "all") {
        const phase = recruit.current_onboarding_phase || "not_started";
        if (phase !== phaseFilter) return false;
      }

      return true;
    });
  }, [allRecruits, searchQuery, statusFilter, phaseFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecruits.length / pageSize);
  const paginatedRecruits = filteredRecruits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Stats
  const stats = {
    total: allRecruits.length,
    active: allRecruits.filter(
      (r) =>
        r.onboarding_status &&
        !["completed", "dropped"].includes(r.onboarding_status),
    ).length,
    completed: allRecruits.filter((r) => r.onboarding_status === "completed")
      .length,
    dropped: allRecruits.filter((r) => r.onboarding_status === "dropped")
      .length,
  };

  const handleSelectRecruit = (recruit: UserProfile) => {
    setSelectedRecruit(recruit);
    setDetailSheetOpen(true);
  };

  const handleRecruitDeleted = () => {
    setSelectedRecruit(null);
    setDetailSheetOpen(false);
  };

  const handleExportCSV = () => {
    const exportData = filteredRecruits.map((r) => ({
      Name: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : "",
      Email: r.email || "",
      Phone: r.phone || "",
      Status: r.onboarding_status || "",
      Phase: r.current_onboarding_phase || "",
      "Resident State": r.resident_state || "",
      Created: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
    }));

    downloadCSV(exportData, "recruits");
    toast.success(`Exported ${filteredRecruits.length} recruits to CSV`);
  };

  const getPhaseColor = (status: string | null | undefined): string => {
    if (!status)
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    // Use terminal status colors for completed/dropped, else default to blue for pipeline phases
    const colorClass =
      TERMINAL_STATUS_COLORS[status] || "bg-blue-100 text-blue-800";
    return (
      colorClass ||
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats and actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4 text-[11px]">
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

        <div className="flex items-center gap-1.5">
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
            onClick={() => setAddRecruitDialogOpen(true)}
            className="h-6 text-[10px] px-2"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Add Recruit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-6 w-24 text-[10px] border-zinc-200 dark:border-zinc-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">
              All Status
            </SelectItem>
            <SelectItem value="active" className="text-[11px]">
              Active
            </SelectItem>
            <SelectItem value="completed" className="text-[11px]">
              Completed
            </SelectItem>
            <SelectItem value="dropped" className="text-[11px]">
              Dropped
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="h-6 w-28 text-[10px] border-zinc-200 dark:border-zinc-700">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">
              All Phases
            </SelectItem>
            {phases?.map((phase) => (
              <SelectItem
                key={phase.id}
                value={phase.phase_name}
                className="text-[11px]"
              >
                {phase.phase_name.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {filteredRecruits.length} results
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {usersLoading ? (
          <div className="p-3 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="h-7 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[200px]">
                  Recruit
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[140px]">
                  Upline
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px]">
                  State
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                  Phase
                </TableHead>
                <TableHead className="h-7 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 w-[90px]">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecruits.map((recruit: UserProfile) => {
                const recruitName =
                  recruit.first_name && recruit.last_name
                    ? `${recruit.first_name} ${recruit.last_name}`
                    : recruit.email || "Unknown";

                const uplineName = recruit.upline
                  ? recruit.upline.first_name && recruit.upline.last_name
                    ? `${recruit.upline.first_name} ${recruit.upline.last_name}`
                    : recruit.upline.email
                  : null;

                const currentPhase =
                  recruit.current_onboarding_phase ||
                  recruit.onboarding_status ||
                  "Not Started";

                const isSelected = selectedRecruit?.id === recruit.id;

                return (
                  <TableRow
                    key={recruit.id}
                    onClick={() => handleSelectRecruit(recruit)}
                    className={`h-9 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                          {recruitName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100 truncate">
                            {recruitName}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {recruit.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {uplineName ? (
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                          {uplineName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        {recruit.resident_state || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 px-1.5 ${getPhaseColor(currentPhase)}`}
                      >
                        {currentPhase.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {recruit.updated_at
                          ? formatDistanceToNow(new Date(recruit.updated_at), {
                              addSuffix: true,
                            })
                          : "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedRecruits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-8"
                  >
                    {searchQuery
                      ? "No recruits match your search"
                      : "No recruits in pipeline"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Rows:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-6 w-14 text-[10px] border-zinc-200 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem
                    key={size}
                    value={size.toString()}
                    className="text-[11px]"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 border-zinc-200 dark:border-zinc-700"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 border-zinc-200 dark:border-zinc-700"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Panel as Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent
          side="right"
          className="w-[500px] sm:max-w-[500px] p-0 overflow-hidden"
        >
          <SheetTitle className="sr-only">Recruit Details</SheetTitle>
          <SheetDescription className="sr-only">
            View and manage recruit pipeline progress, documents, and
            communications
          </SheetDescription>
          {selectedRecruit && (
            <RecruitDetailPanel
              key={selectedRecruit.id}
              recruit={selectedRecruit}
              currentUserId={currentUser?.id}
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
          // Find the newly created recruit and select it
          const newRecruit = allRecruits.find((r) => r.id === recruitId);
          if (newRecruit) {
            setSelectedRecruit(newRecruit);
            setDetailSheetOpen(true);
          }
        }}
      />
    </div>
  );
}

export default RecruitingTab;
