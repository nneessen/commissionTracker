// src/features/recruiting/components/RecruitListTable.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useState, useMemo } from "react";
import { UserProfile } from "@/types/hierarchy.types";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  useActiveTemplate,
  usePhases,
} from "@/features/recruiting/hooks/usePipeline";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { TERMINAL_STATUS_COLORS } from "@/types/recruiting.types";
import { buildStatusOptions } from "@/lib/pipeline";

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
  pipeline_template?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  pipeline_template_id?: string | null;
};

interface RecruitListTableProps {
  recruits: UserProfile[];
  isLoading?: boolean;
  selectedRecruitId?: string;
  onSelectRecruit: (recruit: UserProfile) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function RecruitListTable({
  recruits,
  isLoading,
  selectedRecruitId,
  onSelectRecruit,
}: RecruitListTableProps) {
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [recruiterFilter, setRecruiterFilter] = useState<string>("all");

  // Pagination states - default to 10
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch phases from active pipeline template (dynamic, not hardcoded)
  const { data: activeTemplate } = useActiveTemplate();
  const { data: phases = [] } = usePhases(activeTemplate?.id);

  // Build dynamic status options from pipeline phases
  const statusOptions = useMemo(() => buildStatusOptions(phases), [phases]);

  // Extract unique recruiters for filter dropdown
  const recruiters = useMemo(() => {
    const recruiterMap = new Map<string, { id: string; name: string }>();
    recruits.forEach((r) => {
      const recruit = r as RecruitWithRelations;
      if (recruit.recruiter?.id) {
        const name =
          recruit.recruiter.first_name && recruit.recruiter.last_name
            ? `${recruit.recruiter.first_name} ${recruit.recruiter.last_name}`
            : recruit.recruiter.email.split("@")[0];
        recruiterMap.set(recruit.recruiter.id, {
          id: recruit.recruiter.id,
          name,
        });
      }
    });
    return Array.from(recruiterMap.values());
  }, [recruits]);

  // Apply filters
  const filteredRecruits = useMemo(() => {
    return recruits.filter((r) => {
      const recruit = r as RecruitWithRelations;
      if (statusFilter !== "all" && recruit.onboarding_status !== statusFilter)
        return false;
      if (
        phaseFilter !== "all" &&
        recruit.current_onboarding_phase !== phaseFilter
      )
        return false;
      if (
        recruiterFilter !== "all" &&
        recruit.recruiter?.id !== recruiterFilter
      )
        return false;
      return true;
    });
  }, [recruits, statusFilter, phaseFilter, recruiterFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecruits.length / pageSize);
  const paginatedRecruits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecruits.slice(start, start + pageSize);
  }, [filteredRecruits, currentPage, pageSize]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, phaseFilter, recruiterFilter, pageSize]);

  if (isLoading) {
    return (
      <div className="space-y-1 p-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 w-full bg-zinc-200 dark:bg-zinc-700"
          />
        ))}
      </div>
    );
  }

  const getStatusColor = (recruit: UserProfile) => {
    const status = recruit.onboarding_status;
    const updatedAt = new Date(
      recruit.updated_at || recruit.created_at || new Date().toISOString(),
    );
    const daysSinceUpdate = Math.floor(
      (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (status === "dropped") return "bg-red-500";
    if (status === "completed") return "bg-emerald-500";
    if (daysSinceUpdate > 14) return "bg-red-500";
    if (daysSinceUpdate > 7) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Filter Row */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-6 w-[110px] text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">
              All Status
            </SelectItem>
            {statusOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value} className="text-[11px]">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="h-6 w-[110px] text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">
              All Phases
            </SelectItem>
            {phases && phases.length > 0
              ? phases
                  .sort(
                    (a: { phase_order: number }, b: { phase_order: number }) =>
                      a.phase_order - b.phase_order,
                  )
                  .map((phase: { id: string; phase_name: string }) => (
                    <SelectItem
                      key={phase.id}
                      value={phase.phase_name}
                      className="text-[11px]"
                    >
                      {phase.phase_name}
                    </SelectItem>
                  ))
              : Array.from(
                  new Set(
                    recruits
                      .map((r) => r.current_onboarding_phase)
                      .filter(Boolean),
                  ),
                ).map((phase) => (
                  <SelectItem
                    key={phase}
                    value={phase!}
                    className="text-[11px]"
                  >
                    {phase}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>

        <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
          <SelectTrigger className="h-6 w-[120px] text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <SelectValue placeholder="Recruiter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">
              All Recruiters
            </SelectItem>
            {recruiters.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-[11px]">
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {filteredRecruits.length} recruits
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
            <TableRow className="h-8 border-b border-zinc-200 dark:border-zinc-800">
              <TableHead className="w-8 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400"></TableHead>
              <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                Name
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                Email
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                Phase
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                Recruiter
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-14 text-center">
                Days
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-20">
                Updated
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecruits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {filteredRecruits.length === 0 && recruits.length > 0
                        ? "No recruits match filters"
                        : "No recruits yet. Click 'Add Recruit' to start."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRecruits.map((recruit) => {
                const recruitWithRelations = recruit as RecruitWithRelations;
                const createdDate = new Date(
                  recruit.created_at || new Date().toISOString(),
                );
                const updatedDate = new Date(
                  recruit.updated_at ||
                    recruit.created_at ||
                    new Date().toISOString(),
                );
                const daysInPipeline = Math.floor(
                  (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
                );

                return (
                  <TableRow
                    key={recruit.id}
                    className={`h-9 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800/50 ${
                      selectedRecruitId === recruit.id
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                    onClick={() => onSelectRecruit(recruit)}
                  >
                    <TableCell className="text-center py-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${getStatusColor(recruit)} mx-auto`}
                      />
                    </TableCell>
                    <TableCell className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 py-1.5">
                      {recruit.first_name && recruit.last_name
                        ? `${recruit.first_name} ${recruit.last_name}`
                        : recruit.email?.split("@")[0] || "Unknown"}
                    </TableCell>
                    <TableCell className="text-[11px] text-zinc-500 dark:text-zinc-400 py-1.5 truncate max-w-[180px]">
                      {recruit.email || "—"}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 py-0 h-4 ${
                          recruit.onboarding_status
                            ? TERMINAL_STATUS_COLORS[
                                recruit.onboarding_status
                              ] || "bg-blue-100 text-blue-800"
                            : ""
                        }`}
                      >
                        {recruit.onboarding_status?.replace(/_/g, " ") || "New"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-zinc-600 dark:text-zinc-400 py-1.5">
                      {recruit.current_onboarding_phase || "—"}
                    </TableCell>
                    <TableCell className="text-[11px] text-zinc-500 dark:text-zinc-400 py-1.5">
                      {recruitWithRelations.recruiter?.first_name
                        ? `${recruitWithRelations.recruiter.first_name[0]}. ${recruitWithRelations.recruiter.last_name || ""}`
                        : recruitWithRelations.recruiter?.email?.split(
                            "@",
                          )[0] || "—"}
                    </TableCell>
                    <TableCell className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-1.5">
                      {daysInPipeline}
                    </TableCell>
                    <TableCell className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5">
                      {formatDistanceToNow(updatedDate, { addSuffix: false })
                        .replace("about ", "")
                        .replace(" days", "d")
                        .replace(" day", "d")
                        .replace(" hours", "h")
                        .replace(" hour", "h")
                        .replace(" minutes", "m")
                        .replace(" minute", "m")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Compact Pagination Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Show:
          </span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => setPageSize(parseInt(val))}
          >
            <SelectTrigger className="h-5 w-[50px] text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
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

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-5 w-5 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 px-2">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-5 w-5 p-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {paginatedRecruits.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
          {Math.min(currentPage * pageSize, filteredRecruits.length)} of{" "}
          {filteredRecruits.length}
        </span>
      </div>
    </div>
  );
}
